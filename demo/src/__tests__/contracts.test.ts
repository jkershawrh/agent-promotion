// CDD: contract tests for all TypeScript interfaces.
// Every interface must instantiate with valid data, type guards must work,
// and mock data must conform to shapes.

import { describe, it, expect } from 'vitest'
import type {
  AgentAuthority,
  AuthorityDecision,
  ChainLink,
  DemotionEvent,
  EvaluateResponse,
  GateRequest,
  PromotionEvent,
  RatificationRequest,
  RosterEntry,
  TrackRecord,
} from '../types/ApiTypes'
import { isPromotionEvent, isDemotionEvent } from '../types/ApiTypes'
import { LAYERS, INITIAL_SCENE_STATE } from '../types/SceneState'
import type { SceneState } from '../types/SceneState'

describe('CDD: ApiTypes', () => {
  it('AgentAuthority instantiates with valid data', () => {
    const auth: AgentAuthority = {
      agent_id: 'ops-agent',
      tier: 'T0',
      consequence_ceiling: 0.0,
      mode: 'FULL_AUTO',
      updated_at: '2026-07-09T00:00:00Z',
    }
    expect(auth.agent_id).toBe('ops-agent')
    expect(auth.tier).toBe('T0')
    expect(auth.consequence_ceiling).toBe(0.0)
  })

  it('ChainLink instantiates with all result types', () => {
    const results: Array<ChainLink['result']> = ['success', 'failure', 'pending']
    for (const result of results) {
      const link: ChainLink = {
        correlation_id: `chain-${result}`,
        result,
        consequence_score: null,
        timestamp: null,
      }
      expect(link.result).toBe(result)
    }
  })

  it('TrackRecord instantiates with chains', () => {
    const record: TrackRecord = {
      agent_id: 'ops-agent',
      window: 500,
      chain_count: 10,
      success_count: 8,
      failure_count: 2,
      pending_count: 0,
      rolling_accuracy: 0.8,
      chains: [],
    }
    expect(record.rolling_accuracy).toBe(0.8)
  })

  it('PromotionEvent instantiates', () => {
    const event: PromotionEvent = {
      id: 'uuid-1',
      agent_id: 'ops-agent',
      from_tier: 'T0',
      to_tier: 'T1',
      reason: 'Met promotion criteria',
      evidence_correlation_ids: ['c1', 'c2'],
      ratified_by: null,
      timestamp: '2026-07-09T00:00:00Z',
    }
    expect(event.to_tier).toBe('T1')
  })

  it('DemotionEvent instantiates', () => {
    const event: DemotionEvent = {
      id: 'uuid-2',
      agent_id: 'ops-agent',
      from_tier: 'T3',
      to_tier: 'T2',
      trigger: 'falsified_action',
      falsified_correlation_id: 'chain-xyz',
      timestamp: '2026-07-09T00:00:00Z',
    }
    expect(event.trigger).toBe('falsified_action')
  })

  it('AuthorityDecision instantiates with all verdicts', () => {
    const verdicts: Array<AuthorityDecision['verdict']> = ['allow', 'refuse', 'route_human']
    for (const verdict of verdicts) {
      const decision: AuthorityDecision = {
        action_id: 'act-1',
        agent_id: 'ops-agent',
        requested_consequence: 30,
        ceiling: 25,
        verdict,
        reason: 'test',
      }
      expect(decision.verdict).toBe(verdict)
    }
  })

  it('RatificationRequest instantiates', () => {
    const req: RatificationRequest = {
      id: 'uuid-3',
      agent_id: 'ops-agent',
      target_tier: 'T3',
      case: {
        agent_id: 'ops-agent',
        target_tier: 'T3',
        chain_count: 500,
        rolling_accuracy: 0.88,
        notable_successes: ['c1'],
        near_misses: ['c2'],
        evidence_correlation_ids: ['c1', 'c2'],
      },
      status: 'pending',
      created_at: '2026-07-09T00:00:00Z',
      decided_at: null,
      decided_by: null,
    }
    expect(req.status).toBe('pending')
  })

  it('RosterEntry instantiates', () => {
    const entry: RosterEntry = {
      agent_id: 'ops-agent',
      tier: 'T1',
      tier_name: 'VERIFIED',
      consequence_ceiling: 25,
      mode: 'FULL_AUTO',
      rolling_accuracy: 0.72,
    }
    expect(entry.tier_name).toBe('VERIFIED')
  })

  it('EvaluateResponse covers all status types', () => {
    const statuses: Array<EvaluateResponse['status']> = [
      'promoted',
      'demoted',
      'ratification_queued',
      'no_change',
    ]
    for (const status of statuses) {
      const resp: EvaluateResponse = { status }
      expect(resp.status).toBe(status)
    }
  })

  it('GateRequest instantiates', () => {
    const req: GateRequest = {
      agent_id: 'ops-agent',
      action_id: 'scale-frontend',
      consequence_score: 30,
    }
    expect(req.consequence_score).toBe(30)
  })
})

describe('CDD: Type Guards', () => {
  it('isPromotionEvent returns true for promotion events', () => {
    const event: PromotionEvent = {
      id: 'uuid-1',
      agent_id: 'ops-agent',
      from_tier: 'T0',
      to_tier: 'T1',
      reason: 'Met criteria',
      evidence_correlation_ids: [],
      ratified_by: null,
      timestamp: '2026-07-09T00:00:00Z',
    }
    expect(isPromotionEvent(event)).toBe(true)
  })

  it('isPromotionEvent returns false for non-events', () => {
    expect(isPromotionEvent(null)).toBe(false)
    expect(isPromotionEvent({})).toBe(false)
    expect(isPromotionEvent({ from_tier: 'T0' })).toBe(false)
  })

  it('isDemotionEvent returns true for demotion events', () => {
    const event: DemotionEvent = {
      id: 'uuid-2',
      agent_id: 'ops-agent',
      from_tier: 'T3',
      to_tier: 'T2',
      trigger: 'falsified_action',
      falsified_correlation_id: null,
      timestamp: '2026-07-09T00:00:00Z',
    }
    expect(isDemotionEvent(event)).toBe(true)
  })

  it('isDemotionEvent returns false for non-events', () => {
    expect(isDemotionEvent(null)).toBe(false)
    expect(isDemotionEvent({ from_tier: 'T0', to_tier: 'T1' })).toBe(false)
  })
})

describe('CDD: SceneState', () => {
  it('LAYERS has exactly 5 layers', () => {
    expect(LAYERS).toHaveLength(5)
  })

  it('LAYERS covers hook through close', () => {
    const ids = LAYERS.map((l) => l.id)
    expect(ids).toEqual(['hook', 'earn', 'depth', 'floor', 'close'])
  })

  it('every layer has required fields', () => {
    for (const layer of LAYERS) {
      expect(layer.id).toBeTruthy()
      expect(layer.title).toBeTruthy()
      expect(layer.subtitle).toBeTruthy()
      expect(layer.turn).toBeTruthy()
      expect(layer.keyboardShortcut).toBeTruthy()
      expect(typeof layer.index).toBe('number')
    }
  })

  it('keyboard shortcuts are 0-4', () => {
    const shortcuts = LAYERS.map((l) => l.keyboardShortcut)
    expect(shortcuts).toEqual(['0', '1', '2', '3', '4'])
  })

  it('INITIAL_SCENE_STATE is valid', () => {
    const state: SceneState = INITIAL_SCENE_STATE
    expect(state.currentLayer).toBe('hook')
    expect(state.phase).toBe('idle')
    expect(state.agentId).toBe('ops-agent')
    expect(state.authority).toBeNull()
    expect(state.roster).toEqual([])
  })

  it('humor beats are present on layers 0-3, empty on close', () => {
    for (const layer of LAYERS) {
      if (layer.id === 'close') {
        expect(layer.humorBeat).toBe('')
      } else {
        expect(layer.humorBeat.length).toBeGreaterThan(0)
      }
    }
  })
})

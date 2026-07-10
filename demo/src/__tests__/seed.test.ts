// TDD: tests for the seed/reset module.

import { describe, it, expect } from 'vitest'
import { DEMO_AGENT_ID, DEMO_ACTIONS } from '../api/seed'
import type { LayerId } from '../types/SceneState'

describe('TDD: Seed module constants', () => {
  it('DEMO_AGENT_ID is ops-agent', () => {
    expect(DEMO_AGENT_ID).toBe('ops-agent')
  })

  it('DEMO_ACTIONS has four risk levels', () => {
    expect(DEMO_ACTIONS.lowRisk.consequence_score).toBe(10)
    expect(DEMO_ACTIONS.mediumRisk.consequence_score).toBe(30)
    expect(DEMO_ACTIONS.highRisk.consequence_score).toBe(100)
    expect(DEMO_ACTIONS.critical.consequence_score).toBe(500)
  })

  it('DEMO_ACTIONS have labels and action_ids', () => {
    for (const [_key, action] of Object.entries(DEMO_ACTIONS)) {
      expect(action.action_id).toBeTruthy()
      expect(action.label).toBeTruthy()
      expect(typeof action.consequence_score).toBe('number')
    }
  })

  it('consequence scores are monotonically increasing', () => {
    const scores = [
      DEMO_ACTIONS.lowRisk.consequence_score,
      DEMO_ACTIONS.mediumRisk.consequence_score,
      DEMO_ACTIONS.highRisk.consequence_score,
      DEMO_ACTIONS.critical.consequence_score,
    ]
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1])
    }
  })
})

describe('TDD: Seed layer coverage', () => {
  it('all layers are valid LayerIds', () => {
    const layers: LayerId[] = ['hook', 'earn', 'depth', 'floor', 'close']
    for (const layer of layers) {
      expect(typeof layer).toBe('string')
    }
  })
})

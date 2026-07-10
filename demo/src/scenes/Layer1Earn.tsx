import { useState, useCallback } from 'react'
import TierPipeline from '../components/TierPipeline'
import TrackRecord from '../components/TrackRecord'
import GateDecision from '../components/GateDecision'
import PromotionEventCard from '../components/PromotionEvent'
import NarrativeCard from '../components/NarrativeCard'
import { LAYERS } from '../types/SceneState'
import { DEMO_ACTIONS } from '../api/seed'
import * as api from '../api/client'
import type { AuthorityDecision, AuthorityTier, PromotionEvent, ChainLink } from '../types/ApiTypes'
import { isPromotionEvent } from '../types/ApiTypes'

const layer = LAYERS[1]

function mockChains(count: number): ChainLink[] {
  return Array.from({ length: count }, (_, i) => ({
    correlation_id: `chain-${i}`,
    result: 'success' as const,
    consequence_score: 10,
    timestamp: new Date().toISOString(),
  }))
}

export default function Layer1Earn() {
  const [tier, setTier] = useState<AuthorityTier>('T0')
  const [promotion, setPromotion] = useState<PromotionEvent | null>(null)
  const [gateDecision, setGateDecision] = useState<AuthorityDecision | null>(null)
  const [chainCount, setChainCount] = useState(0)
  const [phase, setPhase] = useState<'filling' | 'evaluating' | 'promoted' | 'gating'>('filling')

  const fillRecord = useCallback(() => {
    setChainCount(55)
    setPhase('evaluating')
  }, [])

  const evaluate = useCallback(async () => {
    try {
      const result = await api.evaluateAuthority('ops-agent')
      if (result.status === 'promoted' && result.event && isPromotionEvent(result.event)) {
        setPromotion(result.event)
        setTier(result.event.to_tier)
        setPhase('promoted')
      }
    } catch {
      setPhase('filling')
    }
  }, [])

  const testGate = useCallback(async () => {
    try {
      const result = await api.checkGate({
        agent_id: 'ops-agent',
        action_id: DEMO_ACTIONS.lowRisk.action_id,
        consequence_score: DEMO_ACTIONS.lowRisk.consequence_score,
      })
      setGateDecision(result)
      setPhase('gating')
    } catch {
      // noop
    }
  }, [])

  return (
    <div className="space-y-6">
      <TierPipeline currentTier={tier} animatingTo={phase === 'evaluating' ? 'T1' : null} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <TrackRecord
            chainCount={chainCount}
            successCount={chainCount}
            failureCount={0}
            pendingCount={0}
            rollingAccuracy={chainCount > 0 ? 1.0 : 0}
            chains={mockChains(chainCount)}
            targetChains={50}
          />

          {phase === 'filling' && (
            <button
              onClick={fillRecord}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
            >
              Build track record (55 verified chains)
            </button>
          )}

          {phase === 'evaluating' && (
            <button
              onClick={evaluate}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors"
            >
              Evaluate for promotion
            </button>
          )}

          {phase === 'promoted' && (
            <button
              onClick={testGate}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
            >
              Test a low-risk action at T1
            </button>
          )}
        </div>

        <div className="space-y-4">
          <PromotionEventCard event={promotion} />
          <GateDecision decision={gateDecision} actionLabel={DEMO_ACTIONS.lowRisk.label} />
          {(phase === 'promoted' || phase === 'gating') && (
            <NarrativeCard humorBeat={layer.humorBeat} turn={layer.turn} showTurn={phase === 'gating'} />
          )}
        </div>
      </div>
    </div>
  )
}

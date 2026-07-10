import { useState, useCallback } from 'react'
import TierPipeline from '../components/TierPipeline'
import DemotionEventCard from '../components/DemotionEvent'
import LedgerTrail from '../components/LedgerTrail'
import NarrativeCard from '../components/NarrativeCard'
import { LAYERS } from '../types/SceneState'
import * as api from '../api/client'
import type { AuthorityTier, DemotionEvent } from '../types/ApiTypes'
import { isDemotionEvent } from '../types/ApiTypes'

const layer = LAYERS[3]

export default function Layer3Floor() {
  const [tier, setTier] = useState<AuthorityTier>('T3')
  const [demotion, setDemotion] = useState<DemotionEvent | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<
    Array<{ entry_type: string; agent_id: string; correlation_id: string }>
  >([])
  const [phase, setPhase] = useState<'ready' | 'falsified' | 'demoted'>('ready')

  const triggerDemotion = useCallback(async () => {
    setPhase('falsified')
    try {
      const result = await api.evaluateAuthority('ops-agent')
      if (result.status === 'demoted' && result.event && isDemotionEvent(result.event)) {
        setDemotion(result.event)
        setTier(result.event.to_tier)
        setLedgerEntries((prev) => [
          ...prev,
          {
            entry_type: 'authority.demotion',
            agent_id: 'ops-agent',
            correlation_id: result.event && isDemotionEvent(result.event)
              ? (result.event.falsified_correlation_id ?? result.event.id)
              : 'unknown',
          },
        ])
        setPhase('demoted')
      }
    } catch {
      setPhase('ready')
    }
  }, [])

  return (
    <div className="space-y-6">
      <TierPipeline currentTier={tier} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Scenario</div>
            <div className="text-sm text-slate-300">
              The agent at T3 took an action at its ceiling (consequence 100).
              The outcome was later verified and found to be{' '}
              <span className="text-red-400 font-bold">falsified</span>.
            </div>
          </div>

          {phase === 'ready' && (
            <button
              onClick={triggerDemotion}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
            >
              Falsified outcome arrives
            </button>
          )}

          {phase === 'falsified' && (
            <div className="text-center py-4 text-amber-400 text-sm animate-pulse">
              Verifying outcome against ledger...
            </div>
          )}

          <LedgerTrail entries={ledgerEntries} />
        </div>

        <div className="space-y-4">
          <DemotionEventCard event={demotion} />
          {phase === 'demoted' && (
            <NarrativeCard humorBeat={layer.humorBeat} turn={layer.turn} showTurn={true} />
          )}
        </div>
      </div>
    </div>
  )
}

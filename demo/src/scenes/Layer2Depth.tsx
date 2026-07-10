import { useState, useCallback } from 'react'
import TierPipeline from '../components/TierPipeline'
import RatificationPanel from '../components/RatificationPanel'
import PromotionEventCard from '../components/PromotionEvent'
import NarrativeCard from '../components/NarrativeCard'
import { LAYERS } from '../types/SceneState'
import * as api from '../api/client'
import type { AuthorityTier, PromotionEvent, RatificationRequest } from '../types/ApiTypes'
import { isPromotionEvent } from '../types/ApiTypes'

const layer = LAYERS[2]

export default function Layer2Depth() {
  const [tier, setTier] = useState<AuthorityTier>('T2')
  const [ratification, setRatification] = useState<RatificationRequest | null>(null)
  const [promotion, setPromotion] = useState<PromotionEvent | null>(null)
  const [phase, setPhase] = useState<'ready' | 'queued' | 'approved'>('ready')

  const triggerRatification = useCallback(async () => {
    try {
      const result = await api.evaluateAuthority('ops-agent')
      if (result.status === 'ratification_queued' && result.request) {
        setRatification(result.request)
        setPhase('queued')
      }
    } catch {
      // noop
    }
  }, [])

  const handleApprove = useCallback(async () => {
    if (!ratification) return
    try {
      const result = await api.decideRatification(ratification.id, {
        approved: true,
        decided_by: 'human-admin',
      })
      if (result.status === 'approved' && result.event && isPromotionEvent(result.event)) {
        setPromotion(result.event)
        setTier(result.event.to_tier)
        setPhase('approved')
      }
    } catch {
      // noop
    }
  }, [ratification])

  const handleReject = useCallback(async () => {
    if (!ratification) return
    try {
      await api.decideRatification(ratification.id, {
        approved: false,
        decided_by: 'human-admin',
      })
      setRatification(null)
      setPhase('ready')
    } catch {
      // noop
    }
  }, [ratification])

  return (
    <div className="space-y-6">
      <TierPipeline currentTier={tier} animatingTo={phase === 'queued' ? 'T3' : null} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Operating mode</div>
            <div className="text-sm font-bold text-amber-400">HITL_HIGH_TIER</div>
            <div className="text-xs text-slate-500 mt-2">
              Low-tier promotions apply automatically. High-tier promotions require a human to ratify.
            </div>
          </div>

          {phase === 'ready' && (
            <button
              onClick={triggerRatification}
              className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors"
            >
              Evaluate for T2 to T3 promotion
            </button>
          )}

          <RatificationPanel
            request={phase === 'queued' ? ratification : null}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>

        <div className="space-y-4">
          <PromotionEventCard event={promotion} />
          {phase === 'queued' && (
            <NarrativeCard humorBeat={layer.humorBeat} turn="" showTurn={false} />
          )}
          {phase === 'approved' && (
            <NarrativeCard humorBeat={layer.humorBeat} turn={layer.turn} showTurn={true} />
          )}
        </div>
      </div>
    </div>
  )
}

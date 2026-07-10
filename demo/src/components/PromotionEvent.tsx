import { motion } from 'framer-motion'
import type { PromotionEvent as PromotionEventType } from '../types/ApiTypes'
import { TIER_COLORS } from '../lib/animations'

interface PromotionEventProps {
  event: PromotionEventType | null
}

export default function PromotionEvent({ event }: PromotionEventProps) {
  if (!event) return null

  return (
    <motion.div
      className="bg-slate-800 rounded-lg p-4 border-2"
      style={{ borderColor: TIER_COLORS[event.to_tier] }}
      initial={{ scale: 0.8, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <motion.div
          className="text-3xl"
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          ↑
        </motion.div>
        <div>
          <div className="text-sm font-bold text-green-400">PROMOTED</div>
          <div className="text-xs text-slate-400">
            {event.from_tier} → {event.to_tier}
          </div>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-2">{event.reason}</div>
      {event.ratified_by && (
        <div className="text-xs text-amber-400 mt-1">Ratified by: {event.ratified_by}</div>
      )}
    </motion.div>
  )
}

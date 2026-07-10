import { motion } from 'framer-motion'
import type { DemotionEvent as DemotionEventType } from '../types/ApiTypes'

interface DemotionEventProps {
  event: DemotionEventType | null
}

export default function DemotionEvent({ event }: DemotionEventProps) {
  if (!event) return null

  return (
    <motion.div
      className="bg-slate-800 rounded-lg p-4 border-2 border-red-500"
      initial={{ scale: 1.1, opacity: 0, y: -30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <motion.div
          className="text-3xl text-red-400"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          ↓
        </motion.div>
        <div>
          <div className="text-sm font-bold text-red-400">DEMOTED</div>
          <div className="text-xs text-slate-400">
            {event.from_tier} → {event.to_tier}
          </div>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-2">
        Trigger: {event.trigger === 'falsified_action' ? 'Falsified action' : 'Maintenance breach'}
      </div>
      {event.falsified_correlation_id && (
        <div className="text-xs text-red-400 mt-1 font-mono">
          Failed chain: {event.falsified_correlation_id}
        </div>
      )}
    </motion.div>
  )
}

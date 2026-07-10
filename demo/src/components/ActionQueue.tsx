import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp } from '../lib/animations'

interface ActionItem {
  action_id: string
  label: string
  consequence_score: number
}

interface ActionQueueProps {
  actions: ActionItem[]
  currentIndex: number
}

function riskBadge(score: number): { label: string; color: string } {
  if (score <= 25) return { label: 'LOW', color: '#22c55e' }
  if (score <= 50) return { label: 'MEDIUM', color: '#f59e0b' }
  if (score <= 100) return { label: 'HIGH', color: '#ef4444' }
  return { label: 'CRITICAL', color: '#dc2626' }
}

export default function ActionQueue({ actions, currentIndex }: ActionQueueProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-bold text-slate-300 mb-3">Action Queue</h3>
      <AnimatePresence>
        {actions.map((action, i) => {
          const badge = riskBadge(action.consequence_score)
          const isPast = i < currentIndex
          const isCurrent = i === currentIndex

          return (
            <motion.div
              key={action.action_id}
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`flex items-center gap-3 p-2 rounded mb-1 text-sm ${
                isCurrent ? 'bg-slate-700 border border-slate-600' : isPast ? 'opacity-40' : ''
              }`}
            >
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
              >
                {badge.label}
              </span>
              <span className={`flex-1 ${isPast ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                {action.label}
              </span>
              <span className="font-mono text-xs text-slate-500">{action.consequence_score}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

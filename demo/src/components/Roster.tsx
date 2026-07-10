import { motion } from 'framer-motion'
import type { RosterEntry } from '../types/ApiTypes'
import { TIER_COLORS, fadeInUp, staggerContainer } from '../lib/animations'

interface RosterProps {
  entries: RosterEntry[]
}

export default function Roster({ entries }: RosterProps) {
  return (
    <motion.div
      className="bg-slate-800 rounded-lg p-4 border border-slate-700"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <h3 className="text-sm font-bold text-slate-300 mb-3">Agent Roster</h3>
      {entries.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-4">No agents registered</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <motion.div
              key={entry.agent_id}
              variants={fadeInUp}
              className="flex items-center gap-3 p-2 bg-slate-900 rounded"
            >
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: TIER_COLORS[entry.tier], color: '#fff' }}
              >
                {entry.tier}
              </span>
              <div className="flex-1">
                <div className="text-sm text-slate-300">{entry.agent_id}</div>
                <div className="text-xs text-slate-500">{entry.tier_name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 font-mono">ceiling: {entry.consequence_ceiling}</div>
                {entry.rolling_accuracy !== null && (
                  <div className="text-xs text-slate-500 font-mono">
                    accuracy: {(entry.rolling_accuracy * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

import { motion } from 'framer-motion'
import { fadeInUp } from '../lib/animations'

interface NarrativeCardProps {
  humorBeat: string
  turn: string
  showTurn: boolean
}

export default function NarrativeCard({ humorBeat, turn, showTurn }: NarrativeCardProps) {
  return (
    <motion.div
      className="bg-slate-900 rounded-lg p-5 border border-slate-700"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {humorBeat && (
        <motion.p
          className="text-slate-400 italic text-sm mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          "{humorBeat}"
        </motion.p>
      )}
      {showTurn && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          <div className="text-xs text-slate-600 uppercase tracking-wider mb-1">The turn</div>
          <p className="text-slate-300 text-sm leading-relaxed">{turn}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

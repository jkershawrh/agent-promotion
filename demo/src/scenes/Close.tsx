import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Roster from '../components/Roster'
import * as api from '../api/client'
import type { RosterEntry } from '../types/ApiTypes'
import { LAYERS } from '../types/SceneState'
import { fadeInUp } from '../lib/animations'

const layer = LAYERS[4]

export default function Close() {
  const [roster, setRoster] = useState<RosterEntry[]>([])

  useEffect(() => {
    api.getRoster().then(setRoster).catch(() => {})
  }, [])

  return (
    <div className="space-y-8">
      <Roster entries={roster} />

      <motion.div
        className="bg-slate-900 rounded-lg p-8 border border-slate-700 text-center"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <motion.p
          className="text-xl text-slate-200 leading-relaxed max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.0 }}
        >
          {layer.turn}
        </motion.p>
      </motion.div>

      <motion.div
        className="bg-slate-800 rounded-lg p-6 border border-slate-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
          The Red Hat story
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="text-slate-300">
              <span className="text-red-400 font-bold">OpenShift</span> is the platform.
            </div>
            <div className="text-slate-300">
              The <span className="text-blue-400 font-bold">ARE Ledger</span> provides the audit trail.
            </div>
            <div className="text-slate-300">
              Every line is <span className="text-green-400 font-bold">Apache 2.0</span>.
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-slate-300">
              Governance runs on <span className="text-amber-400 font-bold">CPU</span>. No GPU required.
            </div>
            <div className="text-slate-300">
              <span className="text-purple-400 font-bold">EU AI Act</span>, SOC 2, NIST ready.
            </div>
            <div className="text-slate-400 italic text-xs mt-3">
              Governed AI on the platform you already run.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

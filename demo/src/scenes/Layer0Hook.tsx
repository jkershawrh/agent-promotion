import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import TierPipeline from '../components/TierPipeline'
import ActionQueue from '../components/ActionQueue'
import GateDecision from '../components/GateDecision'
import NarrativeCard from '../components/NarrativeCard'
import { LAYERS } from '../types/SceneState'
import { DEMO_ACTIONS } from '../api/seed'
import * as api from '../api/client'
import type { AuthorityDecision } from '../types/ApiTypes'

const layer = LAYERS[0]

export default function Layer0Hook() {
  const [decision, setDecision] = useState<AuthorityDecision | null>(null)
  const [phase, setPhase] = useState<'ready' | 'checking' | 'refused'>('ready')

  const runScene = useCallback(async () => {
    setPhase('checking')
    try {
      await api.getAuthority('ops-agent')
      const result = await api.checkGate({
        agent_id: 'ops-agent',
        action_id: DEMO_ACTIONS.mediumRisk.action_id,
        consequence_score: DEMO_ACTIONS.mediumRisk.consequence_score,
      })
      setDecision(result)
      setPhase('refused')
    } catch {
      setPhase('ready')
    }
  }, [])

  return (
    <div className="space-y-6">
      <TierPipeline currentTier="T0" blocked={phase === 'refused'} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <ActionQueue
            actions={[
              { ...DEMO_ACTIONS.mediumRisk },
              { ...DEMO_ACTIONS.highRisk },
              { ...DEMO_ACTIONS.critical },
            ]}
            currentIndex={phase === 'ready' ? -1 : 0}
          />

          {phase === 'ready' && (
            <motion.button
              onClick={runScene}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Send action to the gate
            </motion.button>
          )}
        </div>

        <div className="space-y-4">
          <GateDecision decision={decision} actionLabel={DEMO_ACTIONS.mediumRisk.label} />
          {phase === 'refused' && (
            <NarrativeCard humorBeat={layer.humorBeat} turn={layer.turn} showTurn={true} />
          )}
        </div>
      </div>
    </div>
  )
}

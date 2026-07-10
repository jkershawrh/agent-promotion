import { motion } from 'framer-motion'
import type { ChainLink } from '../types/ApiTypes'
import { chainFillVariants } from '../lib/animations'

interface TrackRecordProps {
  chainCount: number
  successCount: number
  failureCount: number
  pendingCount: number
  rollingAccuracy: number
  chains: ChainLink[]
  targetChains?: number
}

const RESULT_COLORS = {
  success: '#22c55e',
  failure: '#ef4444',
  pending: '#6b7280',
}

export default function TrackRecord({
  chainCount,
  successCount,
  failureCount,
  pendingCount,
  rollingAccuracy,
  chains,
  targetChains = 50,
}: TrackRecordProps) {
  const displayChains = chains.slice(-30)

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-300">Track Record</h3>
        <span className="text-xs text-slate-500">
          {chainCount} / {targetChains} chains
        </span>
      </div>

      {/* Accuracy gauge */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Rolling accuracy</span>
          <span className="font-mono">{(rollingAccuracy * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: rollingAccuracy >= 0.75 ? '#22c55e' : rollingAccuracy >= 0.6 ? '#f59e0b' : '#ef4444',
            }}
            variants={chainFillVariants}
            initial="initial"
            animate="fill"
            custom={rollingAccuracy}
          />
        </div>
      </div>

      {/* Chain counts */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="text-center">
          <div className="text-green-400 font-mono font-bold">{successCount}</div>
          <div className="text-slate-500">success</div>
        </div>
        <div className="text-center">
          <div className="text-red-400 font-mono font-bold">{failureCount}</div>
          <div className="text-slate-500">failure</div>
        </div>
        <div className="text-center">
          <div className="text-slate-400 font-mono font-bold">{pendingCount}</div>
          <div className="text-slate-500">pending</div>
        </div>
      </div>

      {/* Chain visualization */}
      <div className="flex gap-0.5 flex-wrap">
        {displayChains.map((chain, i) => (
          <motion.div
            key={chain.correlation_id}
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: RESULT_COLORS[chain.result] }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02, duration: 0.2 }}
          />
        ))}
      </div>
    </div>
  )
}

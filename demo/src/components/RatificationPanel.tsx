import { motion } from 'framer-motion'
import type { RatificationRequest } from '../types/ApiTypes'

interface RatificationPanelProps {
  request: RatificationRequest | null
  onApprove: () => void
  onReject: () => void
}

export default function RatificationPanel({ request, onApprove, onReject }: RatificationPanelProps) {
  if (!request) return null

  const c = request.case

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'var(--surface-1)',
        border: '2px solid var(--rh-orange)',
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Red Hat Mono', monospace",
              color: 'var(--rh-orange)',
              letterSpacing: 1,
              textTransform: 'uppercase' as const,
            }}
          >
            RATIFICATION REQUIRED
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            Promote {request.agent_id} to {request.target_tier}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            background: 'var(--rh-orange-dim)',
            color: 'var(--rh-orange)',
            borderRadius: 4,
            fontFamily: "'Red Hat Mono', monospace",
            fontWeight: 600,
          }}
        >
          {request.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Verified chains</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              fontFamily: "'Red Hat Display', sans-serif",
              color: 'var(--text-primary)',
            }}
          >
            {c.chain_count}
          </div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Rolling accuracy</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              fontFamily: "'Red Hat Display', sans-serif",
              color: 'var(--text-primary)',
            }}
          >
            {(c.rolling_accuracy * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onApprove}
          style={{
            flex: 1,
            background: 'var(--rh-green)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Red Hat Text', sans-serif",
          }}
        >
          Approve
        </button>
        <button
          onClick={onReject}
          style={{
            flex: 1,
            background: 'none',
            color: 'var(--text-dim)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: "'Red Hat Text', sans-serif",
          }}
        >
          Reject
        </button>
      </div>
    </motion.div>
  )
}

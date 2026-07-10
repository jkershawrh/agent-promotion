import { motion } from 'framer-motion'
import type { RatificationRequest } from '../types/ApiTypes'

interface RatificationCaseProps {
  request: RatificationRequest
  onApprove: () => void
  onReject: () => void
}

export default function RatificationCase({ request, onApprove, onReject }: RatificationCaseProps) {
  const c = request.case

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        background: 'var(--surface-1)',
        border: '2px solid var(--rh-orange)',
        borderRadius: 10,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: 'var(--rh-orange)' }} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-orange)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>
          PERFORMANCE REVIEW
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif" }}>
          Promotion Case: {request.agent_id}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
          Requesting promotion to <span style={{ color: 'var(--rh-orange)', fontWeight: 700 }}>{request.target_tier}</span>
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 25 }}
          style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, textAlign: 'center' }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", color: 'var(--rh-teal)' }}>
            {c.chain_count}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>verified chains</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 25 }}
          style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, textAlign: 'center' }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", color: c.rolling_accuracy >= 0.85 ? 'var(--rh-green)' : 'var(--rh-orange)' }}>
            {(c.rolling_accuracy * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>rolling accuracy</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 25 }}
          style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, textAlign: 'center' }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", color: 'var(--rh-purple)' }}>
            {c.evidence_correlation_ids.length}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>evidence IDs</div>
        </motion.div>
      </div>

      {/* Notable successes */}
      {c.notable_successes.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-green)', letterSpacing: 1, marginBottom: 4 }}>
            NOTABLE SUCCESSES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {c.notable_successes.map((id) => (
              <span key={id} style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", background: 'var(--rh-green-dim)', color: 'var(--rh-green)', padding: '2px 6px', borderRadius: 3 }}>
                {id.slice(0, 20)}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Near misses */}
      {c.near_misses.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-orange)', letterSpacing: 1, marginBottom: 4 }}>
            NEAR MISSES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {c.near_misses.map((id) => (
              <span key={id} style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", background: 'var(--rh-orange-dim)', color: 'var(--rh-orange)', padding: '2px 6px', borderRadius: 3 }}>
                {id.slice(0, 20)}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Decision buttons */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          onClick={onApprove}
          style={{
            flex: 1, background: 'var(--rh-green)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Red Hat Text', sans-serif",
          }}
        >
          Approve Promotion
        </button>
        <button
          onClick={onReject}
          style={{
            flex: 1, background: 'none', color: 'var(--text-dim)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '10px 20px',
            fontSize: 14, cursor: 'pointer', fontFamily: "'Red Hat Text', sans-serif",
          }}
        >
          Reject
        </button>
      </motion.div>
    </motion.div>
  )
}

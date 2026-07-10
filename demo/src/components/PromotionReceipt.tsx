import { motion } from 'framer-motion'
import type { PromotionEvent } from '../types/ApiTypes'

interface PromotionReceiptProps {
  event: PromotionEvent
}

export default function PromotionReceipt({ event }: PromotionReceiptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--rh-green)',
        borderRadius: 10,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: 'var(--rh-green)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-green)', letterSpacing: 1 }}>
          PROMOTION RECEIPT
        </span>
        <span style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>
          ledger-verified
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", textTransform: 'uppercase' as const }}>Agent</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{event.agent_id}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", textTransform: 'uppercase' as const }}>Transition</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            <span style={{ color: 'var(--text-dim)' }}>{event.from_tier}</span>
            <span style={{ color: 'var(--rh-green)', margin: '0 6px' }}>→</span>
            <span style={{ color: 'var(--rh-green)' }}>{event.to_tier}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", textTransform: 'uppercase' as const, marginBottom: 2 }}>Reason</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{event.reason}</div>
      </div>

      {event.ratified_by && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", textTransform: 'uppercase' as const, marginBottom: 2 }}>Ratified by</div>
          <div style={{ fontSize: 12, color: 'var(--rh-orange)', fontWeight: 600 }}>{event.ratified_by}</div>
        </div>
      )}

      {event.evidence_correlation_ids.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", textTransform: 'uppercase' as const, marginBottom: 4 }}>
            Evidence bundle ({event.evidence_correlation_ids.length} chains)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {event.evidence_correlation_ids.slice(0, 8).map((id) => (
              <span key={id} style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", background: 'var(--rh-green-dim)', color: 'var(--rh-green)', padding: '2px 6px', borderRadius: 3 }}>
                {id.slice(0, 16)}
              </span>
            ))}
            {event.evidence_correlation_ids.length > 8 && (
              <span style={{ fontSize: 9, color: 'var(--text-disabled)' }}>
                +{event.evidence_correlation_ids.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
        <div style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>
          Receipt ID: {event.id.slice(0, 24)}...
        </div>
      </div>
    </motion.div>
  )
}

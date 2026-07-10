import { motion } from 'framer-motion'
import type { DemotionEvent } from '../types/ApiTypes'

interface DemotionReceiptProps {
  event: DemotionEvent
}

export default function DemotionReceipt({ event }: DemotionReceiptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--rh-red)',
        borderRadius: 10,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: 'var(--rh-red)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)', letterSpacing: 1 }}>
          DEMOTION RECEIPT
        </span>
        <span style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>
          immediate, automatic
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
            <span style={{ color: 'var(--rh-red)', margin: '0 6px' }}>→</span>
            <span style={{ color: 'var(--rh-red)' }}>{event.to_tier}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", textTransform: 'uppercase' as const, marginBottom: 2 }}>Trigger</div>
        <div style={{ fontSize: 12, color: 'var(--rh-red)', fontWeight: 600 }}>
          {event.trigger === 'falsified_action' ? 'Falsified action at or above ceiling' : 'Maintenance threshold breach'}
        </div>
      </div>

      {event.falsified_correlation_id && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", textTransform: 'uppercase' as const, marginBottom: 4 }}>
            Failed chain
          </div>
          <div style={{ background: 'var(--rh-red-dim)', borderRadius: 6, padding: 8 }}>
            <span style={{ fontSize: 11, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)' }}>
              {event.falsified_correlation_id}
            </span>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>
          Receipt ID: {event.id.slice(0, 24)}...
        </div>
        <div style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)' }}>
          no human gate required
        </div>
      </div>
    </motion.div>
  )
}

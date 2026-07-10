import { motion } from 'framer-motion'

interface ChainEntry {
  role: 'prediction' | 'action' | 'outcome'
  entry_type: string
  status: 'confirmed' | 'falsified' | 'pending'
}

interface EvidenceChainProps {
  correlationId: string
  entries: ChainEntry[]
  highlight?: boolean
}

const ROLE_META = {
  prediction: { label: 'PREDICT', color: 'var(--rh-blue)' },
  action: { label: 'ACT', color: 'var(--rh-teal)' },
  outcome: { label: 'VERIFY', color: 'var(--rh-green)' },
}

const STATUS_DOT = {
  confirmed: 'var(--rh-green)',
  falsified: 'var(--rh-red)',
  pending: 'var(--text-disabled)',
}

export default function EvidenceChain({ correlationId, entries, highlight }: EvidenceChainProps) {
  const isFalsified = entries.some((e) => e.status === 'falsified')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${isFalsified ? 'var(--rh-red)' : highlight ? 'var(--rh-green)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)', letterSpacing: 1 }}>
          CHAIN
        </span>
        <span style={{ fontSize: 9, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>
          {correlationId}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {entries.map((entry, i) => {
          const meta = ROLE_META[entry.role]
          return (
            <div key={entry.role} style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.2, type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  background: 'var(--surface-2)',
                  border: `1px solid ${meta.color}40`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: meta.color, letterSpacing: 1, marginBottom: 4 }}>
                  {meta.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[entry.status] }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {entry.status}
                  </span>
                </div>
              </motion.div>
              {i < entries.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.2 + 0.15, duration: 0.3 }}
                  style={{ width: 24, height: 2, background: `${meta.color}60`, transformOrigin: 'left' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

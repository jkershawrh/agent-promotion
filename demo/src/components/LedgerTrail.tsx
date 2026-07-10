import { motion, AnimatePresence } from 'framer-motion'

interface LedgerEntryDisplay {
  entry_type: string
  agent_id: string
  correlation_id: string
}

interface LedgerTrailProps {
  entries: LedgerEntryDisplay[]
}

function entryColor(type: string): string {
  if (type.includes('promotion')) return 'var(--rh-green)'
  if (type.includes('demotion')) return 'var(--rh-red)'
  if (type.includes('refuse') || type.includes('route_human')) return 'var(--rh-orange)'
  if (type.includes('ratification')) return 'var(--rh-purple)'
  return 'var(--text-disabled)'
}

function entryIcon(type: string): string {
  if (type.includes('promotion')) return '↑'
  if (type.includes('demotion')) return '↓'
  if (type.includes('refuse')) return '✗'
  if (type.includes('route_human')) return '→'
  if (type.includes('approved')) return '✓'
  if (type.includes('rejected')) return '✗'
  return '·'
}

export default function LedgerTrail({ entries }: LedgerTrailProps) {
  const displayEntries = entries.slice(-8)

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Red Hat Mono', monospace",
            color: 'var(--rh-teal)',
            letterSpacing: 1,
            textTransform: 'uppercase' as const,
          }}
        >
          ARE LEDGER TRAIL
        </span>
        <span style={{ fontSize: 10, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>
          hash-chained
        </span>
      </div>

      <AnimatePresence>
        {displayEntries.map((entry, i) => {
          const color = entryColor(entry.entry_type)
          return (
            <motion.div
              key={`${entry.correlation_id}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                borderLeft: `2px solid ${color}`,
                paddingLeft: 8,
                marginBottom: 4,
                fontSize: 11,
              }}
            >
              <span style={{ color, fontWeight: 700 }}>{entryIcon(entry.entry_type)}</span>
              <span style={{ color: 'var(--text-dim)', fontFamily: "'Red Hat Mono', monospace", flex: 1 }}>
                {entry.entry_type}
              </span>
              <span style={{ color: 'var(--text-disabled)', fontFamily: "'Red Hat Mono', monospace", fontSize: 9 }}>
                {entry.correlation_id.slice(0, 12)}...
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {entries.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-disabled)', textAlign: 'center', padding: '16px 0' }}>
          No ledger entries yet
        </div>
      )}
    </div>
  )
}

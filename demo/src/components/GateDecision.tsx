import { motion } from 'framer-motion'
import type { AuthorityDecision } from '../types/ApiTypes'

interface GateDecisionProps {
  decision: AuthorityDecision | null
  actionLabel?: string
}

const VERDICT_CONFIG = {
  allow: { color: 'var(--gate-allow)', icon: '✓', label: 'ALLOWED' },
  refuse: { color: 'var(--gate-refuse)', icon: '✗', label: 'REFUSED' },
  route_human: { color: 'var(--gate-route)', icon: '↑', label: 'ROUTED TO HUMAN' },
} as const

export default function GateDecision({ decision, actionLabel }: GateDecisionProps) {
  if (!decision) return null

  const config = VERDICT_CONFIG[decision.verdict]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={
        decision.verdict === 'refuse'
          ? { opacity: 1, scale: 1, x: [0, -8, 8, -6, 6, -3, 3, 0] }
          : { opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.5 }}
      style={{
        background: 'var(--surface-1)',
        border: `2px solid ${config.color}`,
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 24, color: config.color }}>{config.icon}</span>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Red Hat Mono', monospace",
              color: config.color,
              letterSpacing: 1,
            }}
          >
            {config.label}
          </div>
          {actionLabel && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{actionLabel}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginTop: 12 }}>
        <div>
          <span style={{ color: 'var(--text-disabled)' }}>consequence: </span>
          <span style={{ fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-secondary)' }}>
            {decision.requested_consequence}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-disabled)' }}>ceiling: </span>
          <span style={{ fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-secondary)' }}>
            {decision.ceiling}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 8 }}>{decision.reason}</div>
    </motion.div>
  )
}

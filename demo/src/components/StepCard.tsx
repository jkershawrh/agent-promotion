import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StepStatus } from '../stores/useDemoStore'

interface StepCardProps {
  num: number
  title: string
  status: StepStatus
  onRun?: () => void
  buttonLabel?: string
  children?: ReactNode
}

const STATUS_COLORS: Record<StepStatus, string> = {
  idle: 'var(--border)',
  running: 'var(--rh-blue)',
  done: 'var(--rh-green)',
  error: 'var(--rh-red)',
}

export default function StepCard({ num, title, status, onRun, buttonLabel, children }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: STATUS_COLORS[status],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Red Hat Mono', monospace",
            color: status === 'idle' ? 'var(--text-dim)' : '#fff',
            flexShrink: 0,
          }}
        >
          {status === 'done' ? '✓' : status === 'running' ? '...' : num}
        </div>

        <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{title}</span>

        {status === 'done' ? (
          <span style={{ fontSize: 12, color: 'var(--rh-green)', fontWeight: 600 }}>Complete</span>
        ) : onRun ? (
          <button
            onClick={onRun}
            disabled={status === 'running'}
            style={{
              background: 'var(--rh-red)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: status === 'running' ? 'wait' : 'pointer',
              opacity: status === 'running' ? 0.5 : 1,
              fontFamily: "'Red Hat Text', sans-serif",
            }}
          >
            {buttonLabel || 'Run'}
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {children && status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: 16, overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

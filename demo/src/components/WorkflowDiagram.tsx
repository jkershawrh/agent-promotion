import { motion } from 'framer-motion'

interface WorkflowStep {
  label: string
  description: string
  status: 'pending' | 'active' | 'done' | 'failed'
  icon: string
}

interface WorkflowDiagramProps {
  title: string
  steps: WorkflowStep[]
  narrative: string
}

const STATUS_STYLES = {
  pending: { bg: 'var(--surface-2)', border: 'var(--border)', text: 'var(--text-disabled)' },
  active: { bg: 'var(--rh-blue-dim)', border: 'var(--rh-blue)', text: 'var(--rh-blue)' },
  done: { bg: 'var(--rh-green-dim)', border: 'var(--rh-green)', text: 'var(--rh-green)' },
  failed: { bg: 'var(--rh-red-dim)', border: 'var(--rh-red)', text: 'var(--rh-red)' },
}

export default function WorkflowDiagram({ title, steps, narrative }: WorkflowDiagramProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-blue)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
        {narrative}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {steps.map((step, i) => {
          const style = STATUS_STYLES[step.status]
          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 400, damping: 25 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: style.bg,
                    border: `2px solid ${style.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    marginBottom: 6,
                  }}
                >
                  {step.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: style.text, textAlign: 'center', fontFamily: "'Red Hat Text', sans-serif" }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-disabled)', textAlign: 'center', maxWidth: 100, lineHeight: 1.4, marginTop: 2 }}>
                  {step.description}
                </div>
              </motion.div>
              {i < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.15 + 0.1, duration: 0.3 }}
                  style={{
                    height: 2,
                    flex: '0 0 24px',
                    background: step.status === 'done' ? 'var(--rh-green)' : 'var(--border)',
                    marginTop: -20,
                    transformOrigin: 'left',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

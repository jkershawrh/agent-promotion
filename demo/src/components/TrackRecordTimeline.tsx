import { motion } from 'framer-motion'

interface TrackRecordTimelineProps {
  total: number
  successes: number
  failures: number
  accuracy: number
  threshold: number
  thresholdLabel: string
}

export default function TrackRecordTimeline({
  total,
  successes,
  failures,
  accuracy,
  threshold,
  thresholdLabel,
}: TrackRecordTimelineProps) {
  const thresholdMet = accuracy >= threshold

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-teal)', letterSpacing: 1, textTransform: 'uppercase' as const }}>
          TRACK RECORD
        </span>
        <span style={{ fontSize: 11, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>
          {total} chains verified
        </span>
      </div>

      {/* Chain dots */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 16 }}>
        {Array.from({ length: total }, (_, i) => {
          const isSuccess = i < successes
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 500, damping: 20 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: isSuccess ? 'var(--rh-green)' : 'var(--rh-red)',
              }}
            />
          )
        })}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", color: 'var(--rh-green)' }}>
            {successes}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>success</div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", color: 'var(--rh-red)' }}>
            {failures}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>failure</div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", color: thresholdMet ? 'var(--rh-green)' : 'var(--rh-orange)' }}>
            {(accuracy * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>accuracy</div>
        </div>
      </div>

      {/* Accuracy gauge with threshold line */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span>0%</span>
          <span>100%</span>
        </div>
        <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${accuracy * 100}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 4,
              background: thresholdMet ? 'var(--rh-green)' : 'var(--rh-orange)',
            }}
          />
        </div>
        {/* Threshold line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, boxShadow: thresholdMet ? '0 0 6px var(--rh-green)' : 'none' }}
          transition={{ delay: 1.5, duration: 0.5 }}
          style={{
            position: 'absolute',
            left: `${threshold * 100}%`,
            top: 14,
            width: 2,
            height: 12,
            background: thresholdMet ? 'var(--rh-green)' : 'var(--rh-red)',
          }}
        />
        <div style={{ position: 'absolute', left: `${threshold * 100}%`, top: 28, transform: 'translateX(-50%)', fontSize: 9, color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>
          {thresholdLabel}
        </div>
      </div>
    </motion.div>
  )
}

interface FlowDescriptionProps {
  text: string
}

export default function FlowDescription({ text }: FlowDescriptionProps) {
  return (
    <div
      style={{
        borderLeft: '3px solid var(--rh-blue)',
        background: 'var(--rh-blue-dim)',
        borderRadius: '0 8px 8px 0',
        padding: '12px 16px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--rh-blue)',
          fontFamily: "'Red Hat Mono', monospace",
          letterSpacing: 1,
          textTransform: 'uppercase' as const,
          marginBottom: 6,
        }}
      >
        HOW IT WORKS
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.8,
          color: 'var(--text-secondary)',
        }}
      >
        {text}
      </div>
    </div>
  )
}

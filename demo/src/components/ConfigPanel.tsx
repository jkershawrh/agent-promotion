import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FlowDescription from './FlowDescription'
import * as api from '../api/client'

const TIER_COLORS: Record<string, string> = {
  T0: 'var(--tier-t0)',
  T1: 'var(--tier-t1)',
  T2: 'var(--tier-t2)',
  T3: 'var(--tier-t3)',
  T4: 'var(--tier-t4)',
}

const GATE_LABELS: Record<string, { label: string; color: string }> = {
  none: { label: 'Auto', color: 'var(--rh-green)' },
  hitl_if_mode: { label: 'HITL if mode', color: 'var(--rh-orange)' },
  hitl_always: { label: 'Always HITL', color: 'var(--rh-red)' },
}

interface ConfigPanelProps {
  defaultOpen?: boolean
}

export default function ConfigPanel({ defaultOpen = false }: ConfigPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (open && !config) {
      api.getConfig().then(setConfig).catch(() => {})
    }
  }, [open, config])

  const tiers = (config?.tiers ?? {}) as Record<string, { name: string; ceiling: number; description?: string }>
  const promotion = (config?.promotion ?? {}) as Record<string, { min_verified_chains: number; min_rolling_accuracy: number; extra_gate: string }>
  const maintenance = (config?.maintenance ?? {}) as { accuracy_margin?: number; window_size?: number }

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 16px', background: 'none', border: 'none',
          color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 8, fontFamily: "'Red Hat Text', sans-serif",
        }}
      >
        <span style={{ fontSize: 14, transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          ▸
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)', letterSpacing: 1 }}>
          GOVERNANCE CONFIGURATION
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginLeft: 'auto' }}>
          who defines the rules
        </span>
      </button>

      <AnimatePresence>
        {open && config && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px' }}>
              {/* Who defines this */}
              <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                The platform team defines these rules in <span style={{ fontFamily: "'Red Hat Mono', monospace", fontSize: 12, color: 'var(--rh-blue)' }}>authority.yaml</span>.
                Every number is adjustable. The only constraint: ceilings and thresholds must increase by tier.
                The system validates this at startup.
              </div>

              {/* Tiers table */}
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-teal)', letterSpacing: 1, marginBottom: 8 }}>
                AUTHORITY TIERS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 100px 80px 1fr', gap: '4px 12px', marginBottom: 16, fontSize: 12 }}>
                <div style={colHeader}>TIER</div>
                <div style={colHeader}>NAME</div>
                <div style={colHeader}>CEILING</div>
                <div style={colHeader}>CAN DO</div>
                {['T0', 'T1', 'T2', 'T3', 'T4'].map((t) => {
                  const tier = tiers[t]
                  if (!tier) return null
                  return [
                    <div key={`${t}-t`} style={{ fontFamily: "'Red Hat Mono', monospace", fontWeight: 700, color: TIER_COLORS[t] }}>{t}</div>,
                    <div key={`${t}-n`} style={{ color: TIER_COLORS[t], fontWeight: 600 }}>{tier.name}</div>,
                    <div key={`${t}-c`} style={{ fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-secondary)' }}>{tier.ceiling}</div>,
                    <div key={`${t}-d`} style={{ color: 'var(--text-dim)', fontSize: 11 }}>{tier.description || ''}</div>,
                  ]
                })}
              </div>

              {/* Promotion thresholds */}
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-green)', letterSpacing: 1, marginBottom: 8 }}>
                PROMOTION THRESHOLDS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 70px 70px 100px', gap: '4px 12px', marginBottom: 16, fontSize: 12 }}>
                <div style={colHeader}>TRANSITION</div>
                <div style={colHeader}>CHAINS</div>
                <div style={colHeader}>ACCURACY</div>
                <div style={colHeader}>EXTRA GATE</div>
                {['T0_to_T1', 'T1_to_T2', 'T2_to_T3', 'T3_to_T4'].map((key) => {
                  const p = promotion[key]
                  if (!p) return null
                  const gateInfo = GATE_LABELS[p.extra_gate] || { label: p.extra_gate, color: 'var(--text-dim)' }
                  return [
                    <div key={`${key}-k`} style={{ fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</div>,
                    <div key={`${key}-c`} style={{ fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-secondary)' }}>{p.min_verified_chains}</div>,
                    <div key={`${key}-a`} style={{ fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-secondary)' }}>{(p.min_rolling_accuracy * 100).toFixed(0)}%</div>,
                    <div key={`${key}-g`} style={{ fontFamily: "'Red Hat Mono', monospace", fontWeight: 600, color: gateInfo.color }}>{gateInfo.label}</div>,
                  ]
                })}
              </div>

              {/* Maintenance */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Maintenance margin</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace" }}>
                    {((maintenance.accuracy_margin ?? 0.1) * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>below promotion accuracy triggers demotion</div>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Rolling window</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace" }}>
                    {maintenance.window_size ?? 500}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>most recent chains for accuracy calculation</div>
                </div>
              </div>

              {/* Consequence scoring */}
              <FlowDescription text="Consequence scores are not hardcoded per action type. The consequence scoper computes a blast radius: affected users, violation magnitude, and scope. The score is a number. The gate compares the number against the ceiling. Any system that produces a numeric consequence score can use this gate." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const colHeader: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace",
  color: 'var(--text-disabled)', letterSpacing: 1, textTransform: 'uppercase',
  borderBottom: '1px solid var(--border)', paddingBottom: 4,
}

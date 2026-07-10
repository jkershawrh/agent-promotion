import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import StepCard from './components/StepCard'
import MetricCard from './components/MetricCard'
import FlowDescription from './components/FlowDescription'
import GateDecision from './components/GateDecision'
import EvidenceChain from './components/EvidenceChain'
import TrackRecordTimeline from './components/TrackRecordTimeline'
import PromotionReceipt from './components/PromotionReceipt'
import DemotionReceipt from './components/DemotionReceipt'
import RatificationCase from './components/RatificationCase'
import LedgerTrail from './components/LedgerTrail'
import WorkflowDiagram from './components/WorkflowDiagram'
import LabWizard from './components/LabWizard'
import ConfigPanel from './components/ConfigPanel'
import { useDemoStore, TOTAL_SLIDES, TOTAL_ACTS, ACT_META } from './stores/useDemoStore'
import { useDataStore } from './stores/useDataStore'
import { LAYERS } from './types/SceneState'
import { isPromotionEvent, isDemotionEvent } from './types/ApiTypes'
import type { AuthorityDecision, PromotionEvent, DemotionEvent, RatificationRequest } from './types/ApiTypes'
import * as api from './api/client'
import { DEMO_ACTIONS } from './api/seed'
import type { StepStatus } from './stores/useDemoStore'

// --- Shared UI pieces ---

function DotIndicator({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '12px 0' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i === current ? 'var(--rh-red)' : i < current ? 'var(--rh-green)' : 'var(--border)',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onClick={() => {
            const s = useDemoStore.getState()
            if (s.mode === 'slides') s.setSlide(i)
            else s.setActIndex(i)
          }}
        />
      ))}
    </div>
  )
}

function Footer() {
  const { mode, slide, actIndex, setMode, nextSlide, prevSlide, nextAct, prevAct, reset } = useDemoStore()
  if (mode === 'lab') return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 32px', display: 'flex', justifyContent: 'flex-end' }}>
      <button onClick={() => setMode('manual')} style={footerBtn}>Back to Demo</button>
    </div>
  )
  const isSlides = mode === 'slides'
  const current = isSlides ? slide : actIndex
  const total = isSlides ? TOTAL_SLIDES : TOTAL_ACTS

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-1)' }}>
      <button onClick={() => { if (isSlides) { if (slide === 0) reset(); else prevSlide() } else { if (actIndex === 0) setMode('slides'); else prevAct() } }} style={footerBtn}>Back</button>
      <span style={{ fontSize: 12, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)' }}>{current + 1} / {total}</span>
      <button
        onClick={() => { if (isSlides) { if (slide === TOTAL_SLIDES - 1) setMode('manual'); else nextSlide() } else { if (actIndex === TOTAL_ACTS - 1) setMode('lab'); else nextAct() } }}
        style={{ ...footerBtn, background: current === total - 1 ? 'var(--rh-red)' : 'none', color: current === total - 1 ? '#fff' : 'var(--text-dim)', border: current === total - 1 ? 'none' : '1px solid var(--border)', fontWeight: current === total - 1 ? 700 : 400 }}
      >
        {isSlides && slide === TOTAL_SLIDES - 1 ? 'Start Walkthrough' : !isSlides && actIndex === TOTAL_ACTS - 1 ? 'Try It Yourself' : 'Next'}
      </button>
    </div>
  )
}

const footerBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 6, padding: '6px 18px', fontSize: 13, cursor: 'pointer', fontFamily: "'Red Hat Text', sans-serif" }

// --- SLIDES MODE ---

function SlidesMode() {
  const { slide } = useDemoStore()
  const slides = [
    <div key="s0" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <img src="/logos/redhat.svg" alt="Red Hat" style={{ height: 36, marginBottom: 32 }} />
      <div style={{ fontSize: 56, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 16 }}>
        Agent Promotion Line
      </div>
      <div style={{ fontSize: 20, color: 'var(--text-dim)' }}>
        Governed authority for autonomous agents
      </div>
    </div>,
    <div key="s1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 24, textWrap: 'balance' as never }}>
        Every enterprise asks the same question.
      </div>
      <div style={{ fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        How do I trust an autonomous agent? It can act faster than a person, but it can also fail faster.
        And when it fails, it will not volunteer that information.
      </div>
    </div>,
    <div key="s2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 24 }}>
        The answer:
      </div>
      <div style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        "Trust it the way you trust a person. Except with guarantees a person cannot provide."
      </div>
    </div>,
    <div key="s3" style={{ maxWidth: 700, margin: '0 auto', padding: '40px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 24, textAlign: 'center' }}>
        Five authority tiers. Earned, not granted.
      </div>
      {[
        { tier: 'T0', name: 'PROBATION', desc: 'Advisory only. Every action routes to a human.', color: 'var(--tier-t0)' },
        { tier: 'T1', name: 'VERIFIED', desc: 'Low-risk ops. Restart a pod, clear a log backlog.', color: 'var(--tier-t1)' },
        { tier: 'T2', name: 'TRUSTED', desc: 'Medium-risk ops. Scale a service, rotate a certificate.', color: 'var(--tier-t2)' },
        { tier: 'T3', name: 'AUTONOMOUS', desc: 'High-risk ops. Failover a region, deploy to production.', color: 'var(--tier-t3)' },
        { tier: 'T4', name: 'PRINCIPAL', desc: 'Critical ops. Always requires human ratification.', color: 'var(--tier-t4)' },
      ].map((t, i) => (
        <motion.div key={t.tier} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, type: 'spring', stiffness: 400, damping: 25 }}
          style={{ borderLeft: `3px solid ${t.color}`, background: 'var(--surface-1)', borderRadius: '0 8px 8px 0', padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'Red Hat Mono', monospace", fontWeight: 700, fontSize: 12, color: t.color, minWidth: 24 }}>{t.tier}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: t.color, minWidth: 100 }}>{t.name}</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t.desc}</span>
        </motion.div>
      ))}
    </div>,
    <div key="s4" style={{ maxWidth: 700, margin: '0 auto', padding: '60px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 24, textAlign: 'center' }}>
        Three behaviors. Two modes.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Earn" value="↑" color="var(--rh-green)" detail="Promotion on verified record" />
        <MetricCard label="Refuse" value="✗" color="var(--rh-red)" detail="Gate blocks above ceiling" />
        <MetricCard label="Revoke" value="↓" color="var(--rh-orange)" detail="Immediate demotion on failure" />
      </div>
      <FlowDescription text="FULL_AUTO: promotions and demotions apply automatically. HITL_HIGH_TIER: high-tier promotions require human ratification. Demotion is always immediate in both modes." />
    </div>,
    <div key="s5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif" }}>
        Let me show you.
      </div>
    </div>,
  ]
  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 24px', cursor: slide < TOTAL_SLIDES - 1 ? 'pointer' : 'default' }}
      onClick={() => { if (slide < TOTAL_SLIDES - 1) useDemoStore.getState().nextSlide() }}>
      <DotIndicator total={TOTAL_SLIDES} current={slide} />
      <AnimatePresence mode="wait">
        <motion.div key={slide} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
          {slides[slide]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// --- MANUAL MODE ---

function ManualMode() {
  const { actIndex } = useDemoStore()
  const meta = ACT_META[actIndex]

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 24px' }}>
      <DotIndicator total={TOTAL_ACTS} current={actIndex} />
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>
          ACT {actIndex + 1} OF {TOTAL_ACTS}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif" }}>{meta.title}</div>
        <div style={{ fontSize: 16, color: 'var(--text-dim)' }}>{meta.subtitle}</div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={actIndex} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
          {actIndex === 0 && <Act0 />}
          {actIndex === 1 && <Act1 />}
          {actIndex === 2 && <Act2 />}
          {actIndex === 3 && <Act3 />}
          {actIndex === 4 && <Act4 />}
          {actIndex === 5 && <Act5 />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Act 0: The Probation
function Act0() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <WorkflowDiagram
        title="HOW TRUST WORKS"
        narrative="Every agent starts at the bottom. It earns authority by being right, over and over, until the system promotes it. If it fails, it loses authority immediately. No exceptions."
        steps={[
          { label: 'Start', description: 'Agent begins on probation', status: 'active', icon: '①' },
          { label: 'Act', description: 'Handle small tasks', status: 'pending', icon: '②' },
          { label: 'Verify', description: 'Each result is checked', status: 'pending', icon: '③' },
          { label: 'Earn', description: 'Promotion on good record', status: 'pending', icon: '④' },
          { label: 'Gate', description: 'Ceiling enforced always', status: 'pending', icon: '⑤' },
        ]}
      />

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ background: 'var(--surface-1)', border: '1px solid var(--tier-t0)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--tier-t0)', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>
          PROBATION
        </motion.div>
        <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif" }}>ops-agent</div>
        <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>Day one. Ready and willing. Not yet authorized.</div>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <MetricCard label="Authority Tier" value="T0" color="var(--tier-t0)" detail="PROBATION" />
        <MetricCard label="Consequence Ceiling" value="0" color="var(--tier-t0)" detail="Advisory only" />
        <MetricCard label="Operating Mode" value="AUTO" color="var(--text-dim)" detail="FULL_AUTO" />
      </div>
      <FlowDescription text="The agent starts at T0. Its consequence ceiling is zero. It can propose actions, but every one routes to a human or a higher-tier agent for execution. It cannot act on its own. This is the starting state for every agent, regardless of configuration." />
      <ConfigPanel />
    </div>
  )
}

// Act 1: The Gate
function Act1() {
  const [gateDecision, setGateDecision] = useState<AuthorityDecision | null>(null)
  const [phase, setPhase] = useState<'ready' | 'sending' | 'refused'>('ready')
  const data = useDataStore()

  const handleGate = useCallback(async () => {
    setPhase('sending')
    await api.resetDemo()
    await api.seedLayer('hook')
    await new Promise((r) => setTimeout(r, 800))
    const result = await api.checkGate({ agent_id: 'ops-agent', action_id: DEMO_ACTIONS.mediumRisk.action_id, consequence_score: DEMO_ACTIONS.mediumRisk.consequence_score })
    setGateDecision(result)
    data.addLedgerEntry({ entry_type: `authority.gate.${result.verdict}`, agent_id: 'ops-agent', correlation_id: result.action_id })
    setPhase('refused')
  }, [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <WorkflowDiagram
        title="WHAT HAPPENS HERE"
        narrative="The agent wants to scale the frontend service. That action has a consequence score of 30. The agent's ceiling is 0. The gate checks the score against the ceiling and refuses the action before it can execute."
        steps={[
          { label: 'Action arrives', description: 'Scale frontend (score: 30)', status: 'done', icon: '→' },
          { label: 'Gate checks', description: 'Score vs. ceiling', status: phase === 'sending' ? 'active' : phase === 'refused' ? 'done' : 'pending', icon: '⊘' },
          { label: 'Refused', description: 'Score 30 > ceiling 0', status: phase === 'refused' ? 'failed' : 'pending', icon: '✗' },
        ]}
      />

      <StepCard num={1} title="Send an action to the gate" status={phase === 'ready' ? 'idle' : phase === 'sending' ? 'running' : 'done' as StepStatus} onRun={handleGate} buttonLabel="Send action" />

      {phase === 'sending' && (
        <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ background: 'var(--surface-1)', border: '1px solid var(--rh-orange)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-orange)', padding: '2px 8px', background: 'var(--rh-orange-dim)', borderRadius: 4 }}>MEDIUM</span>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{DEMO_ACTIONS.mediumRisk.label}</span>
          <span style={{ marginLeft: 'auto', fontFamily: "'Red Hat Mono', monospace", fontSize: 12, color: 'var(--text-disabled)' }}>consequence: {DEMO_ACTIONS.mediumRisk.consequence_score}</span>
        </motion.div>
      )}

      {gateDecision && (
        <>
          <GateDecision decision={gateDecision} actionLabel={DEMO_ACTIONS.mediumRisk.label} />
          <EvidenceChain correlationId={gateDecision.action_id} entries={[
            { role: 'action', entry_type: 'gate.check', status: 'confirmed' },
            { role: 'outcome', entry_type: `gate.${gateDecision.verdict}`, status: gateDecision.verdict === 'allow' ? 'confirmed' : 'falsified' },
          ]} />
          <FlowDescription text="The consequence score on this action (30) was computed by the consequence scoper, not assigned by hand. The scoper looks at how many users are affected, how severe the impact would be, and how broad the scope. The gate compares that number against the agent's ceiling. There is no judgment call. It is a number against a number." />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 20 }}>
            <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: 14, marginBottom: 12 }}>"{LAYERS[0].humorBeat}"</div>
            <div style={{ fontSize: 10, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>THE TURN</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{LAYERS[0].turn}</div>
          </motion.div>
        </>
      )}
    </div>
  )
}

// Act 2: The Record
function Act2() {
  const [phase, setPhase] = useState<'ready' | 'seeding' | 'seeded' | 'evaluating' | 'promoted' | 'gating' | 'gated'>('ready')
  const [promotion, setPromotion] = useState<PromotionEvent | null>(null)
  const [gateDecision, setGateDecision] = useState<AuthorityDecision | null>(null)
  const data = useDataStore()

  const handleSeed = useCallback(async () => {
    setPhase('seeding')
    await api.resetDemo()
    await api.seedLayer('earn')
    setPhase('seeded')
  }, [])

  const handleEvaluate = useCallback(async () => {
    setPhase('evaluating')
    const result = await api.evaluateAuthority('ops-agent')
    if (result.status === 'promoted' && result.event && isPromotionEvent(result.event)) {
      setPromotion(result.event)
      data.addLedgerEntry({ entry_type: 'authority.promotion', agent_id: 'ops-agent', correlation_id: result.event.id })
    }
    setPhase('promoted')
  }, [data])

  const handleGate = useCallback(async () => {
    setPhase('gating')
    const result = await api.checkGate({ agent_id: 'ops-agent', action_id: DEMO_ACTIONS.lowRisk.action_id, consequence_score: DEMO_ACTIONS.lowRisk.consequence_score })
    setGateDecision(result)
    setPhase('gated')
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <WorkflowDiagram
        title="HOW PROMOTION WORKS"
        narrative="The agent handles 55 small tasks. Each one follows a cycle: predict what will happen, take the action, then verify the outcome. Every cycle is recorded as a chain in the ledger. When enough chains are verified and the accuracy is above the threshold, the system promotes the agent and raises its ceiling."
        steps={[
          { label: 'Handle tasks', description: '55 predict-act-verify cycles', status: phase === 'ready' ? 'pending' : 'done', icon: '↻' },
          { label: 'Record builds', description: 'Track accuracy over time', status: phase === 'seeded' ? 'active' : phase === 'ready' || phase === 'seeding' ? 'pending' : 'done', icon: '📊' },
          { label: 'Threshold met', description: '50+ chains, 60%+ accuracy', status: phase === 'promoted' || phase === 'gating' || phase === 'gated' ? 'done' : 'pending', icon: '✓' },
          { label: 'Promoted', description: 'Ceiling rises automatically', status: phase === 'promoted' || phase === 'gating' || phase === 'gated' ? 'done' : 'pending', icon: '↑' },
        ]}
      />

      <StepCard num={1} title="Build the track record" status={phase === 'ready' ? 'idle' : phase === 'seeding' ? 'running' : 'done' as StepStatus} onRun={handleSeed} buttonLabel="Seed 55 chains" />

      {(phase !== 'ready' && phase !== 'seeding') && (
        <TrackRecordTimeline total={55} successes={50} failures={5} accuracy={0.91} threshold={0.60} thresholdLabel="T0→T1: 60%" />
      )}

      {(phase === 'seeded') && (
        <StepCard num={2} title="Evaluate for promotion" status="idle" onRun={handleEvaluate} buttonLabel="Evaluate" />
      )}

      {promotion && <PromotionReceipt event={promotion} />}

      {(phase === 'promoted') && (
        <StepCard num={3} title="Test a low-risk action at the new tier" status="idle" onRun={handleGate} buttonLabel="Send low-risk action" />
      )}

      {gateDecision && <GateDecision decision={gateDecision} actionLabel={DEMO_ACTIONS.lowRisk.label} />}

      {(phase === 'promoted' || phase === 'gating' || phase === 'gated') && (
        <>
          <FlowDescription text="The promotion thresholds (50 chains at 60% accuracy for T0 to T1) are set in the platform configuration. An organization can require more chains, higher accuracy, or both. Every transition is independently configurable." />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 20 }}>
            <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: 14, marginBottom: 12 }}>"{LAYERS[1].humorBeat}"</div>
            <div style={{ fontSize: 10, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-green)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>THE TURN</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{LAYERS[1].turn}</div>
          </motion.div>
        </>
      )}
    </div>
  )
}

// Act 3: The Ratification
function Act3() {
  const [phase, setPhase] = useState<'ready' | 'seeding' | 'seeded' | 'evaluating' | 'queued' | 'approved'>('ready')
  const [ratification, setRatification] = useState<RatificationRequest | null>(null)
  const [promotion, setPromotion] = useState<PromotionEvent | null>(null)
  const data = useDataStore()

  const handleSeed = useCallback(async () => {
    setPhase('seeding')
    await api.resetDemo()
    await api.seedLayer('depth')
    setPhase('seeded')
  }, [])

  const handleEvaluate = useCallback(async () => {
    setPhase('evaluating')
    try {
      const result = await api.evaluateAuthority('ops-agent')
      if (result.status === 'ratification_queued' && result.request) {
        setRatification(result.request)
        setPhase('queued')
      } else {
        console.warn('Evaluate returned:', result.status, result)
        setPhase('seeded')
      }
    } catch (e) {
      console.error('Evaluate failed:', e)
      setPhase('seeded')
    }
  }, [])

  const handleApprove = useCallback(async () => {
    if (!ratification) return
    const result = await api.decideRatification(ratification.id, { approved: true, decided_by: 'human-admin' })
    if (result.status === 'approved' && result.event && isPromotionEvent(result.event)) {
      setPromotion(result.event)
      data.addLedgerEntry({ entry_type: 'authority.ratification.approved', agent_id: 'ops-agent', correlation_id: result.event.id })
    }
    setPhase('approved')
  }, [ratification, data])

  const handleReject = useCallback(async () => {
    if (!ratification) return
    await api.decideRatification(ratification.id, { approved: false, decided_by: 'human-admin' })
    setRatification(null)
    setPhase('seeded')
  }, [ratification])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--rh-orange)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 10, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-orange)', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>OPERATING MODE</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--rh-orange)' }}>HITL_HIGH_TIER</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Low-tier promotions apply automatically. High-tier promotions require a human to ratify.</div>
      </div>

      <WorkflowDiagram
        title="HOW HIGH-TIER PROMOTION WORKS"
        narrative="Low-tier promotions happen automatically when the numbers are met. But promoting into a high-consequence tier is different. The system assembles a case, like a performance review, and presents it to a human. The agent cannot promote itself into signing authority. Only a human can approve that."
        steps={[
          { label: 'Record reviewed', description: '510 chains at 87% accuracy', status: phase === 'ready' ? 'pending' : 'done', icon: '📋' },
          { label: 'Case assembled', description: 'Evidence, successes, misses', status: phase === 'queued' ? 'active' : phase === 'approved' ? 'done' : 'pending', icon: '📦' },
          { label: 'Human decides', description: 'Approve or reject', status: phase === 'approved' ? 'done' : phase === 'queued' ? 'active' : 'pending', icon: '👤' },
          { label: 'Promoted', description: 'Only after human approval', status: phase === 'approved' ? 'done' : 'pending', icon: '↑' },
        ]}
      />

      <StepCard num={1} title="Prepare the agent at T2 with 510 chains" status={phase === 'ready' ? 'idle' : phase === 'seeding' ? 'running' : 'done' as StepStatus} onRun={handleSeed} buttonLabel="Seed scenario" />

      {(phase === 'seeded' || phase === 'evaluating') && (
        <StepCard num={2} title="Evaluate for T2 to T3 promotion" status={phase === 'evaluating' ? 'running' : 'idle' as StepStatus} onRun={handleEvaluate} buttonLabel="Evaluate" />
      )}

      {ratification && phase === 'queued' && (
        <RatificationCase request={ratification} onApprove={handleApprove} onReject={handleReject} />
      )}

      {promotion && <PromotionReceipt event={promotion} />}

      {(phase === 'queued' || phase === 'approved') && (
        <>
          <FlowDescription text="The extra_gate field in the configuration controls whether a promotion requires human ratification. T2 to T3 is set to 'hitl_if_mode': it requires a human in HITL_HIGH_TIER mode but auto-promotes in FULL_AUTO. T3 to T4 is set to 'hitl_always': a human must approve regardless of mode. These gates are configurable per transition." />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 20 }}>
            <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: 14, marginBottom: 12 }}>"{LAYERS[2].humorBeat}"</div>
            {phase === 'approved' && (
              <>
                <div style={{ fontSize: 10, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-purple)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>THE TURN</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{LAYERS[2].turn}</div>
              </>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}

// Act 4: The Failure
function Act4() {
  const [phase, setPhase] = useState<'ready' | 'seeding' | 'seeded' | 'verifying' | 'demoted'>('ready')
  const [demotion, setDemotion] = useState<DemotionEvent | null>(null)
  const data = useDataStore()

  const handleSeed = useCallback(async () => {
    setPhase('seeding')
    await api.resetDemo()
    await api.seedLayer('floor')
    setPhase('seeded')
  }, [])

  const handleDemotion = useCallback(async () => {
    setPhase('verifying')
    await new Promise((r) => setTimeout(r, 1000))
    const result = await api.evaluateAuthority('ops-agent')
    if (result.status === 'demoted' && result.event && isDemotionEvent(result.event)) {
      setDemotion(result.event)
      data.addLedgerEntry({ entry_type: 'authority.demotion', agent_id: 'ops-agent', correlation_id: result.event.falsified_correlation_id ?? result.event.id })
    }
    setPhase('demoted')
  }, [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <WorkflowDiagram
        title="HOW DEMOTION WORKS"
        narrative="The agent took a high-consequence action and the outcome was later verified as wrong. The system does not wait for a meeting or a manager. It pulls the agent's authority immediately. Demotion is always instant and automatic, in both operating modes. This is the safety asymmetry: granting authority can wait, pulling it never does."
        steps={[
          { label: 'Agent acts', description: 'High-consequence action', status: phase === 'ready' ? 'pending' : 'done', icon: '⚡' },
          { label: 'Outcome verified', description: 'Result was falsified', status: phase === 'seeded' ? 'active' : phase === 'demoted' ? 'done' : 'pending', icon: '✗' },
          { label: 'Demotion fires', description: 'Immediate, no human gate', status: phase === 'demoted' ? 'done' : 'pending', icon: '↓' },
          { label: 'Ledger records', description: 'Receipt with failed chain', status: phase === 'demoted' ? 'done' : 'pending', icon: '📝' },
        ]}
      />

      <StepCard num={1} title="Prepare agent at T3 with a falsified chain" status={phase === 'ready' ? 'idle' : phase === 'seeding' ? 'running' : 'done' as StepStatus} onRun={handleSeed} buttonLabel="Seed scenario" />

      {phase === 'seeded' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <MetricCard label="Current Tier" value="T3" color="var(--tier-t3)" detail="AUTONOMOUS" />
            <MetricCard label="Ceiling" value="100" color="var(--tier-t3)" detail="High-risk ops" />
            <MetricCard label="Status" value="Active" color="var(--rh-green)" />
          </div>
          <EvidenceChain correlationId="seed-ops-agent-falsified" entries={[
            { role: 'prediction', entry_type: 'fleet.prediction.scale', status: 'confirmed' },
            { role: 'action', entry_type: 'fleet.action.scale', status: 'confirmed' },
            { role: 'outcome', entry_type: 'fleet.outcome.falsified', status: 'falsified' },
          ]} />
          <StepCard num={2} title="Trigger demotion evaluation" status="idle" onRun={handleDemotion} buttonLabel="Falsified outcome arrives" />
        </>
      )}

      {phase === 'verifying' && (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }}
          style={{ textAlign: 'center', padding: 20, fontSize: 14, color: 'var(--rh-orange)' }}>
          Verifying outcome against ledger...
        </motion.div>
      )}

      {demotion && (
        <>
          <DemotionReceipt event={demotion} />
          <LedgerTrail entries={data.ledgerEntries} />
          <FlowDescription text="The maintenance threshold is the promotion accuracy minus a configurable margin (default 10%). If accuracy drops below that, demotion fires. A single falsified action at or above the ceiling also triggers immediate demotion. The margin is adjustable: a tighter margin (5%) demotes sooner, a wider margin (15%) gives more room. But the falsified-at-ceiling demotion is always instant, regardless of margin." />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 20 }}>
            <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: 14, marginBottom: 12 }}>"{LAYERS[3].humorBeat}"</div>
            <div style={{ fontSize: 10, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>THE TURN</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{LAYERS[3].turn}</div>
          </motion.div>
        </>
      )}
    </div>
  )
}

// Act 5: The Close
function Act5() {
  const data = useDataStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1 }}
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 20, lineHeight: 1.8, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          {LAYERS[4].turn}
        </div>
      </motion.div>

      {data.ledgerEntries.length > 0 && <LedgerTrail entries={data.ledgerEntries} />}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-red)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 12 }}>
          THE RED HAT STORY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <span style={{ color: 'var(--rh-red)', fontWeight: 700 }}>OpenShift</span> is the platform.
            The <span style={{ color: 'var(--rh-blue)', fontWeight: 700 }}>ARE Ledger</span> provides the audit trail.
            Every line is <span style={{ color: 'var(--rh-green)', fontWeight: 700 }}>Apache 2.0</span>.
          </div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            Governance runs on <span style={{ color: 'var(--rh-orange)', fontWeight: 700 }}>CPU</span>. No GPU required.
            <span style={{ color: 'var(--rh-purple)', fontWeight: 700 }}> EU AI Act</span>, SOC 2, NIST ready.
          </div>
        </div>
        <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
          Governed AI on the platform you already run.
        </div>
      </motion.div>
    </div>
  )
}


// --- APP ---

function App() {
  const { mode } = useDemoStore()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, paddingBottom: 20 }}>
        {mode === 'slides' && <SlidesMode />}
        {(mode === 'manual' || mode === 'auto') && <ManualMode />}
        {mode === 'lab' && <LabWizard onExit={() => useDemoStore.getState().setMode('manual')} />}
      </main>
      <Footer />
    </div>
  )
}

export default App

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MetricCard from './MetricCard'
import FlowDescription from './FlowDescription'
import GateDecision from './GateDecision'
import TrackRecordTimeline from './TrackRecordTimeline'
import PromotionReceipt from './PromotionReceipt'
import DemotionReceipt from './DemotionReceipt'
import LedgerTrail from './LedgerTrail'
import StepCard from './StepCard'
import ConfigPanel from './ConfigPanel'
import * as api from '../api/client'
import { isPromotionEvent, isDemotionEvent } from '../types/ApiTypes'
import type { AuthorityDecision, PromotionEvent, DemotionEvent, RosterEntry } from '../types/ApiTypes'
import type { StepStatus } from '../stores/useDemoStore'

type LabPath = 'guided' | 'custom' | 'compare' | null

const STEP_LABELS = ['Choose Agent', 'Build Trust', 'Test the Gate', 'Break Trust']

const PRESET_ACTIONS = [
  { id: 'restart-pod', label: 'Restart a logging pod', score: 10 },
  { id: 'scale-service', label: 'Scale the frontend service', score: 30 },
  { id: 'rotate-cert', label: 'Rotate a TLS certificate', score: 45 },
  { id: 'failover-region', label: 'Failover region east', score: 100 },
  { id: 'migrate-db', label: 'Migrate the production database', score: 500 },
]

interface LabWizardProps {
  onExit: () => void
}

export default function LabWizard({ onExit }: LabWizardProps) {
  const [step, setStep] = useState(0)
  const [path, setPath] = useState<LabPath>(null)

  // Custom path state
  const [agentName, setAgentName] = useState('my-agent')
  const [chainCount, setChainCount] = useState(60)
  const [successRatio, setSuccessRatio] = useState(85)
  const [mode, setMode] = useState('FULL_AUTO')

  // Shared state
  const [agentId, setAgentId] = useState('ops-agent')
  const [promotions, setPromotions] = useState<PromotionEvent[]>([])
  const [demotion, setDemotion] = useState<DemotionEvent | null>(null)
  const [gateHistory, setGateHistory] = useState<Array<AuthorityDecision & { label: string }>>([])
  const [ledgerEntries, setLedgerEntries] = useState<Array<{ entry_type: string; agent_id: string; correlation_id: string }>>([])
  const [evalStatus, setEvalStatus] = useState<StepStatus>('idle')
  const [seedStatus, setSeedStatus] = useState<StepStatus>('idle')
  const [roster, setRoster] = useState<RosterEntry[]>([])

  const addLedger = useCallback((entry_type: string, agent: string, correlation_id: string) => {
    setLedgerEntries((prev) => [...prev, { entry_type, agent_id: agent, correlation_id }])
  }, [])

  // --- Step 0: Choose ---

  const handleGuided = useCallback(async () => {
    setPath('guided')
    setAgentId('ops-agent')
    await api.resetDemo()
    await api.seedLayer('earn')
    setStep(1)
  }, [])

  const handleCustomCreate = useCallback(async () => {
    setSeedStatus('running')
    await api.resetDemo()
    await api.seedCustom({
      agent_id: agentName,
      chain_count: chainCount,
      success_ratio: successRatio / 100,
      mode,
    })
    setAgentId(agentName)
    setPath('custom')
    setSeedStatus('done')
    setStep(1)
  }, [agentName, chainCount, successRatio, mode])

  const handleCompare = useCallback(async () => {
    setPath('compare')
    await api.resetDemo()
    await api.seedCustom({ agent_id: 'agent-alpha', chain_count: 60, success_ratio: 0.9, mode: 'FULL_AUTO' })
    await api.seedCustom({ agent_id: 'agent-beta', chain_count: 60, success_ratio: 0.9, mode: 'HITL_HIGH_TIER' })
    setAgentId('agent-alpha')
    setStep(1)
  }, [])

  // --- Step 1: Build Trust ---

  const handleEvaluate = useCallback(async (id?: string) => {
    const target = id || agentId
    setEvalStatus('running')
    try {
      const result = await api.evaluateAuthority(target)
      if (result.status === 'promoted' && result.event && isPromotionEvent(result.event)) {
        setPromotions((prev) => [...prev, result.event as PromotionEvent])
        addLedger('authority.promotion', target, (result.event as PromotionEvent).id)
      }
      if (result.status === 'ratification_queued') {
        addLedger('authority.ratification.queued', target, 'pending')
      }
      setEvalStatus('done')
      return result
    } catch {
      setEvalStatus('idle')
      return null
    }
  }, [agentId, addLedger])

  const handleSeedMore = useCallback(async () => {
    setSeedStatus('running')
    await api.seedCustom({ agent_id: agentId, chain_count: 50, success_ratio: 0.9 })
    setSeedStatus('done')
  }, [agentId])

  // --- Step 2: Test Gate ---

  const handleGateCheck = useCallback(async (actionId: string, label: string, score: number) => {
    const result = await api.checkGate({ agent_id: agentId, action_id: actionId, consequence_score: score })
    setGateHistory((prev) => [{ ...result, label }, ...prev])
    addLedger(`authority.gate.${result.verdict}`, agentId, result.action_id)
  }, [agentId, addLedger])

  // --- Step 3: Break Trust ---

  const handleInjectFailure = useCallback(async () => {
    setSeedStatus('running')
    const auth = await api.getAuthority(agentId)
    const ceiling = auth.consequence_ceiling || 100
    await api.seedCustom({ agent_id: agentId, chain_count: 1, success_ratio: 0, consequence: ceiling })
    setSeedStatus('done')
  }, [agentId])

  const handleDemotion = useCallback(async () => {
    setEvalStatus('running')
    const result = await api.evaluateAuthority(agentId)
    if (result.status === 'demoted' && result.event && isDemotionEvent(result.event)) {
      setDemotion(result.event)
      addLedger('authority.demotion', agentId, (result.event as DemotionEvent).falsified_correlation_id ?? (result.event as DemotionEvent).id)
    }
    setEvalStatus('done')
    const r = await api.getRoster()
    setRoster(r)
  }, [agentId, addLedger])

  const handleReset = useCallback(async () => {
    await api.resetDemo()
    setStep(0)
    setPath(null)
    setPromotions([])
    setDemotion(null)
    setGateHistory([])
    setLedgerEntries([])
    setEvalStatus('idle')
    setSeedStatus('idle')
    setRoster([])
    setAgentName('my-agent')
  }, [])

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace",
                background: i < step ? 'var(--rh-green)' : i === step ? 'var(--rh-red)' : 'var(--border)',
                color: i <= step ? '#fff' : 'var(--text-disabled)',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, color: i === step ? 'var(--text-primary)' : 'var(--text-disabled)' }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ width: 48, height: 2, background: i < step ? 'var(--rh-green)' : 'var(--border)', margin: '0 8px', marginBottom: 16 }} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>

          {/* === STEP 0: CHOOSE === */}
          {step === 0 && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 8 }}>Choose Your Agent</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 24 }}>Pick how you want to explore the promotion system. Start by reviewing the governance rules your agent will play by.</div>

              <div style={{ marginBottom: 20 }}>
                <ConfigPanel defaultOpen={true} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { id: 'guided' as LabPath, label: 'Guided Walkthrough', desc: 'Pre-built agent, step-by-step. Fastest path.', action: handleGuided },
                  { id: 'custom' as LabPath, label: 'Build Your Own', desc: 'Name it, configure it, see what happens.', action: () => setPath('custom') },
                  { id: 'compare' as LabPath, label: 'Compare Modes', desc: 'Same agent, two modes. See the difference.', action: handleCompare },
                ].map((opt) => (
                  <motion.button key={opt.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={opt.action}
                    style={{
                      background: path === opt.id ? 'var(--rh-red-dim)' : 'var(--surface-1)',
                      border: path === opt.id ? '2px solid var(--rh-red)' : '1px solid var(--border)',
                      borderRadius: 10, padding: 20, textAlign: 'left', cursor: 'pointer', color: 'inherit',
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{opt.desc}</div>
                  </motion.button>
                ))}
              </div>

              {path === 'custom' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Agent name</label>
                      <input value={agentName} onChange={(e) => setAgentName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Operating mode</label>
                      <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle}>
                        <option value="FULL_AUTO">FULL_AUTO</option>
                        <option value="HITL_HIGH_TIER">HITL_HIGH_TIER</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={labelStyle}>Chains to seed: {chainCount}</label>
                      <input type="range" min={10} max={200} value={chainCount} onChange={(e) => setChainCount(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Success ratio: {successRatio}%</label>
                      <input type="range" min={50} max={100} value={successRatio} onChange={(e) => setSuccessRatio(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <button onClick={handleCustomCreate} disabled={seedStatus === 'running'}
                    style={{ background: 'var(--rh-red)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Red Hat Text', sans-serif", opacity: seedStatus === 'running' ? 0.5 : 1 }}>
                    {seedStatus === 'running' ? 'Creating...' : 'Create Agent'}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* === STEP 1: BUILD TRUST === */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 8 }}>Build Trust</div>
              <FlowDescription text="The agent has a track record of verified chains. Each chain is a predict-act-verify cycle recorded in the ledger. When enough chains are verified and the accuracy meets the threshold, the system promotes the agent and raises its consequence ceiling." />

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <TrackRecordTimeline
                  total={path === 'custom' ? chainCount : 55}
                  successes={path === 'custom' ? Math.round(chainCount * successRatio / 100) : 50}
                  failures={path === 'custom' ? chainCount - Math.round(chainCount * successRatio / 100) : 5}
                  accuracy={path === 'custom' ? successRatio / 100 : 0.91}
                  threshold={0.60}
                  thresholdLabel="T0 to T1: 60%"
                />

                <StepCard num={1} title="Evaluate for promotion" status={evalStatus} onRun={() => handleEvaluate()} buttonLabel="Evaluate">
                  {promotions.length > 0 && <PromotionReceipt event={promotions[promotions.length - 1]} />}
                </StepCard>

                {evalStatus === 'done' && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '4px 0' }}>
                    {promotions.length > 0 ? 'Promotion applied. Seed more chains to reach the next tier, or move on to test the gate.' : 'No promotion yet. The agent may need more chains or higher accuracy to meet the threshold.'}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={async () => { await handleSeedMore(); setEvalStatus('idle') }}
                    style={{ ...actionBtn, background: 'var(--rh-blue)' }}>
                    Seed 50 more chains
                  </button>
                  <button onClick={() => { setEvalStatus('idle'); setTimeout(() => handleEvaluate(), 100) }}
                    style={{ ...actionBtn, background: 'var(--rh-green)' }}>
                    {evalStatus === 'idle' ? 'Evaluate' : 'Re-evaluate'}
                  </button>
                  <button onClick={() => setStep(2)} style={{ ...actionBtn, background: 'var(--rh-red)' }}>
                    Next: Test the Gate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === STEP 2: TEST THE GATE === */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 8 }}>Test the Gate</div>
              <FlowDescription text="Send actions of varying risk levels. The gate compares the action's consequence score against the agent's current ceiling. Below the ceiling: allowed. Above the ceiling: refused. The ceiling is the number, not a judgment call." />

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-blue)', letterSpacing: 1, marginBottom: 12 }}>SEND AN ACTION</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {PRESET_ACTIONS.map((action) => (
                      <button key={action.id} onClick={() => handleGateCheck(action.id, action.label, action.score)}
                        style={{
                          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6,
                          padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12,
                          fontFamily: "'Red Hat Text', sans-serif", display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                        <span>{action.label}</span>
                        <span style={{ fontFamily: "'Red Hat Mono', monospace", fontSize: 10, color: action.score > 50 ? 'var(--rh-red)' : action.score > 25 ? 'var(--rh-orange)' : 'var(--rh-green)' }}>
                          score: {action.score}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {gateHistory.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                    {gateHistory.map((g, i) => (
                      <GateDecision key={`${g.action_id}-${i}`} decision={g} actionLabel={g.label} />
                    ))}
                  </div>
                )}

                <button onClick={() => setStep(3)} style={{ ...actionBtn, background: 'var(--rh-red)', alignSelf: 'flex-end' }}>
                  Next: Break Trust
                </button>
              </div>
            </div>
          )}

          {/* === STEP 3: BREAK TRUST === */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Red Hat Display', sans-serif", marginBottom: 8 }}>Break Trust</div>
              <FlowDescription text="Inject a falsified outcome. The agent took a high-consequence action and was wrong. The system pulls its authority immediately. Demotion never waits on a human. This is the safety asymmetry: granting authority can wait, pulling it never does." />

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <StepCard num={1} title="Inject a falsified outcome at the ceiling" status={seedStatus === 'done' ? 'done' : seedStatus} onRun={handleInjectFailure} buttonLabel="Inject failure" />

                {seedStatus === 'done' && !demotion && (
                  <StepCard num={2} title="Evaluate (triggers demotion)" status={evalStatus} onRun={handleDemotion} buttonLabel="Evaluate" />
                )}

                {demotion && (
                  <>
                    <DemotionReceipt event={demotion} />
                    <LedgerTrail entries={ledgerEntries} />

                    {/* Completion panel */}
                    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--rh-green)', borderRadius: 10, padding: 24, marginTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--rh-green)', letterSpacing: 1, marginBottom: 16 }}>WHAT YOU JUST DID</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                        <MetricCard label="Created an agent" value="①" color="var(--rh-blue)" />
                        <MetricCard label="Earned promotions" value={String(promotions.length)} color="var(--rh-green)" />
                        <MetricCard label="Tested the gate" value={String(gateHistory.length)} color="var(--rh-orange)" />
                        <MetricCard label="Broke trust" value="①" color="var(--rh-red)" />
                      </div>

                      {roster.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Red Hat Mono', monospace", color: 'var(--text-disabled)', letterSpacing: 1, marginBottom: 8 }}>FINAL ROSTER</div>
                          {roster.map((r) => (
                            <div key={r.agent_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
                              <span style={{ fontFamily: "'Red Hat Mono', monospace", fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `var(--tier-${r.tier.toLowerCase()})`, color: '#fff' }}>
                                {r.tier}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{r.agent_id}</span>
                              <span style={{ marginLeft: 'auto', fontFamily: "'Red Hat Mono', monospace", fontSize: 11, color: 'var(--text-disabled)' }}>ceiling: {r.consequence_ceiling}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={handleReset} style={{ ...actionBtn, background: 'var(--rh-red)' }}>Try Another Agent</button>
                        <button onClick={onExit} style={{ ...actionBtn, background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>Back to Demo</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4,
  fontFamily: "'Red Hat Text', sans-serif",
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, fontFamily: "'Red Hat Text', sans-serif",
  outline: 'none',
}

const actionBtn: React.CSSProperties = {
  color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13,
  fontWeight: 700, cursor: 'pointer', fontFamily: "'Red Hat Text', sans-serif",
}

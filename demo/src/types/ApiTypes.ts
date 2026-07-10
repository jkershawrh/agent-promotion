// CDD: Response shapes mirroring the Pydantic models in the agent-promotion-line service.
// No logic. These are the contracts the API client and components code against.

export type AuthorityTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4'
export type OperatingMode = 'FULL_AUTO' | 'HITL_HIGH_TIER'
export type GateVerdict = 'allow' | 'refuse' | 'route_human'
export type RatificationStatus = 'pending' | 'approved' | 'rejected'
export type DemotionTriggerType = 'falsified_action' | 'maintenance_breach'
export type ChainResult = 'success' | 'failure' | 'pending'

export interface AgentAuthority {
  agent_id: string
  tier: AuthorityTier
  consequence_ceiling: number
  mode: OperatingMode
  updated_at: string
}

export interface ChainLink {
  correlation_id: string
  result: ChainResult
  consequence_score: number | null
  timestamp: string | null
}

export interface TrackRecord {
  agent_id: string
  window: number
  chain_count: number
  success_count: number
  failure_count: number
  pending_count: number
  rolling_accuracy: number
  chains: ChainLink[]
}

export interface PromotionEvent {
  id: string
  agent_id: string
  from_tier: AuthorityTier
  to_tier: AuthorityTier
  reason: string
  evidence_correlation_ids: string[]
  ratified_by: string | null
  timestamp: string
}

export interface DemotionEvent {
  id: string
  agent_id: string
  from_tier: AuthorityTier
  to_tier: AuthorityTier
  trigger: DemotionTriggerType
  falsified_correlation_id: string | null
  timestamp: string
}

export interface AuthorityDecision {
  action_id: string
  agent_id: string
  requested_consequence: number
  ceiling: number
  verdict: GateVerdict
  reason: string
}

export interface PromotionCase {
  agent_id: string
  target_tier: AuthorityTier
  chain_count: number
  rolling_accuracy: number
  notable_successes: string[]
  near_misses: string[]
  evidence_correlation_ids: string[]
}

export interface RatificationRequest {
  id: string
  agent_id: string
  target_tier: AuthorityTier
  case: PromotionCase
  status: RatificationStatus
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

export interface RosterEntry {
  agent_id: string
  tier: AuthorityTier
  tier_name: string
  consequence_ceiling: number
  mode: OperatingMode
  rolling_accuracy: number | null
}

export interface EvaluateResponse {
  status: 'promoted' | 'demoted' | 'ratification_queued' | 'no_change' | 'approved' | 'rejected'
  event?: PromotionEvent | DemotionEvent
  request?: RatificationRequest
  agent_id?: string
  tier?: AuthorityTier
}

export interface GateRequest {
  agent_id: string
  action_id: string
  consequence_score: number
}

export interface DecisionRequest {
  approved: boolean
  decided_by: string
}

// Type guards
export function isPromotionEvent(event: unknown): event is PromotionEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'from_tier' in event &&
    'to_tier' in event &&
    'reason' in event
  )
}

export function isDemotionEvent(event: unknown): event is DemotionEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'from_tier' in event &&
    'to_tier' in event &&
    'trigger' in event
  )
}

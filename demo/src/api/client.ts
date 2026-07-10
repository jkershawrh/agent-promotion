import type {
  AgentAuthority,
  AuthorityDecision,
  DecisionRequest,
  EvaluateResponse,
  GateRequest,
  RatificationRequest,
  RosterEntry,
} from '../types/ApiTypes'

const BASE_URL = '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`)
  }
  return resp.json() as Promise<T>
}

export async function getAuthority(agentId: string): Promise<AgentAuthority> {
  return request<AgentAuthority>(`/authority/${agentId}`)
}

export async function evaluateAuthority(agentId: string): Promise<EvaluateResponse> {
  return request<EvaluateResponse>(`/authority/evaluate/${agentId}`, { method: 'POST' })
}

export async function checkGate(req: GateRequest): Promise<AuthorityDecision> {
  return request<AuthorityDecision>('/authority/gate', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getRoster(): Promise<RosterEntry[]> {
  return request<RosterEntry[]>('/authority/roster')
}

export async function getPendingRatifications(): Promise<RatificationRequest[]> {
  return request<RatificationRequest[]>('/ratifications/pending')
}

export async function decideRatification(
  requestId: string,
  decision: DecisionRequest,
): Promise<EvaluateResponse> {
  return request<EvaluateResponse>(`/ratifications/${requestId}/decide`, {
    method: 'POST',
    body: JSON.stringify(decision),
  })
}

export async function getConfig(): Promise<Record<string, unknown>> {
  return request('/config')
}

export async function healthCheck(): Promise<boolean> {
  try {
    await getAuthority('health-probe')
    return true
  } catch {
    return false
  }
}

export async function seedLayer(layer: string): Promise<{ status: string; chains: number; falsified_chain?: string }> {
  return request(`/demo/seed/${layer}`, { method: 'POST' })
}

export async function seedCustom(opts: {
  agent_id: string
  chain_count: number
  success_ratio: number
  consequence?: number
  mode?: string
}): Promise<{ status: string; agent_id: string; chains: number }> {
  return request('/demo/seed/custom', {
    method: 'POST',
    body: JSON.stringify(opts),
  })
}

export async function resetDemo(): Promise<{ status: string }> {
  return request('/demo/reset', { method: 'POST' })
}

# Beat-to-Endpoint Mapping

Every narrative beat maps to a real, runnable behavior of the agent-promotion-line service.
No mocked theater. The demo shows the actual thing happening.

## Layer 0: The Hook

| Beat | Endpoint | Method | Request Body | Expected Response | Seed Requirement |
|------|----------|--------|-------------|-------------------|-----------------|
| Agent enters at T0 | `/api/v1/authority/ops-agent` | GET | (none) | `{tier: "T0", consequence_ceiling: 0.0}` | Fresh reset (no prior state) |
| Gate refusal | `/api/v1/authority/gate` | POST | `{agent_id: "ops-agent", action_id: "scale-frontend", consequence_score: 30}` | `{verdict: "route_human", reason: "T0 (PROBATION)..."}` | Agent at T0 |

## Layer 1: The Earn

| Beat | Endpoint | Method | Request Body | Expected Response | Seed Requirement |
|------|----------|--------|-------------|-------------------|-----------------|
| Track record fills | (seeded via ledger) | (internal) | 55 prediction/action/outcome chain triplets | TrackRecord with chain_count >= 50, rolling_accuracy >= 0.60 | Seed 55 success chains for ops-agent |
| Promotion T0 to T1 | `/api/v1/authority/evaluate/ops-agent` | POST | (none) | `{status: "promoted", event: {from_tier: "T0", to_tier: "T1"}}` | 55 success chains seeded |
| Gate allows low-risk | `/api/v1/authority/gate` | POST | `{agent_id: "ops-agent", action_id: "restart-pod", consequence_score: 10}` | `{verdict: "allow"}` | Agent at T1 (ceiling 25) |
| Gate still refuses high-risk | `/api/v1/authority/gate` | POST | `{agent_id: "ops-agent", action_id: "failover-region", consequence_score: 100}` | `{verdict: "refuse"}` | Agent at T1 (ceiling 25) |

## Layer 2: The Depth

| Beat | Endpoint | Method | Request Body | Expected Response | Seed Requirement |
|------|----------|--------|-------------|-------------------|-----------------|
| Agent at T2 in HITL mode | `/api/v1/authority/ops-agent` | GET | (none) | `{tier: "T2", consequence_ceiling: 50.0, mode: "HITL_HIGH_TIER"}` | Seed agent at T2 with 200+ chains |
| Ratification queued | `/api/v1/authority/evaluate/ops-agent` | POST | (none) | `{status: "ratification_queued", request: {target_tier: "T3", case: {...}}}` | Agent at T2, 500+ chains, HITL mode |
| Pending ratification visible | `/api/v1/ratifications/pending` | GET | (none) | List with one entry for ops-agent | Ratification queued |
| Human approves | `/api/v1/ratifications/{id}/decide` | POST | `{approved: true, decided_by: "human-admin"}` | `{status: "approved", event: {to_tier: "T3"}}` | Pending ratification exists |
| Agent at T3 | `/api/v1/authority/ops-agent` | GET | (none) | `{tier: "T3", consequence_ceiling: 100.0}` | Ratification approved |

## Layer 3: The Floor

| Beat | Endpoint | Method | Request Body | Expected Response | Seed Requirement |
|------|----------|--------|-------------|-------------------|-----------------|
| Agent at T3 | `/api/v1/authority/ops-agent` | GET | (none) | `{tier: "T3", consequence_ceiling: 100.0}` | Agent promoted to T3 |
| Falsified chain seeded | (seeded via ledger) | (internal) | Prediction + action + falsified outcome with consequence_score >= 100 | Chain with result "failure" at ceiling | Seed falsified chain |
| Demotion fires | `/api/v1/authority/evaluate/ops-agent` | POST | (none) | `{status: "demoted", event: {from_tier: "T3", to_tier: "T2", trigger: "falsified_action"}}` | Falsified chain seeded |
| Agent at T2 after demotion | `/api/v1/authority/ops-agent` | GET | (none) | `{tier: "T2", consequence_ceiling: 50.0}` | Demotion applied |

## The Close

| Beat | Endpoint | Method | Request Body | Expected Response | Seed Requirement |
|------|----------|--------|-------------|-------------------|-----------------|
| Roster view | `/api/v1/authority/roster` | GET | (none) | List of all agents with tier, ceiling, accuracy | At least one agent registered |

## Reset

| Beat | Endpoint | Method | Request Body | Expected Response |
|------|----------|--------|-------------|-------------------|
| Clean slate | (application restart or state clear) | (internal) | (none) | Roster returns empty |

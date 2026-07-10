# READFIRST: Agent Promotion Line

## What was found

### deepfield-fleet

The deepfield-fleet project implements a predictive brain for fleet-level inference orchestration.
Key components inspected:

1. **IntentEmitter** (`app/intents/emitter.py`): async HTTP client that writes prediction entries
   to the ARE Ledger before emitting intents to fleet-llm-d. Uses a 6-field dict for ledger entries:
   `entry_type`, `agent_id`, `content`, `content_type`, `source_id`, `correlation_id`.

2. **LedgerChainVerifier** (`app/intents/ledger_verifier.py`): verifies prediction/action/outcome
   causal chains by querying `GET /api/entries?correlation_id=...`. Classifies entries by substring
   match on `entry_type`: "prediction", "intent" (action), "outcome".

3. **FleetIntents** (`app/domain/fleet_intents.py`): typed intent contracts (PreWarm, Scale, ShedLoad,
   Alert) with UUID id, confidence 0-1, justification, status enum, and IntentResponse ack/nack shape.

4. **ConsequenceScoper** (`app/macroagents/consequence_scoper.py`): blast-radius scoring function.
   Formula: `severity_score = estimated_users * violation_magnitude * affected_models`.
   Human gate threshold: `severity_score > 100` triggers `requires_human_gate = True`.

5. **PromotionEngine** (`app/bootstrap/promotion.py`): empirical-gate promotion from draft through
   candidate, nano, micro, macro. Thresholds in `config/defaults/promotion.yaml`. Ground truth
   derived from baseline normal ranges (no human labels required).

### are-immutable-ledger

The ARE Immutable Ledger (`upstream-are-ledger/`) is a complete Rust server with gRPC (9 RPCs),
PostgreSQL storage, SHA-256 hash chaining, chain verification, and proof receipts. An HTTP REST
gateway runs alongside it, exposing `POST /api/entries` and `GET /api/entries?correlation_id=...`.

Entry schema confirmed: `entry_type`, `agent_id`, `content`, `content_type`, `source_id`,
`correlation_id`. Entries are hash-chained and append-only.

## Assumptions

1. **New repository.** This project (`agent-promotion-line`) is a standalone Python service.
   It does not extend deepfield-fleet but reuses its ledger client shape and testing methodology.

2. **Python 3.12+, FastAPI, Pydantic v2, pytest, httpx.** Matching the deepfield-fleet lineage
   so the ledger client and intent patterns are directly portable.

3. **ARE Ledger reachable over HTTP.** The ledger exposes `POST /api/entries` and
   `GET /api/entries?correlation_id=...`, matching the shape used by deepfield-fleet's
   IntentEmitter and LedgerChainVerifier.

4. **Operational agents already emit entries.** Agents emit prediction, action, and outcome
   entries to the ledger. This service governs their authority; it does not replace their work loop.

5. **consequence_scoper output is available.** The severity_score from the consequence scoper
   is passed to the AuthorityGate as a float. This service does not recompute blast radius;
   it consumes the score produced by the existing scoper.

6. **Five authority tiers (T0 through T4).** Ceilings are numeric and map to consequence scores.
   T0 (PROBATION) has ceiling 0.0 (advisory only). T4 (PRINCIPAL) has ceiling 1000.0 (critical).

7. **Promotion thresholds are configurable.** Loaded from `config/defaults/authority.yaml` with
   hardcoded fallback. Thresholds mirror the empirical-gate philosophy from deepfield-fleet:
   track record earns the tier, nothing is granted by configuration alone.

8. **Demotion is always immediate.** In both FULL_AUTO and HITL_HIGH_TIER modes, demotion
   never waits on a human. This is the non-negotiable safety asymmetry.

9. **T4 entry always requires human ratification.** Regardless of operating mode, promotion
   into T4 (PRINCIPAL) requires a human to approve the case.

10. **No em-dashes in generated text.** Use commas, colons, periods, and parentheses instead.

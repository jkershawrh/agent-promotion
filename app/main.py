"""FastAPI application for the Agent Promotion Line.

Endpoints:
  GET  /api/v1/authority/{agent_id}          current authority
  POST /api/v1/authority/evaluate/{agent_id} reassemble + evaluate
  POST /api/v1/authority/gate                check proposed action
  GET  /api/v1/ratifications/pending         list pending cases
  POST /api/v1/ratifications/{id}/decide     human approves or rejects
  GET  /api/v1/authority/roster              all agents with tier and accuracy
"""

from __future__ import annotations

import os
from typing import Any, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.authority.assembler import TrackRecordAssembler
from app.authority.demotion import DemotionTrigger
from app.authority.evaluator import PromotionEvaluator
from app.authority.gate import AuthorityGate
from app.authority.mode import ModeController
from app.authority.ratification import RatificationQueue
from app.authority.recorder import LedgerRecorder
from app.domain.config import get_tier_ceiling, load_config
from app.domain.models import (
    AgentAuthority,
    AuthorityDecision,
    AuthorityTier,
    DemotionEvent,
    GateVerdict,
    OperatingMode,
    PromotionEvent,
    RatificationRequest,
)
from app.ledger.client import InMemoryLedgerClient, HttpLedgerClient

app = FastAPI(title="Agent Promotion Line", version="0.1.0")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

config = load_config()

ledger_url = os.environ.get("ARE_LEDGER_URL", "")
if ledger_url:
    ledger_client = HttpLedgerClient(ledger_url)
else:
    ledger_client = InMemoryLedgerClient()

authority_store: dict[str, AgentAuthority] = {}
assembler = TrackRecordAssembler(ledger_client, config)
evaluator = PromotionEvaluator(config)
demotion_trigger = DemotionTrigger(config)
controller = ModeController(evaluator, demotion_trigger)
gate = AuthorityGate(authority_store)
ratification_queue = RatificationQueue(config)
recorder = LedgerRecorder(ledger_client)


class GateRequest(BaseModel):
    agent_id: str
    action_id: str
    consequence_score: float


class DecisionRequest(BaseModel):
    approved: bool
    decided_by: str


class RosterEntry(BaseModel):
    agent_id: str
    tier: AuthorityTier
    tier_name: str
    consequence_ceiling: float
    mode: OperatingMode
    rolling_accuracy: Optional[float] = None


def _ensure_agent(agent_id: str, mode: OperatingMode = OperatingMode.FULL_AUTO) -> AgentAuthority:
    if agent_id not in authority_store:
        auth = AgentAuthority(
            agent_id=agent_id,
            tier=AuthorityTier.T0,
            consequence_ceiling=get_tier_ceiling(config, "T0"),
            mode=mode,
        )
        authority_store[agent_id] = auth
        gate.register(auth)
    return authority_store[agent_id]


@app.get("/api/v1/config")
async def get_config() -> dict[str, Any]:
    return config


@app.get("/api/v1/authority/roster")
async def get_roster() -> list[dict[str, Any]]:
    tier_order = {AuthorityTier.T4: 0, AuthorityTier.T3: 1, AuthorityTier.T2: 2, AuthorityTier.T1: 3, AuthorityTier.T0: 4}
    sorted_agents = sorted(authority_store.values(), key=lambda a: tier_order.get(a.tier, 99))
    result = []
    for auth in sorted_agents:
        tier_name = config["tiers"][auth.tier.value]["name"]
        result.append(RosterEntry(
            agent_id=auth.agent_id,
            tier=auth.tier,
            tier_name=tier_name,
            consequence_ceiling=auth.consequence_ceiling,
            mode=auth.mode,
        ).model_dump())
    return result


@app.get("/api/v1/authority/{agent_id}")
async def get_authority(agent_id: str) -> dict[str, Any]:
    auth = _ensure_agent(agent_id)
    return auth.model_dump()


@app.post("/api/v1/authority/evaluate/{agent_id}")
async def evaluate_authority(agent_id: str) -> dict[str, Any]:
    auth = _ensure_agent(agent_id)
    track_record = await assembler.assemble(agent_id)

    result = controller.evaluate(track_record, auth)

    if result is None:
        return {"status": "no_change", "agent_id": agent_id, "tier": auth.tier.value}

    if isinstance(result, PromotionEvent):
        auth.tier = result.to_tier
        auth.consequence_ceiling = get_tier_ceiling(config, result.to_tier.value)
        gate.register(auth)
        await recorder.record_promotion(result)
        return {
            "status": "promoted",
            "event": result.model_dump(),
        }

    if isinstance(result, DemotionEvent):
        auth.tier = result.to_tier
        auth.consequence_ceiling = get_tier_ceiling(config, result.to_tier.value)
        gate.register(auth)
        await recorder.record_demotion(result)
        return {
            "status": "demoted",
            "event": result.model_dump(),
        }

    if isinstance(result, RatificationRequest):
        ratification_queue.pending[result.id] = result
        return {
            "status": "ratification_queued",
            "request": result.model_dump(),
        }

    return {"status": "unknown"}


@app.post("/api/v1/authority/gate")
async def check_gate(req: GateRequest) -> dict[str, Any]:
    _ensure_agent(req.agent_id)
    decision = gate.check(req.agent_id, req.action_id, req.consequence_score)
    await recorder.record_gate_decision(decision)
    return decision.model_dump()


@app.get("/api/v1/ratifications/pending")
async def list_pending() -> list[dict[str, Any]]:
    return [r.model_dump() for r in ratification_queue.list_pending()]


@app.post("/api/v1/ratifications/{request_id}/decide")
async def decide_ratification(request_id: UUID, req: DecisionRequest) -> dict[str, Any]:
    result = ratification_queue.decide(request_id, req.approved, req.decided_by)
    if result is None and request_id not in ratification_queue.pending:
        if req.approved:
            raise HTTPException(status_code=404, detail="Ratification request not found")
        return {"status": "rejected", "request_id": str(request_id)}

    if isinstance(result, PromotionEvent):
        auth = _ensure_agent(result.agent_id)
        auth.tier = result.to_tier
        auth.consequence_ceiling = get_tier_ceiling(config, result.to_tier.value)
        gate.register(auth)
        await recorder.record_promotion(result)
        return {
            "status": "approved",
            "event": result.model_dump(),
        }

    return {"status": "rejected", "request_id": str(request_id)}


def _generate_chains(agent_id: str, count: int, success_ratio: float = 0.9, consequence: float = 15.0):
    """Generate deterministic chain entries for seeding.

    Interleaves successes and failures so recency weighting does not
    penalize accuracy by clustering all failures at the tail.
    """
    entries = []
    if success_ratio <= 0:
        failure_interval = 1
    elif success_ratio >= 1.0:
        failure_interval = count + 1
    else:
        failure_interval = max(2, int(1.0 / (1.0 - success_ratio)))
    for i in range(count):
        corr = f"seed-{agent_id}-{i:04d}"
        outcome = "failed" if (i + 1) % failure_interval == 0 else "confirmed"
        entries.append({
            "entry_type": "fleet.prediction.scale",
            "agent_id": agent_id,
            "content": f'{{"consequence_score": {consequence}, "chain_index": {i}}}',
            "content_type": "application/json",
            "source_id": "demo-seed",
            "correlation_id": corr,
        })
        entries.append({
            "entry_type": f"fleet.outcome.{outcome}",
            "agent_id": agent_id,
            "content": outcome,
            "content_type": "text/plain",
            "source_id": "demo-seed",
            "correlation_id": corr,
        })
    return entries


class CustomSeedRequest(BaseModel):
    agent_id: str = "my-agent"
    chain_count: int = 55
    success_ratio: float = 0.9
    consequence: float = 15.0
    mode: str = "FULL_AUTO"


@app.post("/api/v1/demo/seed/custom")
async def seed_custom(req: CustomSeedRequest) -> dict[str, Any]:
    if not isinstance(ledger_client, InMemoryLedgerClient):
        raise HTTPException(status_code=400, detail="Seeding only works with in-memory ledger")

    mode_val = OperatingMode.HITL_HIGH_TIER if req.mode == "HITL_HIGH_TIER" else OperatingMode.FULL_AUTO
    _ensure_agent(req.agent_id, mode=mode_val)

    entries = _generate_chains(req.agent_id, req.chain_count, req.success_ratio, req.consequence)
    ledger_client.seed(entries)

    return {
        "status": "seeded",
        "agent_id": req.agent_id,
        "chains": req.chain_count,
        "success_ratio": req.success_ratio,
        "mode": req.mode,
    }


@app.post("/api/v1/demo/seed/{layer}")
async def seed_layer(layer: str) -> dict[str, Any]:
    if not isinstance(ledger_client, InMemoryLedgerClient):
        raise HTTPException(status_code=400, detail="Seeding only works with in-memory ledger")

    agent_id = "ops-agent"

    if layer == "hook":
        _ensure_agent(agent_id)
        return {"status": "seeded", "layer": layer, "chains": 0}

    elif layer == "earn":
        _ensure_agent(agent_id)
        entries = _generate_chains(agent_id, 55, success_ratio=0.91)
        ledger_client.seed(entries)
        return {"status": "seeded", "layer": layer, "chains": 55}

    elif layer == "depth":
        auth = _ensure_agent(agent_id, mode=OperatingMode.HITL_HIGH_TIER)
        auth.tier = AuthorityTier.T2
        auth.consequence_ceiling = get_tier_ceiling(config, "T2")
        auth.mode = OperatingMode.HITL_HIGH_TIER
        gate.register(auth)
        entries = _generate_chains(agent_id, 510, success_ratio=0.87)
        ledger_client.seed(entries)
        return {"status": "seeded", "layer": layer, "chains": 510}

    elif layer == "floor":
        auth = _ensure_agent(agent_id)
        auth.tier = AuthorityTier.T3
        auth.consequence_ceiling = get_tier_ceiling(config, "T3")
        gate.register(auth)
        entries = _generate_chains(agent_id, 500, success_ratio=0.92, consequence=80.0)
        falsified_corr = "seed-ops-agent-falsified"
        entries.append({
            "entry_type": "fleet.action.scale",
            "agent_id": agent_id,
            "content": '{"consequence_score": 100.0}',
            "content_type": "application/json",
            "source_id": "demo-seed",
            "correlation_id": falsified_corr,
        })
        entries.append({
            "entry_type": "fleet.outcome.falsified",
            "agent_id": agent_id,
            "content": "falsified",
            "content_type": "text/plain",
            "source_id": "demo-seed",
            "correlation_id": falsified_corr,
        })
        ledger_client.seed(entries)
        return {"status": "seeded", "layer": layer, "chains": 501, "falsified_chain": falsified_corr}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown layer: {layer}")


@app.post("/api/v1/demo/reset")
async def reset_demo() -> dict[str, Any]:
    authority_store.clear()
    gate.store.clear()
    ratification_queue.pending.clear()
    if isinstance(ledger_client, InMemoryLedgerClient):
        ledger_client.entries.clear()
    return {"status": "reset"}

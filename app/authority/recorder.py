"""LedgerRecorder: writes every authority change to the ARE Immutable Ledger.

Every promotion, demotion, gate refusal, and ratification decision is recorded
with a correlation_id so the authority history of any agent is reconstructable.
"""

from __future__ import annotations

from typing import Optional
from uuid import uuid4

from app.domain.models import (
    AuthorityDecision,
    DemotionEvent,
    GateVerdict,
    LedgerEntry,
    PromotionEvent,
    RatificationRequest,
    RatificationStatus,
)
from app.ledger.client import LedgerClient


class LedgerRecorder:
    """Records authority decisions in the ARE Immutable Ledger."""

    def __init__(self, ledger: LedgerClient):
        self.ledger = ledger

    async def record_promotion(self, event: PromotionEvent) -> bool:
        entry = LedgerEntry(
            entry_type="authority.promotion",
            agent_id=event.agent_id,
            content=event.model_dump_json(),
            correlation_id=str(event.id),
        )
        return await self.ledger.write_entry(entry)

    async def record_demotion(self, event: DemotionEvent) -> bool:
        correlation = event.falsified_correlation_id or str(event.id)
        entry = LedgerEntry(
            entry_type="authority.demotion",
            agent_id=event.agent_id,
            content=event.model_dump_json(),
            correlation_id=correlation,
        )
        return await self.ledger.write_entry(entry)

    async def record_gate_decision(self, decision: AuthorityDecision) -> bool:
        if decision.verdict == GateVerdict.ALLOW:
            return True

        entry_type = (
            "authority.gate.route_human"
            if decision.verdict == GateVerdict.ROUTE_HUMAN
            else "authority.gate.refuse"
        )
        entry = LedgerEntry(
            entry_type=entry_type,
            agent_id=decision.agent_id,
            content=decision.model_dump_json(),
            correlation_id=decision.action_id,
        )
        return await self.ledger.write_entry(entry)

    async def record_ratification(
        self,
        request: RatificationRequest,
        approved: bool,
        decided_by: str,
    ) -> bool:
        entry_type = (
            "authority.ratification.approved"
            if approved
            else "authority.ratification.rejected"
        )
        entry = LedgerEntry(
            entry_type=entry_type,
            agent_id=request.agent_id,
            content=request.model_dump_json(),
            correlation_id=str(request.id),
        )
        return await self.ledger.write_entry(entry)

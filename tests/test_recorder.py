"""TDD tests for LedgerRecorder (M6).

Tests: provenance recording for promotions, demotions, gate decisions, ratifications.
"""

from __future__ import annotations

import pytest

from app.authority.recorder import LedgerRecorder
from app.domain.models import (
    AuthorityTier,
    DemotionTriggerType,
    GateVerdict,
    RatificationStatus,
)
from app.ledger.client import InMemoryLedgerClient
from tests.conftest import (
    make_authority_decision,
    make_demotion_event,
    make_promotion_event,
    make_ratification_request,
)


@pytest.fixture
def ledger():
    return InMemoryLedgerClient()


@pytest.fixture
def recorder(ledger):
    return LedgerRecorder(ledger)


@pytest.mark.asyncio
class TestRecordPromotion:
    async def test_writes_entry(self, recorder, ledger):
        event = make_promotion_event()
        result = await recorder.record_promotion(event)
        assert result is True
        assert len(ledger.entries) == 1
        assert ledger.entries[0]["entry_type"] == "authority.promotion"

    async def test_includes_correlation_id(self, recorder, ledger):
        event = make_promotion_event()
        await recorder.record_promotion(event)
        assert ledger.entries[0]["correlation_id"] == str(event.id)

    async def test_includes_agent_id(self, recorder, ledger):
        event = make_promotion_event(agent_id="my-agent")
        await recorder.record_promotion(event)
        assert ledger.entries[0]["agent_id"] == "my-agent"


@pytest.mark.asyncio
class TestRecordDemotion:
    async def test_writes_entry(self, recorder, ledger):
        event = make_demotion_event()
        result = await recorder.record_demotion(event)
        assert result is True
        assert ledger.entries[0]["entry_type"] == "authority.demotion"

    async def test_uses_falsified_correlation_id(self, recorder, ledger):
        event = make_demotion_event(falsified_correlation_id="chain-xyz")
        await recorder.record_demotion(event)
        assert ledger.entries[0]["correlation_id"] == "chain-xyz"

    async def test_falls_back_to_event_id_if_no_falsified(self, recorder, ledger):
        event = make_demotion_event(
            trigger=DemotionTriggerType.MAINTENANCE_BREACH,
            falsified_correlation_id=None,
        )
        await recorder.record_demotion(event)
        assert ledger.entries[0]["correlation_id"] == str(event.id)


@pytest.mark.asyncio
class TestRecordGateDecision:
    async def test_refuse_writes_entry(self, recorder, ledger):
        decision = make_authority_decision(
            verdict=GateVerdict.REFUSE,
            action_id="act-123",
        )
        await recorder.record_gate_decision(decision)
        assert len(ledger.entries) == 1
        assert ledger.entries[0]["entry_type"] == "authority.gate.refuse"
        assert ledger.entries[0]["correlation_id"] == "act-123"

    async def test_route_human_writes_entry(self, recorder, ledger):
        decision = make_authority_decision(verdict=GateVerdict.ROUTE_HUMAN)
        await recorder.record_gate_decision(decision)
        assert ledger.entries[0]["entry_type"] == "authority.gate.route_human"

    async def test_allow_does_not_write(self, recorder, ledger):
        decision = make_authority_decision(verdict=GateVerdict.ALLOW)
        await recorder.record_gate_decision(decision)
        assert len(ledger.entries) == 0


@pytest.mark.asyncio
class TestRecordRatification:
    async def test_approved_writes_entry(self, recorder, ledger):
        req = make_ratification_request()
        await recorder.record_ratification(req, approved=True, decided_by="admin")
        assert len(ledger.entries) == 1
        assert ledger.entries[0]["entry_type"] == "authority.ratification.approved"

    async def test_rejected_writes_entry(self, recorder, ledger):
        req = make_ratification_request()
        await recorder.record_ratification(req, approved=False, decided_by="admin")
        assert ledger.entries[0]["entry_type"] == "authority.ratification.rejected"

    async def test_correlation_id_is_request_id(self, recorder, ledger):
        req = make_ratification_request()
        await recorder.record_ratification(req, approved=True, decided_by="admin")
        assert ledger.entries[0]["correlation_id"] == str(req.id)


@pytest.mark.asyncio
class TestProvenance:
    async def test_full_agent_history_reconstructable(self, recorder, ledger):
        promo = make_promotion_event(agent_id="agent-X")
        await recorder.record_promotion(promo)

        decision = make_authority_decision(
            agent_id="agent-X",
            verdict=GateVerdict.REFUSE,
        )
        await recorder.record_gate_decision(decision)

        demotion = make_demotion_event(agent_id="agent-X")
        await recorder.record_demotion(demotion)

        history = await ledger.query_by_agent("agent-X")
        assert len(history) == 3
        types = [e["entry_type"] for e in history]
        assert "authority.promotion" in types
        assert "authority.gate.refuse" in types
        assert "authority.demotion" in types

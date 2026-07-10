"""EDD rubric grid tests.

Each dimension from the rubric must be green (passing) for the system to be valid.
Red = fails outright. Yellow = partially correct. Green = fully correct.
"""

from __future__ import annotations

import pytest

from app.authority.demotion import DemotionTrigger
from app.authority.evaluator import PromotionEvaluator
from app.authority.gate import AuthorityGate
from app.authority.mode import ModeController
from app.authority.ratification import RatificationQueue
from app.domain.config import load_config
from app.domain.models import (
    AgentAuthority,
    AuthorityTier,
    ChainResult,
    DemotionEvent,
    GateVerdict,
    OperatingMode,
    PromotionEvent,
    RatificationRequest,
)
from tests.conftest import make_authority, make_chain_link, make_track_record


@pytest.fixture
def config():
    return load_config()


class TestPromotionRequiresMinChains:
    """GREEN: Never promotes below configured chain count."""

    def test_49_chains_at_t0_does_not_promote(self, config):
        evaluator = PromotionEvaluator(config)
        auth = make_authority(tier=AuthorityTier.T0)
        record = make_track_record(successes=49, failures=0)
        assert evaluator.evaluate(record, auth) is None

    def test_50_chains_at_t0_promotes(self, config):
        evaluator = PromotionEvaluator(config)
        auth = make_authority(tier=AuthorityTier.T0)
        record = make_track_record(successes=40, failures=10, rolling_accuracy=0.80)
        assert isinstance(evaluator.evaluate(record, auth), PromotionEvent)


class TestPromotionRequiresAccuracy:
    """GREEN: Uses rolling windowed accuracy at or above threshold."""

    def test_below_accuracy_does_not_promote(self, config):
        evaluator = PromotionEvaluator(config)
        auth = make_authority(tier=AuthorityTier.T0)
        record = make_track_record(successes=28, failures=22, rolling_accuracy=0.56)
        assert evaluator.evaluate(record, auth) is None

    def test_at_accuracy_promotes(self, config):
        evaluator = PromotionEvaluator(config)
        auth = make_authority(tier=AuthorityTier.T0)
        record = make_track_record(successes=30, failures=20, rolling_accuracy=0.60)
        assert isinstance(evaluator.evaluate(record, auth), PromotionEvent)


class TestDemotionOnFalsification:
    """GREEN: Demotes immediately on a falsified at-or-above-ceiling action."""

    def test_immediate_demotion(self, config):
        trigger = DemotionTrigger(config)
        auth = make_authority(tier=AuthorityTier.T2, ceiling=50.0)
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=50.0)
        record = make_track_record(
            successes=190, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(190)] + [chain],
        )
        result = trigger.check(record, auth)
        assert isinstance(result, DemotionEvent)
        assert result.to_tier == AuthorityTier.T1


class TestDemotionBypassesHITL:
    """GREEN: Demotes automatically in both modes, always."""

    def test_full_auto(self, config):
        trigger = DemotionTrigger(config)
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0, mode=OperatingMode.FULL_AUTO)
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=25.0)
        record = make_track_record(
            successes=49, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(49)] + [chain],
        )
        assert isinstance(trigger.check(record, auth), DemotionEvent)

    def test_hitl_high_tier(self, config):
        trigger = DemotionTrigger(config)
        auth = make_authority(tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.HITL_HIGH_TIER)
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=100.0)
        record = make_track_record(
            successes=490, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(490)] + [chain],
        )
        assert isinstance(trigger.check(record, auth), DemotionEvent)


class TestGateRefusesAboveCeiling:
    """GREEN: Refuses or routes before any execution."""

    def test_above_ceiling_refused(self, config):
        gate = AuthorityGate()
        gate.register(make_authority(agent_id="g1", tier=AuthorityTier.T1, ceiling=25.0))
        decision = gate.check("g1", "act-1", 30.0)
        assert decision.verdict == GateVerdict.REFUSE

    def test_at_ceiling_allowed(self, config):
        gate = AuthorityGate()
        gate.register(make_authority(agent_id="g1", tier=AuthorityTier.T1, ceiling=25.0))
        decision = gate.check("g1", "act-1", 25.0)
        assert decision.verdict == GateVerdict.ALLOW


class TestHITLHighTierPromotionQueues:
    """GREEN: Queues a case and applies only after human decision."""

    def test_t2_to_t3_queues_in_hitl(self, config):
        evaluator = PromotionEvaluator(config)
        auth = make_authority(
            tier=AuthorityTier.T2, ceiling=50.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=440, failures=60)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, RatificationRequest)


class TestT4EntryAlwaysRatified:
    """GREEN: Always requires human ratification for T4 regardless of mode."""

    def test_full_auto_still_queues_t4(self, config):
        evaluator = PromotionEvaluator(config)
        auth = make_authority(
            tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.FULL_AUTO,
        )
        record = make_track_record(successes=920, failures=80)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, RatificationRequest)
        assert result.target_tier == AuthorityTier.T4

    def test_hitl_queues_t4(self, config):
        evaluator = PromotionEvaluator(config)
        auth = make_authority(
            tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=920, failures=80)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, RatificationRequest)
        assert result.target_tier == AuthorityTier.T4


class TestProvenanceRecording:
    """GREEN: Every change recorded with correlation id and reconstructable."""

    @pytest.mark.asyncio
    async def test_promotion_recorded_with_provenance(self, config):
        from app.authority.recorder import LedgerRecorder
        from app.ledger.client import InMemoryLedgerClient
        from tests.conftest import make_promotion_event

        ledger = InMemoryLedgerClient()
        recorder = LedgerRecorder(ledger)
        event = make_promotion_event()
        await recorder.record_promotion(event)

        entries = await ledger.query_by_agent(event.agent_id)
        assert len(entries) == 1
        assert entries[0]["correlation_id"] == str(event.id)
        assert entries[0]["entry_type"] == "authority.promotion"

    @pytest.mark.asyncio
    async def test_demotion_recorded_with_provenance(self, config):
        from app.authority.recorder import LedgerRecorder
        from app.ledger.client import InMemoryLedgerClient
        from tests.conftest import make_demotion_event

        ledger = InMemoryLedgerClient()
        recorder = LedgerRecorder(ledger)
        event = make_demotion_event(falsified_correlation_id="bad-chain")
        await recorder.record_demotion(event)

        entries = await ledger.query_by_agent(event.agent_id)
        assert len(entries) == 1
        assert entries[0]["correlation_id"] == "bad-chain"

    @pytest.mark.asyncio
    async def test_gate_refusal_recorded(self, config):
        from app.authority.recorder import LedgerRecorder
        from app.ledger.client import InMemoryLedgerClient
        from tests.conftest import make_authority_decision

        ledger = InMemoryLedgerClient()
        recorder = LedgerRecorder(ledger)
        decision = make_authority_decision(
            verdict=GateVerdict.REFUSE, action_id="blocked-act",
        )
        await recorder.record_gate_decision(decision)

        entries = await ledger.query_by_agent(decision.agent_id)
        assert len(entries) == 1
        assert entries[0]["correlation_id"] == "blocked-act"

"""BDD scenario tests: earn, revoke, and refuse in both modes.

Given/When/Then style tests exercising the three visible behaviors.
"""

from __future__ import annotations

import pytest

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
    AuthorityTier,
    ChainResult,
    DemotionEvent,
    GateVerdict,
    OperatingMode,
    PromotionEvent,
    RatificationRequest,
)
from app.ledger.client import InMemoryLedgerClient
from tests.conftest import make_chain_link, make_track_record


def _seed_success_chains(ledger, agent_id, count):
    for i in range(count):
        corr = f"chain-{agent_id}-{i}"
        ledger.seed([
            {"entry_type": "fleet.prediction.scale", "agent_id": agent_id,
             "content": "{}", "content_type": "application/json",
             "source_id": "test", "correlation_id": corr},
            {"entry_type": "fleet.intent.scale", "agent_id": agent_id,
             "content": "{}", "content_type": "application/json",
             "source_id": "test", "correlation_id": corr},
            {"entry_type": "fleet.outcome.confirmed", "agent_id": agent_id,
             "content": "{}", "content_type": "application/json",
             "source_id": "test", "correlation_id": corr},
        ])


class TestEarnInFullAuto:
    """Given an agent with a clean verified record in FULL_AUTO mode,
    when the track record meets promotion criteria,
    then the agent is promoted and its ceiling rises."""

    @pytest.mark.asyncio
    async def test_given_clean_record_when_criteria_met_then_promoted(self):
        config = load_config()
        ledger = InMemoryLedgerClient()
        _seed_success_chains(ledger, "earner", 55)

        assembler = TrackRecordAssembler(ledger, config)
        controller = ModeController(
            PromotionEvaluator(config),
            DemotionTrigger(config),
        )

        auth = AgentAuthority(
            agent_id="earner", tier=AuthorityTier.T0,
            consequence_ceiling=0.0, mode=OperatingMode.FULL_AUTO,
        )

        record = await assembler.assemble("earner")
        result = controller.evaluate(record, auth)

        assert isinstance(result, PromotionEvent)
        assert result.from_tier == AuthorityTier.T0
        assert result.to_tier == AuthorityTier.T1
        assert get_tier_ceiling(config, "T1") > 0.0


class TestEarnInHITL:
    """Given an agent in HITL_HIGH_TIER mode,
    when the track record meets T2->T3 criteria,
    then a ratification request is queued (not auto-promoted)."""

    @pytest.mark.asyncio
    async def test_given_hitl_mode_when_high_tier_then_ratification_queued(self):
        config = load_config()
        ledger = InMemoryLedgerClient()
        _seed_success_chains(ledger, "hitl-earner", 510)

        assembler = TrackRecordAssembler(ledger, config)
        evaluator = PromotionEvaluator(config)

        auth = AgentAuthority(
            agent_id="hitl-earner", tier=AuthorityTier.T2,
            consequence_ceiling=50.0, mode=OperatingMode.HITL_HIGH_TIER,
        )

        record = await assembler.assemble("hitl-earner")
        result = evaluator.evaluate(record, auth)

        assert isinstance(result, RatificationRequest)
        assert result.target_tier == AuthorityTier.T3


class TestRevokeOnFalsifiedAction:
    """Given an agent at T2 whose action is falsified,
    when the falsified action's consequence is at or above ceiling,
    then the agent is immediately demoted regardless of mode."""

    def test_given_falsified_at_ceiling_when_checked_then_demoted_full_auto(self):
        config = load_config()
        auth = AgentAuthority(
            agent_id="revoker", tier=AuthorityTier.T2,
            consequence_ceiling=50.0, mode=OperatingMode.FULL_AUTO,
        )

        chain = make_chain_link(ChainResult.FAILURE, consequence_score=50.0)
        record = make_track_record(
            agent_id="revoker", successes=190, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(190)] + [chain],
        )

        controller = ModeController(
            PromotionEvaluator(config),
            DemotionTrigger(config),
        )
        result = controller.evaluate(record, auth)

        assert isinstance(result, DemotionEvent)
        assert result.from_tier == AuthorityTier.T2
        assert result.to_tier == AuthorityTier.T1

    def test_given_falsified_at_ceiling_when_checked_then_demoted_hitl(self):
        config = load_config()
        auth = AgentAuthority(
            agent_id="revoker-hitl", tier=AuthorityTier.T3,
            consequence_ceiling=100.0, mode=OperatingMode.HITL_HIGH_TIER,
        )

        chain = make_chain_link(ChainResult.FAILURE, consequence_score=100.0)
        record = make_track_record(
            agent_id="revoker-hitl", successes=490, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(490)] + [chain],
        )

        controller = ModeController(
            PromotionEvaluator(config),
            DemotionTrigger(config),
        )
        result = controller.evaluate(record, auth)

        assert isinstance(result, DemotionEvent)
        assert result.to_tier == AuthorityTier.T2


class TestRefuseAboveCeiling:
    """Given an agent at T1 attempting an action above its ceiling,
    when the gate is checked,
    then the action is refused, never silently allowed."""

    def test_given_t1_agent_when_above_ceiling_then_refused(self):
        gate = AuthorityGate()
        auth = AgentAuthority(
            agent_id="refused-agent", tier=AuthorityTier.T1,
            consequence_ceiling=25.0, mode=OperatingMode.FULL_AUTO,
        )
        gate.register(auth)

        decision = gate.check("refused-agent", "dangerous-action", 60.0)

        assert decision.verdict == GateVerdict.REFUSE
        assert decision.requested_consequence == 60.0
        assert decision.ceiling == 25.0

    def test_given_t0_agent_when_any_action_then_routed(self):
        gate = AuthorityGate()
        auth = AgentAuthority(
            agent_id="probation-agent", tier=AuthorityTier.T0,
            consequence_ceiling=0.0, mode=OperatingMode.FULL_AUTO,
        )
        gate.register(auth)

        decision = gate.check("probation-agent", "any-action", 5.0)

        assert decision.verdict == GateVerdict.ROUTE_HUMAN


class TestRatificationApprovalFlow:
    """Given a pending ratification,
    when a human approves it,
    then the promotion is applied and recorded."""

    @pytest.mark.asyncio
    async def test_given_pending_when_approved_then_applied(self):
        config = load_config()
        queue = RatificationQueue(config)
        recorder = LedgerRecorder(InMemoryLedgerClient())

        record = make_track_record(successes=510, failures=40)
        req = queue.queue("approval-agent", AuthorityTier.T3, record)

        result = queue.decide(req.id, approved=True, decided_by="human-admin")

        assert isinstance(result, PromotionEvent)
        assert result.to_tier == AuthorityTier.T3
        assert result.ratified_by == "human-admin"

        await recorder.record_promotion(result)


class TestRatificationRejectionFlow:
    """Given a pending ratification,
    when a human rejects it,
    then the promotion is discarded with no state change."""

    @pytest.mark.asyncio
    async def test_given_pending_when_rejected_then_no_change(self):
        config = load_config()
        queue = RatificationQueue(config)

        record = make_track_record(successes=510, failures=40)
        req = queue.queue("reject-agent", AuthorityTier.T3, record)

        result = queue.decide(req.id, approved=False, decided_by="human-admin")
        assert result is None
        assert len(queue.list_pending()) == 0

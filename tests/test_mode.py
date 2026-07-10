"""TDD tests for ModeController (M5).

Tests: demotion priority, mode-aware promotion, integration with evaluator and trigger.
"""

from __future__ import annotations

import pytest

from app.authority.demotion import DemotionTrigger
from app.authority.evaluator import PromotionEvaluator
from app.authority.mode import ModeController
from app.domain.config import load_config
from app.domain.models import (
    AuthorityTier,
    ChainResult,
    DemotionEvent,
    OperatingMode,
    PromotionEvent,
    RatificationRequest,
)
from tests.conftest import make_authority, make_chain_link, make_track_record


@pytest.fixture
def config():
    return load_config()


@pytest.fixture
def controller(config):
    return ModeController(
        evaluator=PromotionEvaluator(config),
        demotion_trigger=DemotionTrigger(config),
    )


class TestDemotionPriority:
    def test_demotion_takes_priority_over_promotion(self, controller):
        auth = make_authority(
            tier=AuthorityTier.T1, ceiling=25.0, mode=OperatingMode.FULL_AUTO,
        )
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=25.0)
        record = make_track_record(
            successes=190, failures=10,
            rolling_accuracy=0.95,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(190)]
                   + [chain]
                   + [make_chain_link(ChainResult.FAILURE) for _ in range(9)],
        )
        result = controller.evaluate(record, auth)
        assert isinstance(result, DemotionEvent)

    def test_demotion_in_hitl_mode_is_automatic(self, controller):
        auth = make_authority(
            tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=100.0)
        record = make_track_record(
            successes=900, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(900)] + [chain],
        )
        result = controller.evaluate(record, auth)
        assert isinstance(result, DemotionEvent)


class TestModeAwarePromotion:
    def test_full_auto_promotes_t2_to_t3(self, controller):
        auth = make_authority(
            tier=AuthorityTier.T2, ceiling=50.0, mode=OperatingMode.FULL_AUTO,
        )
        record = make_track_record(successes=440, failures=60)
        result = controller.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)
        assert result.to_tier == AuthorityTier.T3

    def test_hitl_queues_t2_to_t3(self, controller):
        auth = make_authority(
            tier=AuthorityTier.T2, ceiling=50.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=440, failures=60)
        result = controller.evaluate(record, auth)
        assert isinstance(result, RatificationRequest)

    def test_hitl_auto_promotes_low_tiers(self, controller):
        auth = make_authority(
            tier=AuthorityTier.T0, ceiling=0.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=35, failures=15)
        result = controller.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)


class TestNoChangeScenarios:
    def test_no_change_when_below_thresholds(self, controller):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=10, failures=5)
        result = controller.evaluate(record, auth)
        assert result is None

    def test_no_change_for_t4_at_max(self, controller):
        auth = make_authority(tier=AuthorityTier.T4, ceiling=1000.0)
        record = make_track_record(successes=1000, failures=0)
        result = controller.evaluate(record, auth)
        assert result is None

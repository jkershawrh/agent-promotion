"""TDD tests for PromotionEvaluator (M2).

Tests: threshold enforcement, HITL queuing, T4 always ratified, no tier skipping.
"""

from __future__ import annotations

import pytest

from app.authority.evaluator import PromotionEvaluator
from app.domain.config import load_config
from app.domain.models import (
    AuthorityTier,
    OperatingMode,
    PromotionEvent,
    RatificationRequest,
)
from tests.conftest import make_authority, make_track_record


@pytest.fixture
def evaluator():
    return PromotionEvaluator(load_config())


class TestPromotionThresholds:
    def test_below_chain_threshold_no_promotion(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=30, failures=10)
        result = evaluator.evaluate(record, auth)
        assert result is None

    def test_below_accuracy_threshold_no_promotion(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=25, failures=25)
        result = evaluator.evaluate(record, auth)
        assert result is None

    def test_at_t0_to_t1_threshold_promotes(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=35, failures=15)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)
        assert result.from_tier == AuthorityTier.T0
        assert result.to_tier == AuthorityTier.T1

    def test_t1_to_t2_threshold(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0)
        record = make_track_record(successes=160, failures=40)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)
        assert result.to_tier == AuthorityTier.T2

    def test_t1_below_accuracy_no_promotion(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0)
        record = make_track_record(successes=140, failures=60)
        result = evaluator.evaluate(record, auth)
        assert result is None

    def test_exact_boundary_accuracy(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(
            successes=30, failures=20,
            rolling_accuracy=0.60,
        )
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)

    def test_just_below_boundary_accuracy(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(
            successes=30, failures=20,
            rolling_accuracy=0.59,
        )
        result = evaluator.evaluate(record, auth)
        assert result is None


class TestHITLQueuing:
    def test_t2_to_t3_full_auto_promotes(self, evaluator):
        auth = make_authority(
            tier=AuthorityTier.T2, ceiling=50.0, mode=OperatingMode.FULL_AUTO,
        )
        record = make_track_record(successes=440, failures=60)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)
        assert result.to_tier == AuthorityTier.T3

    def test_t2_to_t3_hitl_queues_ratification(self, evaluator):
        auth = make_authority(
            tier=AuthorityTier.T2, ceiling=50.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=440, failures=60)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, RatificationRequest)
        assert result.target_tier == AuthorityTier.T3
        assert result.case.chain_count == 500

    def test_t0_to_t1_hitl_auto_promotes(self, evaluator):
        auth = make_authority(
            tier=AuthorityTier.T0, ceiling=0.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=35, failures=15)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)

    def test_t1_to_t2_hitl_auto_promotes(self, evaluator):
        auth = make_authority(
            tier=AuthorityTier.T1, ceiling=25.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=160, failures=40)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)


class TestT4AlwaysRatified:
    def test_t3_to_t4_full_auto_queues(self, evaluator):
        auth = make_authority(
            tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.FULL_AUTO,
        )
        record = make_track_record(successes=920, failures=80)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, RatificationRequest)
        assert result.target_tier == AuthorityTier.T4

    def test_t3_to_t4_hitl_queues(self, evaluator):
        auth = make_authority(
            tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=920, failures=80)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, RatificationRequest)
        assert result.target_tier == AuthorityTier.T4


class TestNoTierSkipping:
    def test_t4_cannot_promote_further(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T4, ceiling=1000.0)
        record = make_track_record(successes=1000, failures=0)
        result = evaluator.evaluate(record, auth)
        assert result is None

    def test_promotion_is_single_step(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=950, failures=50)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)
        assert result.to_tier == AuthorityTier.T1


class TestPromotionEventShape:
    def test_includes_evidence_ids(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=40, failures=10)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)
        assert len(result.evidence_correlation_ids) > 0

    def test_includes_reason(self, evaluator):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=40, failures=10)
        result = evaluator.evaluate(record, auth)
        assert isinstance(result, PromotionEvent)
        assert "chains" in result.reason
        assert "accuracy" in result.reason

"""TDD tests for DemotionTrigger (M3).

Tests: falsification detection, ceiling check, maintenance threshold, bypasses HITL.
"""

from __future__ import annotations

import pytest

from app.authority.demotion import DemotionTrigger
from app.domain.config import load_config
from app.domain.models import (
    AuthorityTier,
    ChainResult,
    DemotionTriggerType,
    OperatingMode,
)
from tests.conftest import make_authority, make_chain_link, make_track_record


@pytest.fixture
def trigger():
    return DemotionTrigger(load_config())


class TestFalsifiedAction:
    def test_falsified_at_ceiling_demotes(self, trigger):
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0)
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=25.0)
        record = make_track_record(
            successes=40, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(40)] + [chain],
        )
        result = trigger.check(record, auth)
        assert result is not None
        assert result.trigger == DemotionTriggerType.FALSIFIED_ACTION
        assert result.from_tier == AuthorityTier.T1
        assert result.to_tier == AuthorityTier.T0
        assert result.falsified_correlation_id == chain.correlation_id

    def test_falsified_above_ceiling_demotes(self, trigger):
        auth = make_authority(tier=AuthorityTier.T2, ceiling=50.0)
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=75.0)
        record = make_track_record(
            successes=40, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(40)] + [chain],
        )
        result = trigger.check(record, auth)
        assert result is not None
        assert result.from_tier == AuthorityTier.T2
        assert result.to_tier == AuthorityTier.T1

    def test_falsified_below_ceiling_no_demotion(self, trigger):
        auth = make_authority(tier=AuthorityTier.T2, ceiling=50.0)
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=10.0)
        record = make_track_record(
            successes=190, failures=1,
            rolling_accuracy=0.99,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(190)] + [chain],
        )
        result = trigger.check(record, auth)
        assert result is None

    def test_falsified_no_consequence_score_no_demotion(self, trigger):
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0)
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=None)
        record = make_track_record(
            successes=49, failures=1,
            rolling_accuracy=0.98,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(49)] + [chain],
        )
        result = trigger.check(record, auth)
        assert result is None


class TestMaintenanceThreshold:
    def test_accuracy_below_threshold_demotes(self, trigger):
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0)
        record = make_track_record(successes=24, failures=26, rolling_accuracy=0.48)
        result = trigger.check(record, auth)
        assert result is not None
        assert result.trigger == DemotionTriggerType.MAINTENANCE_BREACH
        assert result.from_tier == AuthorityTier.T1
        assert result.to_tier == AuthorityTier.T0

    def test_accuracy_at_threshold_no_demotion(self, trigger):
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0)
        record = make_track_record(successes=25, failures=25, rolling_accuracy=0.50)
        result = trigger.check(record, auth)
        assert result is None

    def test_accuracy_above_threshold_no_demotion(self, trigger):
        auth = make_authority(tier=AuthorityTier.T2, ceiling=50.0)
        record = make_track_record(successes=170, failures=30, rolling_accuracy=0.85)
        result = trigger.check(record, auth)
        assert result is None

    def test_empty_record_no_demotion(self, trigger):
        auth = make_authority(tier=AuthorityTier.T1, ceiling=25.0)
        record = make_track_record()
        result = trigger.check(record, auth)
        assert result is None


class TestT0CannotDemoteFurther:
    def test_t0_returns_none(self, trigger):
        auth = make_authority(tier=AuthorityTier.T0, ceiling=0.0)
        record = make_track_record(successes=0, failures=10, rolling_accuracy=0.0)
        result = trigger.check(record, auth)
        assert result is None


class TestDemotionBypassesHITL:
    def test_full_auto_demotes(self, trigger):
        auth = make_authority(
            tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.FULL_AUTO,
        )
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=100.0)
        record = make_track_record(
            successes=490, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(490)] + [chain],
        )
        result = trigger.check(record, auth)
        assert result is not None
        assert result.to_tier == AuthorityTier.T2

    def test_hitl_still_demotes_automatically(self, trigger):
        auth = make_authority(
            tier=AuthorityTier.T3, ceiling=100.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        chain = make_chain_link(ChainResult.FAILURE, consequence_score=100.0)
        record = make_track_record(
            successes=490, failures=1,
            chains=[make_chain_link(ChainResult.SUCCESS) for _ in range(490)] + [chain],
        )
        result = trigger.check(record, auth)
        assert result is not None
        assert result.to_tier == AuthorityTier.T2

    def test_hitl_maintenance_demotes_automatically(self, trigger):
        auth = make_authority(
            tier=AuthorityTier.T2, ceiling=50.0, mode=OperatingMode.HITL_HIGH_TIER,
        )
        record = make_track_record(successes=120, failures=80, rolling_accuracy=0.60)
        result = trigger.check(record, auth)
        assert result is not None
        assert result.trigger == DemotionTriggerType.MAINTENANCE_BREACH

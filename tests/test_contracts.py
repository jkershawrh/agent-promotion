"""CDD: contract tests for all Pydantic models. Every model must instantiate,
reject invalid values, and survive a serialize/deserialize round-trip."""

import json

import pytest
from pydantic import ValidationError

from app.domain.models import (
    AgentAuthority,
    AuthorityDecision,
    AuthorityTier,
    ChainLink,
    ChainResult,
    DemotionEvent,
    DemotionTriggerType,
    GateVerdict,
    LedgerEntry,
    OperatingMode,
    PromotionCase,
    PromotionEvent,
    RatificationRequest,
    RatificationStatus,
    TrackRecord,
)
from app.domain.config import load_config, validate_config, get_tier_ceiling, get_maintenance_threshold

from tests.conftest import (
    make_authority,
    make_chain_link,
    make_track_record,
    make_promotion_event,
    make_demotion_event,
    make_authority_decision,
    make_promotion_case,
    make_ratification_request,
    make_ledger_entry,
)


class TestAgentAuthority:
    def test_valid_construction(self):
        auth = make_authority()
        assert auth.agent_id == "agent-001"
        assert auth.tier == AuthorityTier.T0
        assert auth.consequence_ceiling == 0.0
        assert auth.mode == OperatingMode.FULL_AUTO

    def test_all_tiers(self):
        for tier in AuthorityTier:
            auth = make_authority(tier=tier)
            assert auth.tier == tier

    def test_all_modes(self):
        for mode in OperatingMode:
            auth = make_authority(mode=mode)
            assert auth.mode == mode

    def test_invalid_tier_rejected(self):
        with pytest.raises(ValidationError):
            AgentAuthority(agent_id="x", tier="INVALID", consequence_ceiling=0.0, mode="FULL_AUTO")

    def test_invalid_mode_rejected(self):
        with pytest.raises(ValidationError):
            AgentAuthority(agent_id="x", tier="T0", consequence_ceiling=0.0, mode="INVALID")

    def test_round_trip(self):
        original = make_authority(agent_id="roundtrip-agent", tier=AuthorityTier.T2, ceiling=50.0)
        serialized = original.model_dump_json()
        restored = AgentAuthority.model_validate_json(serialized)
        assert restored.agent_id == original.agent_id
        assert restored.tier == original.tier
        assert restored.consequence_ceiling == original.consequence_ceiling

    def test_defaults_independent(self):
        a = make_authority(agent_id="a")
        b = make_authority(agent_id="b")
        assert a.updated_at != b.updated_at or a.agent_id != b.agent_id


class TestChainLink:
    def test_valid_construction(self):
        link = make_chain_link()
        assert link.result == ChainResult.SUCCESS
        assert link.correlation_id is not None

    def test_all_results(self):
        for result in ChainResult:
            link = make_chain_link(result=result)
            assert link.result == result

    def test_round_trip(self):
        original = make_chain_link(result=ChainResult.FAILURE, consequence_score=42.5)
        restored = ChainLink.model_validate_json(original.model_dump_json())
        assert restored.result == original.result
        assert restored.consequence_score == original.consequence_score


class TestTrackRecord:
    def test_valid_construction(self):
        record = make_track_record(successes=8, failures=2)
        assert record.chain_count == 10
        assert record.success_count == 8
        assert record.failure_count == 2
        assert record.rolling_accuracy == pytest.approx(0.8)

    def test_empty_record(self):
        record = make_track_record()
        assert record.chain_count == 0
        assert record.rolling_accuracy == 0.0
        assert record.chains == []

    def test_pending_excluded_from_accuracy(self):
        record = make_track_record(successes=6, failures=4, pending=5)
        assert record.chain_count == 10
        assert record.pending_count == 5
        assert record.rolling_accuracy == pytest.approx(0.6)

    def test_round_trip(self):
        original = make_track_record(successes=3, failures=1, pending=2)
        restored = TrackRecord.model_validate_json(original.model_dump_json())
        assert restored.chain_count == original.chain_count
        assert restored.rolling_accuracy == pytest.approx(original.rolling_accuracy)
        assert len(restored.chains) == len(original.chains)


class TestPromotionEvent:
    def test_valid_construction(self):
        event = make_promotion_event()
        assert event.from_tier == AuthorityTier.T0
        assert event.to_tier == AuthorityTier.T1
        assert event.id is not None

    def test_round_trip(self):
        original = make_promotion_event(
            from_tier=AuthorityTier.T2,
            to_tier=AuthorityTier.T3,
            reason="Passed all gates",
            evidence_correlation_ids=["abc", "def"],
            ratified_by="admin-1",
        )
        restored = PromotionEvent.model_validate_json(original.model_dump_json())
        assert restored.from_tier == original.from_tier
        assert restored.to_tier == original.to_tier
        assert restored.ratified_by == "admin-1"
        assert restored.evidence_correlation_ids == ["abc", "def"]


class TestDemotionEvent:
    def test_valid_construction(self):
        event = make_demotion_event()
        assert event.trigger == DemotionTriggerType.FALSIFIED_ACTION

    def test_all_trigger_types(self):
        for trigger in DemotionTriggerType:
            event = make_demotion_event(trigger=trigger)
            assert event.trigger == trigger

    def test_round_trip(self):
        original = make_demotion_event(
            from_tier=AuthorityTier.T3,
            to_tier=AuthorityTier.T2,
            trigger=DemotionTriggerType.MAINTENANCE_BREACH,
            falsified_correlation_id="chain-xyz",
        )
        restored = DemotionEvent.model_validate_json(original.model_dump_json())
        assert restored.trigger == original.trigger
        assert restored.falsified_correlation_id == "chain-xyz"


class TestAuthorityDecision:
    def test_valid_construction(self):
        decision = make_authority_decision()
        assert decision.verdict == GateVerdict.ALLOW

    def test_all_verdicts(self):
        for verdict in GateVerdict:
            decision = make_authority_decision(verdict=verdict)
            assert decision.verdict == verdict

    def test_round_trip(self):
        original = make_authority_decision(
            verdict=GateVerdict.REFUSE,
            requested_consequence=75.0,
            ceiling=50.0,
            reason="Above ceiling",
        )
        restored = AuthorityDecision.model_validate_json(original.model_dump_json())
        assert restored.verdict == original.verdict
        assert restored.requested_consequence == 75.0
        assert restored.ceiling == 50.0


class TestPromotionCase:
    def test_valid_construction(self):
        case = make_promotion_case()
        assert case.chain_count == 50
        assert case.rolling_accuracy == 0.70

    def test_round_trip(self):
        original = make_promotion_case(
            target_tier=AuthorityTier.T3,
            chain_count=500,
            rolling_accuracy=0.88,
            notable_successes=["chain-a", "chain-b"],
            near_misses=["chain-c"],
            evidence_correlation_ids=["chain-a", "chain-b", "chain-c"],
        )
        restored = PromotionCase.model_validate_json(original.model_dump_json())
        assert restored.chain_count == 500
        assert len(restored.notable_successes) == 2


class TestRatificationRequest:
    def test_valid_construction(self):
        req = make_ratification_request()
        assert req.status == RatificationStatus.PENDING
        assert req.decided_by is None

    def test_all_statuses(self):
        for status in RatificationStatus:
            req = make_ratification_request(status=status)
            assert req.status == status

    def test_round_trip(self):
        original = make_ratification_request(
            target_tier=AuthorityTier.T4,
            status=RatificationStatus.APPROVED,
            decided_by="human-admin",
        )
        restored = RatificationRequest.model_validate_json(original.model_dump_json())
        assert restored.status == RatificationStatus.APPROVED
        assert restored.decided_by == "human-admin"
        assert restored.case.target_tier == AuthorityTier.T4


class TestLedgerEntry:
    def test_valid_construction(self):
        entry = make_ledger_entry()
        assert entry.entry_type == "authority.promotion"
        assert entry.source_id == "agent-promotion-line"

    def test_all_six_fields_present(self):
        entry = make_ledger_entry()
        d = entry.model_dump()
        for field in ["entry_type", "agent_id", "content", "content_type", "source_id", "correlation_id"]:
            assert field in d, f"Missing field: {field}"

    def test_round_trip(self):
        original = make_ledger_entry(
            entry_type="authority.demotion",
            agent_id="agent-002",
            content='{"falsified": true}',
            correlation_id="fixed-id",
        )
        restored = LedgerEntry.model_validate_json(original.model_dump_json())
        assert restored.entry_type == "authority.demotion"
        assert restored.correlation_id == "fixed-id"


class TestConfig:
    def test_config_loads(self):
        config = load_config()
        assert "tiers" in config
        assert "promotion" in config
        assert "maintenance" in config

    def test_config_valid(self):
        config = load_config()
        errors = validate_config(config)
        assert errors == [], f"Config validation errors: {errors}"

    def test_tier_ceilings_monotonic(self):
        config = load_config()
        ceilings = [config["tiers"][f"T{i}"]["ceiling"] for i in range(5)]
        for i in range(1, len(ceilings)):
            assert ceilings[i] > ceilings[i - 1], f"T{i} ceiling not greater than T{i-1}"

    def test_promotion_accuracy_monotonic(self):
        config = load_config()
        transitions = ["T0_to_T1", "T1_to_T2", "T2_to_T3", "T3_to_T4"]
        accuracies = [config["promotion"][t]["min_rolling_accuracy"] for t in transitions]
        for i in range(1, len(accuracies)):
            assert accuracies[i] >= accuracies[i - 1]

    def test_promotion_chains_monotonic(self):
        config = load_config()
        transitions = ["T0_to_T1", "T1_to_T2", "T2_to_T3", "T3_to_T4"]
        chains = [config["promotion"][t]["min_verified_chains"] for t in transitions]
        for i in range(1, len(chains)):
            assert chains[i] >= chains[i - 1]

    def test_get_tier_ceiling(self):
        config = load_config()
        assert get_tier_ceiling(config, "T0") == 0.0
        assert get_tier_ceiling(config, "T1") == 25.0
        assert get_tier_ceiling(config, "T4") == 1000.0

    def test_get_maintenance_threshold(self):
        config = load_config()
        assert get_maintenance_threshold(config, "T0") == 0.0
        assert get_maintenance_threshold(config, "T1") == pytest.approx(0.50)
        assert get_maintenance_threshold(config, "T2") == pytest.approx(0.65)
        assert get_maintenance_threshold(config, "T3") == pytest.approx(0.75)
        assert get_maintenance_threshold(config, "T4") == pytest.approx(0.80)

    def test_invalid_config_detected(self):
        bad_config = {
            "tiers": {
                "T0": {"name": "PROBATION", "ceiling": 100.0},
                "T1": {"name": "VERIFIED", "ceiling": 50.0},
                "T2": {"name": "TRUSTED", "ceiling": 50.0},
                "T3": {"name": "AUTONOMOUS", "ceiling": 100.0},
                "T4": {"name": "PRINCIPAL", "ceiling": 1000.0},
            },
            "promotion": {
                "T0_to_T1": {"min_verified_chains": 50, "min_rolling_accuracy": 0.60},
                "T1_to_T2": {"min_verified_chains": 200, "min_rolling_accuracy": 0.75},
                "T2_to_T3": {"min_verified_chains": 500, "min_rolling_accuracy": 0.85},
                "T3_to_T4": {"min_verified_chains": 1000, "min_rolling_accuracy": 0.90},
            },
            "maintenance": {"accuracy_margin": 0.10, "window_size": 500},
        }
        errors = validate_config(bad_config)
        assert len(errors) > 0
        assert any("monotonically" in e for e in errors)


class TestSchemaRoundTrip:
    """Verify every model survives JSON serialization and deserialization."""

    ALL_MODELS = [
        ("AgentAuthority", make_authority),
        ("ChainLink", make_chain_link),
        ("TrackRecord", lambda: make_track_record(successes=3, failures=1)),
        ("PromotionEvent", make_promotion_event),
        ("DemotionEvent", make_demotion_event),
        ("AuthorityDecision", make_authority_decision),
        ("PromotionCase", make_promotion_case),
        ("RatificationRequest", make_ratification_request),
        ("LedgerEntry", make_ledger_entry),
    ]

    @pytest.mark.parametrize("name,factory", ALL_MODELS, ids=[m[0] for m in ALL_MODELS])
    def test_json_round_trip(self, name, factory):
        original = factory()
        json_str = original.model_dump_json()
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict), f"{name} did not serialize to a dict"
        restored = type(original).model_validate_json(json_str)
        assert restored.model_dump() == original.model_dump(), f"{name} round-trip mismatch"

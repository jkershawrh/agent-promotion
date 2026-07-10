"""TDD tests for TrackRecordAssembler (M1).

Tests written red-first: chain scoring correctness, window boundary,
pending exclusion, recency weighting.
"""

from __future__ import annotations

import pytest

from app.authority.assembler import (
    TrackRecordAssembler,
    _classify_entry,
    _parse_outcome_success,
    _score_chain,
    _compute_recency_weighted_accuracy,
)
from app.domain.models import ChainLink, ChainResult
from app.ledger.client import InMemoryLedgerClient
from tests.conftest import make_chain_link


def _entry(entry_type: str, agent_id: str = "agent-001", correlation_id: str = "c1", **kw):
    return {
        "entry_type": entry_type,
        "agent_id": agent_id,
        "content": kw.pop("content", '{"test": true}'),
        "content_type": "application/json",
        "source_id": "test",
        "correlation_id": correlation_id,
        **kw,
    }


class TestClassifyEntry:
    def test_prediction(self):
        assert _classify_entry({"entry_type": "fleet.prediction.scale"}) == "prediction"

    def test_action_intent(self):
        assert _classify_entry({"entry_type": "fleet.intent.scale"}) == "action"

    def test_action_action(self):
        assert _classify_entry({"entry_type": "fleet.action.deploy"}) == "action"

    def test_outcome(self):
        assert _classify_entry({"entry_type": "fleet.outcome.scale"}) == "outcome"

    def test_unknown(self):
        assert _classify_entry({"entry_type": "fleet.metadata"}) is None


class TestParseOutcomeSuccess:
    def test_success_in_type(self):
        assert _parse_outcome_success({"entry_type": "outcome.success"}) is True

    def test_confirmed_in_type(self):
        assert _parse_outcome_success({"entry_type": "outcome.confirmed"}) is True

    def test_failed_in_type(self):
        assert _parse_outcome_success({"entry_type": "outcome.failed"}) is False

    def test_falsified_in_type(self):
        assert _parse_outcome_success({"entry_type": "outcome.falsified"}) is False

    def test_success_in_content(self):
        assert _parse_outcome_success({"entry_type": "outcome", "content": '{"result": "verified"}'}) is True

    def test_failure_in_content(self):
        assert _parse_outcome_success({"entry_type": "outcome", "content": '{"result": "failure"}'}) is False

    def test_ambiguous_defaults_to_failure(self):
        assert _parse_outcome_success({"entry_type": "outcome", "content": '{"result": "unknown"}'}) is False


class TestScoreChain:
    def test_no_outcome_is_pending(self):
        chain = {"prediction": _entry("prediction"), "action": _entry("intent"), "outcome": None}
        assert _score_chain(chain) == ChainResult.PENDING

    def test_success_outcome(self):
        chain = {
            "prediction": _entry("prediction"),
            "action": _entry("intent"),
            "outcome": _entry("outcome.success"),
        }
        assert _score_chain(chain) == ChainResult.SUCCESS

    def test_failure_outcome(self):
        chain = {
            "prediction": _entry("prediction"),
            "action": _entry("intent"),
            "outcome": _entry("outcome.falsified"),
        }
        assert _score_chain(chain) == ChainResult.FAILURE


class TestRecencyWeightedAccuracy:
    def test_all_success(self):
        chains = [make_chain_link(ChainResult.SUCCESS) for _ in range(10)]
        assert _compute_recency_weighted_accuracy(chains, 500) == pytest.approx(1.0)

    def test_all_failure(self):
        chains = [make_chain_link(ChainResult.FAILURE) for _ in range(10)]
        assert _compute_recency_weighted_accuracy(chains, 500) == pytest.approx(0.0)

    def test_empty(self):
        assert _compute_recency_weighted_accuracy([], 500) == 0.0

    def test_pending_excluded(self):
        chains = [
            make_chain_link(ChainResult.SUCCESS),
            make_chain_link(ChainResult.PENDING),
            make_chain_link(ChainResult.PENDING),
        ]
        acc = _compute_recency_weighted_accuracy(chains, 500)
        assert acc == pytest.approx(1.0)

    def test_recency_favors_recent(self):
        old_failures = [make_chain_link(ChainResult.FAILURE) for _ in range(5)]
        recent_successes = [make_chain_link(ChainResult.SUCCESS) for _ in range(5)]
        chains = old_failures + recent_successes
        acc = _compute_recency_weighted_accuracy(chains, 500)
        assert acc > 0.5, "Recent successes should outweigh old failures"

    def test_window_limits(self):
        old_failures = [make_chain_link(ChainResult.FAILURE) for _ in range(100)]
        recent_successes = [make_chain_link(ChainResult.SUCCESS) for _ in range(10)]
        chains = old_failures + recent_successes
        acc_small_window = _compute_recency_weighted_accuracy(chains, 10)
        assert acc_small_window == pytest.approx(1.0)

    def test_mixed_equal_weight_approximation(self):
        chains = [
            make_chain_link(ChainResult.SUCCESS),
            make_chain_link(ChainResult.FAILURE),
        ]
        acc = _compute_recency_weighted_accuracy(chains, 500)
        assert 0.4 < acc < 0.6


@pytest.mark.asyncio
class TestTrackRecordAssembler:
    async def test_empty_ledger(self):
        ledger = InMemoryLedgerClient()
        assembler = TrackRecordAssembler(ledger)
        record = await assembler.assemble("agent-001")
        assert record.chain_count == 0
        assert record.success_count == 0
        assert record.failure_count == 0
        assert record.pending_count == 0
        assert record.rolling_accuracy == 0.0

    async def test_single_success_chain(self):
        ledger = InMemoryLedgerClient()
        ledger.seed([
            _entry("fleet.prediction.scale", correlation_id="c1"),
            _entry("fleet.intent.scale", correlation_id="c1"),
            _entry("fleet.outcome.success", correlation_id="c1"),
        ])
        assembler = TrackRecordAssembler(ledger)
        record = await assembler.assemble("agent-001")
        assert record.chain_count == 1
        assert record.success_count == 1
        assert record.rolling_accuracy == pytest.approx(1.0)

    async def test_single_failure_chain(self):
        ledger = InMemoryLedgerClient()
        ledger.seed([
            _entry("fleet.prediction.scale", correlation_id="c1"),
            _entry("fleet.intent.scale", correlation_id="c1"),
            _entry("fleet.outcome.falsified", correlation_id="c1"),
        ])
        assembler = TrackRecordAssembler(ledger)
        record = await assembler.assemble("agent-001")
        assert record.chain_count == 1
        assert record.failure_count == 1
        assert record.rolling_accuracy == pytest.approx(0.0)

    async def test_mixed_chains(self):
        ledger = InMemoryLedgerClient()
        for i in range(8):
            corr = f"success-{i}"
            ledger.seed([
                _entry("fleet.prediction.scale", correlation_id=corr),
                _entry("fleet.intent.scale", correlation_id=corr),
                _entry("fleet.outcome.confirmed", correlation_id=corr),
            ])
        for i in range(2):
            corr = f"fail-{i}"
            ledger.seed([
                _entry("fleet.prediction.scale", correlation_id=corr),
                _entry("fleet.intent.scale", correlation_id=corr),
                _entry("fleet.outcome.failed", correlation_id=corr),
            ])
        assembler = TrackRecordAssembler(ledger)
        record = await assembler.assemble("agent-001")
        assert record.chain_count == 10
        assert record.success_count == 8
        assert record.failure_count == 2
        assert record.rolling_accuracy > 0.7

    async def test_incomplete_chains_are_pending(self):
        ledger = InMemoryLedgerClient()
        ledger.seed([
            _entry("fleet.prediction.scale", correlation_id="c1"),
            _entry("fleet.intent.scale", correlation_id="c1"),
        ])
        assembler = TrackRecordAssembler(ledger)
        record = await assembler.assemble("agent-001")
        assert record.chain_count == 0
        assert record.pending_count == 1
        assert record.rolling_accuracy == 0.0

    async def test_window_limits_chains(self):
        ledger = InMemoryLedgerClient()
        for i in range(20):
            corr = f"chain-{i}"
            ledger.seed([
                _entry("fleet.prediction.scale", correlation_id=corr),
                _entry("fleet.intent.scale", correlation_id=corr),
                _entry("fleet.outcome.success", correlation_id=corr),
            ])
        assembler = TrackRecordAssembler(ledger)
        record = await assembler.assemble("agent-001", window=10)
        assert record.window == 10
        assert len(record.chains) <= 10

    async def test_different_agents_isolated(self):
        ledger = InMemoryLedgerClient()
        ledger.seed([
            _entry("fleet.prediction.scale", agent_id="agent-A", correlation_id="a1"),
            _entry("fleet.intent.scale", agent_id="agent-A", correlation_id="a1"),
            _entry("fleet.outcome.success", agent_id="agent-A", correlation_id="a1"),
            _entry("fleet.prediction.scale", agent_id="agent-B", correlation_id="b1"),
            _entry("fleet.intent.scale", agent_id="agent-B", correlation_id="b1"),
            _entry("fleet.outcome.failed", agent_id="agent-B", correlation_id="b1"),
        ])
        assembler = TrackRecordAssembler(ledger)
        record_a = await assembler.assemble("agent-A")
        record_b = await assembler.assemble("agent-B")
        assert record_a.success_count == 1
        assert record_a.failure_count == 0
        assert record_b.success_count == 0
        assert record_b.failure_count == 1

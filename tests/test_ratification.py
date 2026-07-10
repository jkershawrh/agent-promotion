"""TDD tests for RatificationQueue (M5).

Tests: queue and decide, approval applies, rejection discards, pending listable.
"""

from __future__ import annotations

import pytest

from app.authority.ratification import RatificationQueue
from app.domain.config import load_config
from app.domain.models import (
    AuthorityTier,
    PromotionEvent,
    RatificationStatus,
)
from tests.conftest import make_track_record


@pytest.fixture
def queue():
    return RatificationQueue(load_config())


class TestQueueRequest:
    def test_queue_creates_pending_request(self, queue):
        record = make_track_record(successes=440, failures=60)
        req = queue.queue("agent-001", AuthorityTier.T3, record)
        assert req.status == RatificationStatus.PENDING
        assert req.target_tier == AuthorityTier.T3
        assert req.case.chain_count == 500
        assert req.case.rolling_accuracy > 0

    def test_queue_includes_evidence(self, queue):
        record = make_track_record(successes=440, failures=60)
        req = queue.queue("agent-001", AuthorityTier.T3, record)
        assert len(req.case.evidence_correlation_ids) > 0
        assert len(req.case.notable_successes) > 0

    def test_pending_list(self, queue):
        record = make_track_record(successes=440, failures=60)
        queue.queue("agent-001", AuthorityTier.T3, record)
        queue.queue("agent-002", AuthorityTier.T4, record)
        pending = queue.list_pending()
        assert len(pending) == 2


class TestDecision:
    def test_approval_returns_promotion_event(self, queue):
        record = make_track_record(successes=440, failures=60)
        req = queue.queue("agent-001", AuthorityTier.T3, record)
        result = queue.decide(req.id, approved=True, decided_by="admin")
        assert isinstance(result, PromotionEvent)
        assert result.to_tier == AuthorityTier.T3
        assert result.ratified_by == "admin"
        assert "admin" in result.reason

    def test_rejection_returns_none(self, queue):
        record = make_track_record(successes=440, failures=60)
        req = queue.queue("agent-001", AuthorityTier.T3, record)
        result = queue.decide(req.id, approved=False, decided_by="admin")
        assert result is None

    def test_approval_removes_from_pending(self, queue):
        record = make_track_record(successes=440, failures=60)
        req = queue.queue("agent-001", AuthorityTier.T3, record)
        queue.decide(req.id, approved=True, decided_by="admin")
        assert len(queue.list_pending()) == 0

    def test_rejection_removes_from_pending(self, queue):
        record = make_track_record(successes=440, failures=60)
        req = queue.queue("agent-001", AuthorityTier.T3, record)
        queue.decide(req.id, approved=False, decided_by="admin")
        assert len(queue.list_pending()) == 0

    def test_unknown_request_returns_none(self, queue):
        from uuid import uuid4
        result = queue.decide(uuid4(), approved=True, decided_by="admin")
        assert result is None

    def test_multiple_decisions(self, queue):
        record = make_track_record(successes=440, failures=60)
        req1 = queue.queue("agent-001", AuthorityTier.T3, record)
        req2 = queue.queue("agent-002", AuthorityTier.T4, record)

        result1 = queue.decide(req1.id, approved=True, decided_by="admin-a")
        result2 = queue.decide(req2.id, approved=False, decided_by="admin-b")

        assert isinstance(result1, PromotionEvent)
        assert result2 is None
        assert len(queue.list_pending()) == 0

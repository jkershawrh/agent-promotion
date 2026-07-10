"""RatificationQueue: holds pending high-tier promotions for human decision.

Assembles a PromotionCase from ledger evidence and holds it pending a human
decision. Approved promotions are applied; rejected promotions are discarded.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.domain.config import get_tier_ceiling, load_config
from app.domain.models import (
    AuthorityTier,
    ChainResult,
    PromotionCase,
    PromotionEvent,
    RatificationRequest,
    RatificationStatus,
    TrackRecord,
)


class RatificationQueue:
    """In-memory queue for ratification requests. Production would use a database."""

    def __init__(self, config=None):
        self.config = config or load_config()
        self.pending: dict[UUID, RatificationRequest] = {}

    def queue(
        self,
        agent_id: str,
        target_tier: AuthorityTier,
        track_record: TrackRecord,
    ) -> RatificationRequest:
        successes = [
            c.correlation_id for c in track_record.chains
            if c.result == ChainResult.SUCCESS
        ][-5:]
        near_misses = [
            c.correlation_id for c in track_record.chains
            if c.result == ChainResult.FAILURE
        ][-3:]
        evidence_ids = [c.correlation_id for c in track_record.chains[-20:]]

        case = PromotionCase(
            agent_id=agent_id,
            target_tier=target_tier,
            chain_count=track_record.chain_count,
            rolling_accuracy=track_record.rolling_accuracy,
            notable_successes=successes,
            near_misses=near_misses,
            evidence_correlation_ids=evidence_ids,
        )

        request = RatificationRequest(
            agent_id=agent_id,
            target_tier=target_tier,
            case=case,
        )
        self.pending[request.id] = request
        return request

    def decide(
        self,
        request_id: UUID,
        approved: bool,
        decided_by: str,
    ) -> Optional[PromotionEvent]:
        request = self.pending.get(request_id)
        if request is None:
            return None

        now = datetime.now(timezone.utc)
        request.decided_at = now
        request.decided_by = decided_by

        if approved:
            request.status = RatificationStatus.APPROVED
            del self.pending[request_id]

            prev_tier_idx = [
                AuthorityTier.T0, AuthorityTier.T1, AuthorityTier.T2,
                AuthorityTier.T3, AuthorityTier.T4,
            ].index(request.target_tier) - 1
            from_tier = [
                AuthorityTier.T0, AuthorityTier.T1, AuthorityTier.T2,
                AuthorityTier.T3, AuthorityTier.T4,
            ][max(0, prev_tier_idx)]

            return PromotionEvent(
                agent_id=request.agent_id,
                from_tier=from_tier,
                to_tier=request.target_tier,
                reason=f"Ratification approved by {decided_by}",
                evidence_correlation_ids=request.case.evidence_correlation_ids,
                ratified_by=decided_by,
            )
        else:
            request.status = RatificationStatus.REJECTED
            del self.pending[request_id]
            return None

    def list_pending(self) -> list[RatificationRequest]:
        return list(self.pending.values())

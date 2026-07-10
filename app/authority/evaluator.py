"""PromotionEvaluator: applies config gates to determine promotion decisions.

Given a TrackRecord and current AgentAuthority, returns a PromotionEvent,
a RatificationRequest, or None.
"""

from __future__ import annotations

from typing import Any, Optional, Union

from app.domain.config import get_promotion_threshold, load_config
from app.domain.models import (
    AgentAuthority,
    AuthorityTier,
    OperatingMode,
    PromotionCase,
    PromotionEvent,
    RatificationRequest,
    TrackRecord,
)

_TIER_ORDER = [AuthorityTier.T0, AuthorityTier.T1, AuthorityTier.T2, AuthorityTier.T3, AuthorityTier.T4]


def _next_tier(current: AuthorityTier) -> Optional[AuthorityTier]:
    idx = _TIER_ORDER.index(current)
    if idx >= len(_TIER_ORDER) - 1:
        return None
    return _TIER_ORDER[idx + 1]


def _tier_ceiling(config: dict[str, Any], tier: AuthorityTier) -> float:
    return float(config["tiers"][tier.value]["ceiling"])


class PromotionEvaluator:
    """Evaluates whether an agent should be promoted based on track record and config gates."""

    def __init__(self, config: Optional[dict[str, Any]] = None):
        self.config = config or load_config()

    def evaluate(
        self,
        track_record: TrackRecord,
        current: AgentAuthority,
    ) -> Union[PromotionEvent, RatificationRequest, None]:
        next_t = _next_tier(current.tier)
        if next_t is None:
            return None

        threshold = get_promotion_threshold(self.config, current.tier.value, next_t.value)
        min_chains = threshold["min_verified_chains"]
        min_accuracy = threshold["min_rolling_accuracy"]
        extra_gate = threshold.get("extra_gate", "none")

        if track_record.chain_count < min_chains:
            return None
        if track_record.rolling_accuracy < min_accuracy:
            return None

        evidence_ids = [c.correlation_id for c in track_record.chains[-20:]]

        if extra_gate == "hitl_always":
            return self._queue_ratification(current, next_t, track_record, evidence_ids)

        if extra_gate == "hitl_if_mode" and current.mode == OperatingMode.HITL_HIGH_TIER:
            return self._queue_ratification(current, next_t, track_record, evidence_ids)

        new_ceiling = _tier_ceiling(self.config, next_t)
        return PromotionEvent(
            agent_id=current.agent_id,
            from_tier=current.tier,
            to_tier=next_t,
            reason=(
                f"Met promotion criteria: {track_record.chain_count} chains "
                f"at {track_record.rolling_accuracy:.2f} accuracy"
            ),
            evidence_correlation_ids=evidence_ids,
        )

    def _queue_ratification(
        self,
        current: AgentAuthority,
        target: AuthorityTier,
        track_record: TrackRecord,
        evidence_ids: list[str],
    ) -> RatificationRequest:
        successes = [
            c.correlation_id for c in track_record.chains
            if c.result.value == "success"
        ][-5:]
        near_misses = [
            c.correlation_id for c in track_record.chains
            if c.result.value == "failure"
        ][-3:]

        case = PromotionCase(
            agent_id=current.agent_id,
            target_tier=target,
            chain_count=track_record.chain_count,
            rolling_accuracy=track_record.rolling_accuracy,
            notable_successes=successes,
            near_misses=near_misses,
            evidence_correlation_ids=evidence_ids,
        )
        return RatificationRequest(
            agent_id=current.agent_id,
            target_tier=target,
            case=case,
        )

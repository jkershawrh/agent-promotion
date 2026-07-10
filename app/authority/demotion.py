"""DemotionTrigger: immediate demotion on falsified actions or maintenance breaches.

Runs in both FULL_AUTO and HITL_HIGH_TIER modes without human gating.
This is the non-negotiable safety asymmetry: pulling authority never waits on a human.
"""

from __future__ import annotations

from typing import Any, Optional

from app.domain.config import get_maintenance_threshold, get_tier_ceiling, load_config
from app.domain.models import (
    AgentAuthority,
    AuthorityTier,
    ChainResult,
    DemotionEvent,
    DemotionTriggerType,
    TrackRecord,
)

_TIER_ORDER = [AuthorityTier.T0, AuthorityTier.T1, AuthorityTier.T2, AuthorityTier.T3, AuthorityTier.T4]


def _prev_tier(current: AuthorityTier) -> Optional[AuthorityTier]:
    idx = _TIER_ORDER.index(current)
    if idx <= 0:
        return None
    return _TIER_ORDER[idx - 1]


class DemotionTrigger:
    """Checks for demotion conditions. Demotions are always immediate and automatic."""

    def __init__(self, config: Optional[dict[str, Any]] = None):
        self.config = config or load_config()

    def check(
        self,
        track_record: TrackRecord,
        current: AgentAuthority,
    ) -> Optional[DemotionEvent]:
        if current.tier == AuthorityTier.T0:
            return None

        falsified = self._check_falsified_at_ceiling(track_record, current)
        if falsified is not None:
            return falsified

        return self._check_maintenance_breach(track_record, current)

    def _check_falsified_at_ceiling(
        self,
        track_record: TrackRecord,
        current: AgentAuthority,
    ) -> Optional[DemotionEvent]:
        """Check for a falsified action at or above the agent's consequence ceiling."""
        ceiling = current.consequence_ceiling

        for chain in track_record.chains:
            if chain.result != ChainResult.FAILURE:
                continue
            if chain.consequence_score is not None and chain.consequence_score >= ceiling:
                prev = _prev_tier(current.tier)
                if prev is None:
                    return None
                return DemotionEvent(
                    agent_id=current.agent_id,
                    from_tier=current.tier,
                    to_tier=prev,
                    trigger=DemotionTriggerType.FALSIFIED_ACTION,
                    falsified_correlation_id=chain.correlation_id,
                )

        return None

    def _check_maintenance_breach(
        self,
        track_record: TrackRecord,
        current: AgentAuthority,
    ) -> Optional[DemotionEvent]:
        """Check if rolling accuracy has dropped below maintenance threshold."""
        if track_record.chain_count == 0:
            return None

        threshold = get_maintenance_threshold(self.config, current.tier.value)
        if track_record.rolling_accuracy < threshold:
            prev = _prev_tier(current.tier)
            if prev is None:
                return None
            return DemotionEvent(
                agent_id=current.agent_id,
                from_tier=current.tier,
                to_tier=prev,
                trigger=DemotionTriggerType.MAINTENANCE_BREACH,
            )

        return None

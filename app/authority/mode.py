"""ModeController: applies FULL_AUTO or HITL_HIGH_TIER policy to promotion decisions.

Demotions always bypass the mode controller (non-negotiable safety asymmetry).
"""

from __future__ import annotations

from typing import Optional, Union

from app.domain.models import (
    AgentAuthority,
    AuthorityTier,
    DemotionEvent,
    OperatingMode,
    PromotionEvent,
    RatificationRequest,
    TrackRecord,
)
from app.authority.evaluator import PromotionEvaluator
from app.authority.demotion import DemotionTrigger


class ModeController:
    """Orchestrates evaluation through the promotion and demotion pipelines,
    applying the operating mode policy."""

    def __init__(
        self,
        evaluator: PromotionEvaluator,
        demotion_trigger: DemotionTrigger,
    ):
        self.evaluator = evaluator
        self.demotion_trigger = demotion_trigger

    def evaluate(
        self,
        track_record: TrackRecord,
        current: AgentAuthority,
    ) -> Union[PromotionEvent, RatificationRequest, DemotionEvent, None]:
        demotion = self.demotion_trigger.check(track_record, current)
        if demotion is not None:
            return demotion

        return self.evaluator.evaluate(track_record, current)

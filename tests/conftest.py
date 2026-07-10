"""Factory helpers for Agent Promotion Line tests."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

# Ensure app is importable from repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

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


def make_authority(
    agent_id: str = "agent-001",
    tier: AuthorityTier = AuthorityTier.T0,
    ceiling: float = 0.0,
    mode: OperatingMode = OperatingMode.FULL_AUTO,
    **kw,
) -> AgentAuthority:
    return AgentAuthority(
        agent_id=agent_id,
        tier=tier,
        consequence_ceiling=ceiling,
        mode=mode,
        **kw,
    )


def make_chain_link(
    result: ChainResult = ChainResult.SUCCESS,
    consequence_score: Optional[float] = None,
    **kw,
) -> ChainLink:
    return ChainLink(
        correlation_id=kw.pop("correlation_id", str(uuid4())),
        result=result,
        consequence_score=consequence_score,
        timestamp=kw.pop("timestamp", datetime.now(timezone.utc)),
        **kw,
    )


def make_track_record(
    agent_id: str = "agent-001",
    successes: int = 0,
    failures: int = 0,
    pending: int = 0,
    window: int = 500,
    chains: Optional[list[ChainLink]] = None,
    **kw,
) -> TrackRecord:
    total = successes + failures
    accuracy = successes / total if total > 0 else 0.0
    if chains is None:
        chains = (
            [make_chain_link(ChainResult.SUCCESS) for _ in range(successes)]
            + [make_chain_link(ChainResult.FAILURE) for _ in range(failures)]
            + [make_chain_link(ChainResult.PENDING) for _ in range(pending)]
        )
    return TrackRecord(
        agent_id=agent_id,
        window=window,
        chain_count=successes + failures,
        success_count=successes,
        failure_count=failures,
        pending_count=pending,
        rolling_accuracy=kw.pop("rolling_accuracy", accuracy),
        chains=chains,
        **kw,
    )


def make_promotion_event(
    agent_id: str = "agent-001",
    from_tier: AuthorityTier = AuthorityTier.T0,
    to_tier: AuthorityTier = AuthorityTier.T1,
    **kw,
) -> PromotionEvent:
    return PromotionEvent(
        agent_id=agent_id,
        from_tier=from_tier,
        to_tier=to_tier,
        reason=kw.pop("reason", "Met promotion criteria"),
        **kw,
    )


def make_demotion_event(
    agent_id: str = "agent-001",
    from_tier: AuthorityTier = AuthorityTier.T1,
    to_tier: AuthorityTier = AuthorityTier.T0,
    trigger: DemotionTriggerType = DemotionTriggerType.FALSIFIED_ACTION,
    **kw,
) -> DemotionEvent:
    return DemotionEvent(
        agent_id=agent_id,
        from_tier=from_tier,
        to_tier=to_tier,
        trigger=trigger,
        **kw,
    )


def make_authority_decision(
    verdict: GateVerdict = GateVerdict.ALLOW,
    requested_consequence: float = 10.0,
    ceiling: float = 25.0,
    **kw,
) -> AuthorityDecision:
    return AuthorityDecision(
        action_id=kw.pop("action_id", str(uuid4())),
        agent_id=kw.pop("agent_id", "agent-001"),
        requested_consequence=requested_consequence,
        ceiling=ceiling,
        verdict=verdict,
        reason=kw.pop("reason", "Within ceiling"),
        **kw,
    )


def make_promotion_case(
    agent_id: str = "agent-001",
    target_tier: AuthorityTier = AuthorityTier.T1,
    chain_count: int = 50,
    rolling_accuracy: float = 0.70,
    **kw,
) -> PromotionCase:
    return PromotionCase(
        agent_id=agent_id,
        target_tier=target_tier,
        chain_count=chain_count,
        rolling_accuracy=rolling_accuracy,
        **kw,
    )


def make_ratification_request(
    agent_id: str = "agent-001",
    target_tier: AuthorityTier = AuthorityTier.T3,
    **kw,
) -> RatificationRequest:
    case = kw.pop("case", make_promotion_case(agent_id=agent_id, target_tier=target_tier))
    return RatificationRequest(
        agent_id=agent_id,
        target_tier=target_tier,
        case=case,
        **kw,
    )


def make_ledger_entry(
    entry_type: str = "authority.promotion",
    agent_id: str = "agent-001",
    **kw,
) -> LedgerEntry:
    return LedgerEntry(
        entry_type=entry_type,
        agent_id=agent_id,
        content=kw.pop("content", '{"test": true}'),
        correlation_id=kw.pop("correlation_id", str(uuid4())),
        **kw,
    )

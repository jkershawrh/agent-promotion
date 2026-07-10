"""Pydantic v2 contracts for the Agent Promotion Line. No logic, just data shapes."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class AuthorityTier(str, Enum):
    T0 = "T0"
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"
    T4 = "T4"


class OperatingMode(str, Enum):
    FULL_AUTO = "FULL_AUTO"
    HITL_HIGH_TIER = "HITL_HIGH_TIER"


class GateVerdict(str, Enum):
    ALLOW = "allow"
    REFUSE = "refuse"
    ROUTE_HUMAN = "route_human"


class RatificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class DemotionTriggerType(str, Enum):
    FALSIFIED_ACTION = "falsified_action"
    MAINTENANCE_BREACH = "maintenance_breach"


class ChainResult(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"


class ChainLink(BaseModel):
    correlation_id: str
    result: ChainResult
    consequence_score: Optional[float] = None
    timestamp: Optional[datetime] = None


class AgentAuthority(BaseModel):
    agent_id: str
    tier: AuthorityTier = AuthorityTier.T0
    consequence_ceiling: float = 0.0
    mode: OperatingMode = OperatingMode.FULL_AUTO
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrackRecord(BaseModel):
    agent_id: str
    window: int = 500
    chain_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    pending_count: int = 0
    rolling_accuracy: float = 0.0
    chains: list[ChainLink] = Field(default_factory=list)


class PromotionEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    agent_id: str
    from_tier: AuthorityTier
    to_tier: AuthorityTier
    reason: str
    evidence_correlation_ids: list[str] = Field(default_factory=list)
    ratified_by: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DemotionEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    agent_id: str
    from_tier: AuthorityTier
    to_tier: AuthorityTier
    trigger: DemotionTriggerType
    falsified_correlation_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuthorityDecision(BaseModel):
    action_id: str
    agent_id: str
    requested_consequence: float
    ceiling: float
    verdict: GateVerdict
    reason: str


class PromotionCase(BaseModel):
    agent_id: str
    target_tier: AuthorityTier
    chain_count: int
    rolling_accuracy: float
    notable_successes: list[str] = Field(default_factory=list)
    near_misses: list[str] = Field(default_factory=list)
    evidence_correlation_ids: list[str] = Field(default_factory=list)


class RatificationRequest(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    agent_id: str
    target_tier: AuthorityTier
    case: PromotionCase
    status: RatificationStatus = RatificationStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    decided_at: Optional[datetime] = None
    decided_by: Optional[str] = None


class LedgerEntry(BaseModel):
    entry_type: str
    agent_id: str
    content: str
    content_type: str = "application/json"
    source_id: str = "agent-promotion-line"
    correlation_id: str

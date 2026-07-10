"""AuthorityGate: consequence-ceiling enforcement.

Intercepts a proposed action, reads its consequence score, compares to the
agent's ceiling. Returns allow, refuse, or route_human. Never silently allows
above-ceiling actions.
"""

from __future__ import annotations

from typing import Any, Optional

from app.domain.models import (
    AgentAuthority,
    AuthorityDecision,
    AuthorityTier,
    GateVerdict,
)


class AuthorityGate:
    """Enforces consequence ceilings. Above-ceiling actions are refused or routed."""

    def __init__(self, authority_store: Optional[dict[str, AgentAuthority]] = None):
        self.store = authority_store or {}

    def register(self, authority: AgentAuthority) -> None:
        self.store[authority.agent_id] = authority

    def check(
        self,
        agent_id: str,
        action_id: str,
        consequence_score: float,
    ) -> AuthorityDecision:
        authority = self.store.get(agent_id)
        if authority is None:
            return AuthorityDecision(
                action_id=action_id,
                agent_id=agent_id,
                requested_consequence=consequence_score,
                ceiling=0.0,
                verdict=GateVerdict.REFUSE,
                reason="Agent not registered in authority store",
            )

        ceiling = authority.consequence_ceiling

        if authority.tier == AuthorityTier.T0:
            if consequence_score > 0:
                return AuthorityDecision(
                    action_id=action_id,
                    agent_id=agent_id,
                    requested_consequence=consequence_score,
                    ceiling=ceiling,
                    verdict=GateVerdict.ROUTE_HUMAN,
                    reason="T0 (PROBATION): all non-zero consequence actions route to human",
                )
            return AuthorityDecision(
                action_id=action_id,
                agent_id=agent_id,
                requested_consequence=consequence_score,
                ceiling=ceiling,
                verdict=GateVerdict.ALLOW,
                reason="Zero-consequence action within T0 advisory scope",
            )

        if consequence_score <= ceiling:
            return AuthorityDecision(
                action_id=action_id,
                agent_id=agent_id,
                requested_consequence=consequence_score,
                ceiling=ceiling,
                verdict=GateVerdict.ALLOW,
                reason=f"Consequence {consequence_score} within ceiling {ceiling}",
            )

        return AuthorityDecision(
            action_id=action_id,
            agent_id=agent_id,
            requested_consequence=consequence_score,
            ceiling=ceiling,
            verdict=GateVerdict.REFUSE,
            reason=f"Consequence {consequence_score} exceeds ceiling {ceiling}",
        )

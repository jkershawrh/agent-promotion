"""TrackRecordAssembler: builds a TrackRecord from ledger chains for an agent.

Adapted from deepfield-fleet's LedgerChainVerifier (app/intents/ledger_verifier.py).
Groups entries by correlation_id into chains (prediction, action, outcome),
scores each chain, and computes rolling accuracy with recency weighting.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from app.domain.config import get_window_size, load_config
from app.domain.models import ChainLink, ChainResult, TrackRecord
from app.ledger.client import LedgerClient


def _classify_entry(entry: dict[str, Any]) -> Optional[str]:
    """Classify an entry as prediction, action, or outcome by entry_type substring."""
    entry_type = entry.get("entry_type", "")
    if "prediction" in entry_type:
        return "prediction"
    if "action" in entry_type or "intent" in entry_type:
        return "action"
    if "outcome" in entry_type:
        return "outcome"
    return None


def _parse_outcome_success(entry: dict[str, Any]) -> bool:
    """Determine if an outcome entry indicates success or failure.

    Looks for 'success', 'confirmed', 'verified' in content or entry_type.
    Looks for 'failed', 'falsified', 'error' for failure.
    Defaults to failure if ambiguous (conservative).
    """
    entry_type = entry.get("entry_type", "").lower()
    content = entry.get("content", "").lower() if isinstance(entry.get("content"), str) else ""

    success_markers = ("success", "confirmed", "verified", "true")
    failure_markers = ("failed", "falsified", "error", "false", "failure")

    for marker in failure_markers:
        if marker in entry_type or marker in content:
            return False
    for marker in success_markers:
        if marker in entry_type or marker in content:
            return True

    return False


def _score_chain(chain: dict[str, Any]) -> ChainResult:
    """Score a chain as success, failure, or pending."""
    if chain.get("outcome") is None:
        return ChainResult.PENDING
    if _parse_outcome_success(chain["outcome"]):
        return ChainResult.SUCCESS
    return ChainResult.FAILURE


def _extract_consequence_score(chain: dict[str, Any]) -> Optional[float]:
    """Extract consequence score from the action entry if available."""
    action = chain.get("action")
    if action is None:
        return None
    content = action.get("content", "")
    if isinstance(content, str) and "consequence_score" in content:
        import json
        try:
            parsed = json.loads(content)
            return float(parsed.get("consequence_score", 0))
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return None


def _compute_recency_weighted_accuracy(
    chains: list[ChainLink],
    window: int,
) -> float:
    """Compute accuracy with exponential recency weighting.

    More recent chains (later in the list) get higher weight.
    Only completed (non-pending) chains are included.
    """
    completed = [c for c in chains if c.result != ChainResult.PENDING]
    if not completed:
        return 0.0

    windowed = completed[-window:]
    if not windowed:
        return 0.0

    n = len(windowed)
    decay = 0.995
    total_weight = 0.0
    weighted_success = 0.0

    for i, chain in enumerate(windowed):
        weight = decay ** (n - 1 - i)
        total_weight += weight
        if chain.result == ChainResult.SUCCESS:
            weighted_success += weight

    if total_weight == 0:
        return 0.0
    return weighted_success / total_weight


class TrackRecordAssembler:
    """Assembles a TrackRecord by reading ledger chains for an agent."""

    def __init__(self, ledger: LedgerClient, config: Optional[dict[str, Any]] = None):
        self.ledger = ledger
        self.config = config or load_config()

    async def assemble(self, agent_id: str, window: Optional[int] = None) -> TrackRecord:
        if window is None:
            window = get_window_size(self.config)

        entries = await self.ledger.query_by_agent(agent_id)
        chains = self._group_into_chains(entries)
        chain_links = self._score_chains(chains)

        completed = [c for c in chain_links if c.result != ChainResult.PENDING]
        pending = [c for c in chain_links if c.result == ChainResult.PENDING]
        successes = [c for c in completed if c.result == ChainResult.SUCCESS]
        failures = [c for c in completed if c.result == ChainResult.FAILURE]

        rolling_accuracy = _compute_recency_weighted_accuracy(chain_links, window)

        return TrackRecord(
            agent_id=agent_id,
            window=window,
            chain_count=len(completed),
            success_count=len(successes),
            failure_count=len(failures),
            pending_count=len(pending),
            rolling_accuracy=rolling_accuracy,
            chains=chain_links[-window:] if chain_links else [],
        )

    def _group_into_chains(
        self, entries: list[dict[str, Any]]
    ) -> dict[str, dict[str, Any]]:
        """Group entries by correlation_id into chains with prediction/action/outcome slots."""
        chains: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"prediction": None, "action": None, "outcome": None}
        )
        for entry in entries:
            corr_id = entry.get("correlation_id")
            if not corr_id:
                continue
            role = _classify_entry(entry)
            if role is not None:
                chains[corr_id][role] = entry
        return dict(chains)

    def _score_chains(
        self, chains: dict[str, dict[str, Any]]
    ) -> list[ChainLink]:
        """Score each chain and produce ChainLink objects."""
        links: list[ChainLink] = []
        for corr_id, chain in chains.items():
            result = _score_chain(chain)
            consequence = _extract_consequence_score(chain)
            timestamp = None
            for role in ("outcome", "action", "prediction"):
                entry = chain.get(role)
                if entry and "timestamp" in entry:
                    try:
                        timestamp = datetime.fromisoformat(entry["timestamp"])
                    except (ValueError, TypeError):
                        pass
                    break

            links.append(ChainLink(
                correlation_id=corr_id,
                result=result,
                consequence_score=consequence,
                timestamp=timestamp,
            ))
        return links

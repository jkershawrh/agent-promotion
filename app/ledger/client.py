"""HTTP client for the ARE Immutable Ledger.

Adapted from deepfield-fleet's IntentEmitter (app/intents/emitter.py).
Formalizes the 6-field entry dict into the LedgerEntry Pydantic model.
"""

from __future__ import annotations

import logging
from typing import Any, Optional, Protocol

import httpx

from app.domain.models import LedgerEntry

logger = logging.getLogger(__name__)


class LedgerClient(Protocol):
    """Protocol for ledger operations (enables in-memory testing)."""

    async def write_entry(self, entry: LedgerEntry) -> bool:
        ...

    async def query_by_agent(self, agent_id: str) -> list[dict[str, Any]]:
        ...

    async def query_by_correlation(self, correlation_id: str) -> list[dict[str, Any]]:
        ...


class HttpLedgerClient:
    """Real HTTP client for the ARE Ledger REST gateway."""

    def __init__(self, ledger_url: str):
        self.ledger_url = ledger_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=10.0)

    async def write_entry(self, entry: LedgerEntry) -> bool:
        try:
            resp = await self.client.post(
                f"{self.ledger_url}/api/entries",
                json=entry.model_dump(),
                timeout=5.0,
            )
            return resp.status_code in (200, 201)
        except Exception as e:
            logger.warning(f"Failed to write ledger entry: {e}")
            return False

    async def query_by_agent(self, agent_id: str) -> list[dict[str, Any]]:
        try:
            resp = await self.client.get(
                f"{self.ledger_url}/api/entries",
                params={"agent_id": agent_id},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            if isinstance(data, list):
                return data
            return data.get("entries", [])
        except Exception as e:
            logger.warning(f"Failed to query ledger by agent: {e}")
            return []

    async def query_by_correlation(self, correlation_id: str) -> list[dict[str, Any]]:
        try:
            resp = await self.client.get(
                f"{self.ledger_url}/api/entries",
                params={"correlation_id": correlation_id},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            if isinstance(data, list):
                return data
            return data.get("entries", [])
        except Exception as e:
            logger.warning(f"Failed to query ledger by correlation: {e}")
            return []

    async def close(self) -> None:
        await self.client.aclose()


class InMemoryLedgerClient:
    """In-memory ledger client for testing. Stores entries as dicts."""

    def __init__(self) -> None:
        self.entries: list[dict[str, Any]] = []

    async def write_entry(self, entry: LedgerEntry) -> bool:
        self.entries.append(entry.model_dump())
        return True

    async def query_by_agent(self, agent_id: str) -> list[dict[str, Any]]:
        return [e for e in self.entries if e.get("agent_id") == agent_id]

    async def query_by_correlation(self, correlation_id: str) -> list[dict[str, Any]]:
        return [e for e in self.entries if e.get("correlation_id") == correlation_id]

    def seed(self, entries: list[dict[str, Any]]) -> None:
        self.entries.extend(entries)

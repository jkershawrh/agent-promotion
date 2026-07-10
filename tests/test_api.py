"""TDD tests for the FastAPI endpoints (M7).

Tests: endpoint status codes, response shapes, integration flows.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app, authority_store, gate, ledger_client, ratification_queue


@pytest.fixture(autouse=True)
def reset_state():
    authority_store.clear()
    gate.store.clear()
    ratification_queue.pending.clear()
    if hasattr(ledger_client, "entries"):
        ledger_client.entries.clear()
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
class TestGetAuthority:
    async def test_returns_default_t0(self, client):
        resp = await client.get("/api/v1/authority/new-agent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["agent_id"] == "new-agent"
        assert data["tier"] == "T0"
        assert data["consequence_ceiling"] == 0.0

    async def test_returns_existing_agent(self, client):
        await client.get("/api/v1/authority/agent-a")
        resp = await client.get("/api/v1/authority/agent-a")
        assert resp.status_code == 200
        assert resp.json()["agent_id"] == "agent-a"


@pytest.mark.asyncio
class TestEvaluateAuthority:
    async def test_no_change_on_empty_record(self, client):
        resp = await client.post("/api/v1/authority/evaluate/agent-x")
        assert resp.status_code == 200
        assert resp.json()["status"] == "no_change"

    async def test_promotion_with_seeded_ledger(self, client):
        for i in range(55):
            corr = f"chain-{i}"
            ledger_client.entries.extend([
                {
                    "entry_type": "fleet.prediction.scale",
                    "agent_id": "promo-agent",
                    "content": '{}',
                    "content_type": "application/json",
                    "source_id": "test",
                    "correlation_id": corr,
                },
                {
                    "entry_type": "fleet.intent.scale",
                    "agent_id": "promo-agent",
                    "content": '{}',
                    "content_type": "application/json",
                    "source_id": "test",
                    "correlation_id": corr,
                },
                {
                    "entry_type": "fleet.outcome.success",
                    "agent_id": "promo-agent",
                    "content": '{}',
                    "content_type": "application/json",
                    "source_id": "test",
                    "correlation_id": corr,
                },
            ])

        resp = await client.post("/api/v1/authority/evaluate/promo-agent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "promoted"
        assert data["event"]["to_tier"] == "T1"


@pytest.mark.asyncio
class TestGate:
    async def test_allow_within_ceiling(self, client):
        await client.get("/api/v1/authority/gate-agent")
        resp = await client.post("/api/v1/authority/gate", json={
            "agent_id": "gate-agent",
            "action_id": "act-1",
            "consequence_score": 0.0,
        })
        assert resp.status_code == 200
        assert resp.json()["verdict"] == "allow"

    async def test_refuse_above_ceiling(self, client):
        await client.get("/api/v1/authority/gate-agent")
        resp = await client.post("/api/v1/authority/gate", json={
            "agent_id": "gate-agent",
            "action_id": "act-2",
            "consequence_score": 50.0,
        })
        assert resp.status_code == 200
        assert resp.json()["verdict"] in ("refuse", "route_human")


@pytest.mark.asyncio
class TestRatifications:
    async def test_pending_empty(self, client):
        resp = await client.get("/api/v1/ratifications/pending")
        assert resp.status_code == 200
        assert resp.json() == []


@pytest.mark.asyncio
class TestRoster:
    async def test_roster_empty(self, client):
        resp = await client.get("/api/v1/authority/roster")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_roster_with_agents(self, client):
        await client.get("/api/v1/authority/agent-a")
        await client.get("/api/v1/authority/agent-b")
        resp = await client.get("/api/v1/authority/roster")
        assert resp.status_code == 200
        roster = resp.json()
        assert len(roster) == 2
        assert all("tier" in entry for entry in roster)
        assert all("tier_name" in entry for entry in roster)

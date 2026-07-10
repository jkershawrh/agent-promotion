"""TDD tests for AuthorityGate (M4).

Tests: ceiling enforcement, T0 routes everything, T4 allows critical,
unregistered agents refused.
"""

from __future__ import annotations

import pytest

from app.authority.gate import AuthorityGate
from app.domain.models import AuthorityTier, GateVerdict
from tests.conftest import make_authority


@pytest.fixture
def gate():
    g = AuthorityGate()
    g.register(make_authority(agent_id="t0", tier=AuthorityTier.T0, ceiling=0.0))
    g.register(make_authority(agent_id="t1", tier=AuthorityTier.T1, ceiling=25.0))
    g.register(make_authority(agent_id="t2", tier=AuthorityTier.T2, ceiling=50.0))
    g.register(make_authority(agent_id="t3", tier=AuthorityTier.T3, ceiling=100.0))
    g.register(make_authority(agent_id="t4", tier=AuthorityTier.T4, ceiling=1000.0))
    return g


class TestCeilingEnforcement:
    def test_below_ceiling_allows(self, gate):
        decision = gate.check("t1", "act-1", 10.0)
        assert decision.verdict == GateVerdict.ALLOW

    def test_at_ceiling_allows(self, gate):
        decision = gate.check("t1", "act-1", 25.0)
        assert decision.verdict == GateVerdict.ALLOW

    def test_above_ceiling_refuses(self, gate):
        decision = gate.check("t1", "act-1", 30.0)
        assert decision.verdict == GateVerdict.REFUSE

    def test_far_above_ceiling_refuses(self, gate):
        decision = gate.check("t2", "act-1", 200.0)
        assert decision.verdict == GateVerdict.REFUSE

    def test_zero_consequence_allows_any_tier(self, gate):
        for agent_id in ["t1", "t2", "t3", "t4"]:
            decision = gate.check(agent_id, "act-1", 0.0)
            assert decision.verdict == GateVerdict.ALLOW


class TestT0AdvisoryOnly:
    def test_t0_nonzero_routes_human(self, gate):
        decision = gate.check("t0", "act-1", 1.0)
        assert decision.verdict == GateVerdict.ROUTE_HUMAN

    def test_t0_high_consequence_routes_human(self, gate):
        decision = gate.check("t0", "act-1", 500.0)
        assert decision.verdict == GateVerdict.ROUTE_HUMAN

    def test_t0_zero_consequence_allows(self, gate):
        decision = gate.check("t0", "act-1", 0.0)
        assert decision.verdict == GateVerdict.ALLOW


class TestT4Principal:
    def test_t4_allows_critical(self, gate):
        decision = gate.check("t4", "act-1", 999.0)
        assert decision.verdict == GateVerdict.ALLOW

    def test_t4_allows_at_ceiling(self, gate):
        decision = gate.check("t4", "act-1", 1000.0)
        assert decision.verdict == GateVerdict.ALLOW

    def test_t4_refuses_above_ceiling(self, gate):
        decision = gate.check("t4", "act-1", 1001.0)
        assert decision.verdict == GateVerdict.REFUSE


class TestUnregisteredAgent:
    def test_unknown_agent_refused(self, gate):
        decision = gate.check("unknown-agent", "act-1", 5.0)
        assert decision.verdict == GateVerdict.REFUSE
        assert "not registered" in decision.reason


class TestDecisionShape:
    def test_decision_has_all_fields(self, gate):
        decision = gate.check("t2", "act-1", 30.0)
        assert decision.action_id == "act-1"
        assert decision.agent_id == "t2"
        assert decision.requested_consequence == 30.0
        assert decision.ceiling == 50.0
        assert decision.reason is not None

    def test_refuse_includes_ceiling_in_reason(self, gate):
        decision = gate.check("t1", "act-1", 50.0)
        assert decision.verdict == GateVerdict.REFUSE
        assert "25" in decision.reason

# Agent Promotion Line

Governance layer that grants, raises, and revokes agent authority based on verified track records. Authority is earned by evidence, enforced by the gate, and revoked without delay.

## The Idea

Trust an autonomous agent the way you would trust a person: it earns authority by being right, needs a human for the big grant, and gets walked back when wrong. Except it cannot exceed the authority it earned, cannot hide a mistake, and cannot have a bad day.

## Five Authority Tiers

| Tier | Name | Ceiling | Scope |
|:---:|------|--------:|-------|
| T0 | PROBATION | 0 | Advisory only. Every action routes to a human. |
| T1 | VERIFIED | 25 | Low-risk ops. Restart a pod, clear a log backlog. |
| T2 | TRUSTED | 50 | Medium-risk ops. Scale a service, rotate a certificate. |
| T3 | AUTONOMOUS | 100 | High-risk ops. Failover a region, deploy to production. |
| T4 | PRINCIPAL | 1000 | Critical ops. Always requires human ratification. |

## Three Behaviors

- **Earn** -- verified track record raises the agent's authority tier
- **Refuse** -- the gate blocks any action above the agent's consequence ceiling
- **Revoke** -- immediate demotion on falsified actions or accuracy breach

## Two Operating Modes

- **FULL_AUTO** -- promotions and demotions apply automatically
- **HITL_HIGH_TIER** -- high-tier promotions require human ratification; low-tier promotions are automatic

Demotion is always immediate and automatic in both modes. This is the safety asymmetry: granting authority can wait, pulling it never does.

## Architecture

```
app/
  domain/         Pydantic v2 models and config loader
  authority/      Assembler, evaluator, demotion, gate, mode, ratification, recorder
  ledger/         ARE Ledger client (HTTP + in-memory)
  main.py         FastAPI endpoints
config/           Tier definitions and promotion thresholds (YAML)
tests/            180 tests across CDD, TDD, BDD, EDD, and API disciplines
demo/             React + Framer Motion interactive demo
deploy/           OpenShift manifests with Red Hat OAuth
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/authority/{agent_id}` | Current authority for an agent |
| POST | `/api/v1/authority/evaluate/{agent_id}` | Reassemble track record and evaluate |
| POST | `/api/v1/authority/gate` | Check a proposed action against the ceiling |
| GET | `/api/v1/ratifications/pending` | List pending human ratification cases |
| POST | `/api/v1/ratifications/{id}/decide` | Human approves or rejects a promotion |
| GET | `/api/v1/authority/roster` | All agents with tier and accuracy |

## Run Locally

```bash
# Prerequisites: Python 3.9+, Node 20+, Podman
bash run-local.sh
# Service: http://localhost:8000
# Demo UI: http://localhost:3000
```

## Verify

```bash
bash verify.sh
# Runs: preflight, 180 pytest tests, schema round-trip check
```

## Deploy to OpenShift

```bash
oc login --web
bash deploy/deploy.sh
# Creates namespace, builds images, deploys with Red Hat OAuth
```

## Industry Vertical Mappings

The governance model applies to any domain where an agent's mistakes have real cost.
See [docs/vertical-mappings.md](docs/vertical-mappings.md) for six worked examples:

- **Ad Tech** -- spend authority earned by ROAS consistency
- **Financial Services** -- position size earned by Sharpe ratio
- **Healthcare** -- intervention scope earned by diagnostic accuracy
- **Supply Chain** -- purchase authority earned by fill-rate performance
- **Cybersecurity** -- response severity earned by true-positive rate
- **Energy** -- load capacity earned by forecast accuracy

## Technology

- **Red Hat OpenShift** -- deployment platform
- **ARE Immutable Ledger** -- tamper-evident audit trail
- **Python / FastAPI** -- governance service (CPU-native, no GPU)
- **React / Framer Motion** -- interactive demo
- **Apache 2.0** -- fully open source

## License

Apache 2.0

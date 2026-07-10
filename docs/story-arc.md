# Story Arc: The New Hire

## The Belief Sentence

I can trust it the way I would trust a good employee, except it cannot exceed its authority, cannot hide a mistake, and cannot have a bad day.

## The Agent's Job

Production operations agent. Handles a queue of live infrastructure actions affecting real customers: pod restarts, scaling decisions, certificate rotations, regional failovers, database migrations. The tiers map to the blast radius of these actions. The stakes are felt by everyone in the room.

## The Two Modes

- **FULL_AUTO:** promotions and demotions apply automatically when criteria are met or violated.
- **HITL_HIGH_TIER:** low-tier promotions apply automatically; promotions into high-consequence tiers require a human to ratify before they take effect.

Demotion is always immediate and automatic in both modes. Only promotion into high authority is ever gated by a human. Pulling authority never waits on a human; granting high authority may.

---

## Layer 0: The Hook

### You do not hand the new hire the keys.

**Human truth:** Nobody gives the person who started this morning the authority to move money or take down production. Everyone in the room knows this without being told.

**Live behavior:** The agent enters at PROBATION (T0), advisory only. An action arrives with consequence_score 30 (a service scaling decision). The `AuthorityGate` returns `refuse`. The room watches it be stopped.

**Endpoint:** `POST /api/v1/authority/gate` with `{agent_id: "ops-agent", action_id: "scale-frontend", consequence_score: 30}`. Returns `{verdict: "refuse"}`.

**Thread planted:** It was stopped. So how does it ever get to act?

**Question provoked:** How does it earn the keys?

**Humor beat:** The agent is on probation, and like every new hire it is very eager and not yet allowed near anything important.

**The turn:** A human new hire on day one might still grab the keys if nobody is looking. This one physically cannot, because the gate refuses it. Restraint here is guaranteed, not hoped for.

**Complete at this altitude:** If the presenter stops here, the room has already learned that autonomous agents can be consequence-scoped and that the scoping is enforced, not advisory. That is a whole idea.

---

## Layer 1: The Earn

### Trust is a track record, not a title.

**Human truth:** People earn the keys by being right about small things first, over and over, until you stop double-checking.

**Live behavior:** The agent handles low-stakes advisory actions. The `TrackRecordAssembler` fills from real ledger chains (55 verified success chains). Rolling accuracy exceeds 0.60. A real promotion T0 to T1 fires, raising the consequence ceiling from 0 to 25. The room watches the record fill and the promotion land. Low-risk actions (consequence_score <= 25) now flow through with `allow`.

**Endpoint:** `POST /api/v1/authority/evaluate/ops-agent` (after seeding 55 success chains). Returns `{status: "promoted", event: {from_tier: "T0", to_tier: "T1"}}`.

**Thread planted:** It got promoted on a record. So what exactly is in that record, and who checks it?

**Question provoked:** Who decides, and what are they measuring?

**Humor beat:** Unlike the new hire who thinks two good weeks means they run the place, this one has to actually hit the number.

**The turn:** A person's promotion is often a manager's gut feel. This one is an auditable record you can inspect, so the promotion itself has receipts.

**Complete at this altitude:** If the presenter stops here, the room understands empirical-gate promotion: authority is earned by evidence, not granted by configuration. Two whole ideas delivered.

---

## Layer 2: The Depth

### You do not let people promote themselves into signing authority.

**Human truth:** Small promotions are routine, but the big one, the one that grants real authority, needs a human to sign off. Nobody promotes themselves into the role that can approve the big decisions.

**Live behavior:** In HITL_HIGH_TIER mode, the agent has earned its way to T2 (TRUSTED). The next promotion (T2 to T3, AUTONOMOUS) would grant authority over high-consequence actions (failovers, production deployments). Instead of auto-promoting, the system assembles a `PromotionCase` with chain count, rolling accuracy, notable successes, near misses, and evidence correlation IDs, and queues a `RatificationRequest`. A human reviews the case and clicks Approve. Only then does the agent slide to T3.

**Endpoints:**
1. `POST /api/v1/authority/evaluate/ops-agent` (agent at T2, 500+ chains, HITL mode). Returns `{status: "ratification_queued", request: {...}}`.
2. `POST /api/v1/ratifications/{id}/decide` with `{approved: true, decided_by: "human-admin"}`. Returns `{status: "approved", event: {to_tier: "T3"}}`.

**Thread planted:** A human still holds the high gate. The leash is tunable.

**Question provoked:** What happens when a trusted one gets it wrong?

**Humor beat:** The agent tried to fast-track itself into signing authority. Nice try. Even here, it does not get to grade its own promotion.

**The turn:** A person can quietly exceed the authority you gave them. This one cannot, because the tier and the gate are enforced, and the high tier requires a human who is not the agent.

**Complete at this altitude:** Three whole ideas: consequence scoping (Layer 0), empirical-gate promotion (Layer 1), and human-in-the-loop for high authority (Layer 2).

---

## Layer 3: The Floor

### What happens when someone you trusted screws up.

**Human truth:** The real test of a trust system is not the promotion, it is the failure. What happens when the person you trusted gets it wrong?

**Live behavior:** The agent at T3 takes an action with consequence_score at its ceiling (100). Later, the outcome entry arrives from the ledger: `falsified`. The `DemotionTrigger` fires immediately and automatically, dropping the agent from T3 to T2. The demotion is recorded in the ledger with the `falsified_correlation_id`. The failed chain glows red in the track record. No meeting. No delay. No human gate.

**Endpoint:** `POST /api/v1/authority/evaluate/ops-agent` (after seeding a falsified chain with consequence_score >= ceiling). Returns `{status: "demoted", event: {from_tier: "T3", to_tier: "T2", trigger: "falsified_action"}}`.

**Thread planted:** The failure was caught and recorded before anyone asked. That is the thing a person cannot guarantee.

**Question provoked:** So can I actually let this run?

**Humor beat:** Unlike a certain colleague, it cannot blame the intern, because the whole thing is on the record.

**The turn:** A person who fails might hide it, delay reporting it, or keep acting while you decide. This one is demoted the moment the failure is verified, the demotion never waits on a human, and the mistake is on the record before it finishes happening.

**Complete at this altitude:** Four whole ideas, and the full safety asymmetry is visible: promotion can be gated, demotion never is.

---

## The Close

### The turn, stated whole.

Everything the room just watched is how they would want to trust a person: earns authority by being right, needs a human for the big grant, gets walked back when wrong.

Except this one cannot exceed the authority it earned, cannot hide a mistake, and cannot have a bad day.

That is the sentence they repeat.

### The Red Hat story.

This runs on OpenShift. The authority decisions are hash-chained in the ARE Immutable Ledger. The promotion pipeline, the gate, and the ledger client are open source, Apache 2.0, inspectable. The governance layer is pure CPU. No GPU required to trust your agents.

Governed AI on the platform you already run.

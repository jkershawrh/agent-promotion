# Vertical Mappings: Agent Promotion Line

The governance model is domain-agnostic. The five tiers, the earned-not-granted
promotion, the instant demotion, and the human gate for high authority all map
directly to any industry where an autonomous agent's mistakes have real cost.

The only thing that changes per vertical is what "consequence_score" measures.

---

## 1. Ad Tech / Programmatic Media

**The agent:** Campaign optimization agent. Adjusts bids, reallocates spend
across channels, pauses underperformers, launches new creatives.

**Consequence score:** Daily spend authority in dollars.

| Tier | Name | Ceiling | What it can do |
|:---:|------|--------:|----------------|
| T0 | PROBATION | $0 | Recommends bid adjustments. Cannot execute. |
| T1 | VERIFIED | $500/day | A/B test budgets. Single-channel micro-campaigns. |
| T2 | TRUSTED | $5K/day | Mid-tier campaigns. Cross-channel rebalancing. |
| T3 | AUTONOMOUS | $50K/day | Major campaign launches. Platform-wide optimization. |
| T4 | PRINCIPAL | $500K/day | Brand campaigns, upfront commitments. Always human-ratified. |

**Promotion earned by:** ROAS consistency and conversion accuracy over N campaign cycles.

**Demotion triggered by:** Campaign burns budget with ROAS below the floor,
or spend velocity exceeds forecast by more than the variance threshold.

**The turn:** Unlike the media buyer who quietly shifts budget hoping nobody
notices the underperformer, this one loses spend authority the moment
performance drops. And unlike the buyer who got lucky on one viral campaign
and now manages a $2M book, this one earned every dollar of its ceiling
through verified results.

---

## 2. Financial Services / Algorithmic Trading

**The agent:** Trading execution agent. Generates signals, sizes positions,
manages entries and exits across instruments.

**Consequence score:** Notional position size.

| Tier | Name | Ceiling | What it can do |
|:---:|------|--------:|----------------|
| T0 | PROBATION | $0 | Paper trading. Advisory signals only. |
| T1 | VERIFIED | $10K | Small positions in liquid large-caps. |
| T2 | TRUSTED | $100K | Cross-asset positions. Multi-instrument. |
| T3 | AUTONOMOUS | $1M | Multi-leg strategies. Options spreads. |
| T4 | PRINCIPAL | $10M+ | Portfolio-level rebalancing. Always human-ratified. |

**Promotion earned by:** Sharpe ratio above threshold and max drawdown below
limit over N trades within the rolling window.

**Demotion triggered by:** Drawdown exceeds the tier threshold, or a position
violates the risk limit at or above the ceiling.

**The turn:** Unlike the rogue trader who doubles down to recover a loss,
this one has its position limit cut before the next order can fire. And
unlike a risk manager who finds out about the breach in the morning meeting,
the demotion happens in the same cycle as the loss.

---

## 3. Healthcare / Clinical Decision Support

**The agent:** Treatment recommendation agent. Suggests diagnostics,
flags contraindications, recommends protocol adjustments.

**Consequence score:** Patient acuity multiplied by intervention
reversibility (0 = routine vitals, 1000 = irreversible critical intervention).

| Tier | Name | Ceiling | What it can do |
|:---:|------|--------:|----------------|
| T0 | PROBATION | 0 | Suggests diagnostic tests. Cannot order. |
| T1 | VERIFIED | 25 | Orders routine labs, schedules follow-ups. |
| T2 | TRUSTED | 50 | Recommends medication adjustments within established protocols. |
| T3 | AUTONOMOUS | 100 | Proposes treatment plan changes, dose modifications. |
| T4 | PRINCIPAL | 1000 | Critical care decisions. Always physician-ratified. |

**Promotion earned by:** Diagnostic accuracy and protocol adherence over N
patient encounters.

**Demotion triggered by:** Adverse outcome or near-miss on a high-acuity
patient at or above the agent's consequence ceiling.

**The turn:** Unlike the fatigued resident at hour 18 who might miss a
contraindication, this one's authority is calibrated to its demonstrated
accuracy, not how long it has been awake. And unlike a credentialing board
that reviews privileges once a year, this one is re-evaluated on every outcome.

---

## 4. Supply Chain / Procurement

**The agent:** Procurement optimization agent. Forecasts demand, places
purchase orders, manages vendor relationships, handles reorder points.

**Consequence score:** Purchase order value in dollars.

| Tier | Name | Ceiling | What it can do |
|:---:|------|--------:|----------------|
| T0 | PROBATION | $0 | Suggests reorder quantities. Cannot place orders. |
| T1 | VERIFIED | $1K | Office supplies, consumables, approved catalog items. |
| T2 | TRUSTED | $25K | Standard materials, approved vendor list. |
| T3 | AUTONOMOUS | $250K | Strategic sourcing, multi-vendor negotiations. |
| T4 | PRINCIPAL | $1M+ | Sole-source contracts, long-term commitments. Always human-ratified. |

**Promotion earned by:** Fill-rate accuracy and cost-variance performance
over N purchase cycles.

**Demotion triggered by:** Stockout on a critical production line, or
cost overrun exceeding the variance threshold on a PO at or above ceiling.

**The turn:** Unlike the procurement manager who approves a vendor because
they always have, this one earns vendor authority by consistently delivering
on-time and on-budget. And unlike the buyer who negotiated a great deal once
and now signs everything without scrutiny, this one's authority tracks its
recent performance, not its best quarter.

---

## 5. Cybersecurity / SOC Automation

**The agent:** Incident response agent. Triages alerts, enriches context,
contains threats, initiates response playbooks.

**Consequence score:** Business disruption potential of the response action
(0 = enrich an alert, 1000 = network-wide isolation).

| Tier | Name | Ceiling | What it can do |
|:---:|------|--------:|----------------|
| T0 | PROBATION | 0 | Enriches alerts with threat intel. Cannot respond. |
| T1 | VERIFIED | 25 | Blocks individual IPs, quarantines single endpoints. |
| T2 | TRUSTED | 50 | Isolates network segments, disables compromised accounts. |
| T3 | AUTONOMOUS | 100 | Initiates failover, revokes certificates, triggers IR playbooks. |
| T4 | PRINCIPAL | 1000 | Network-wide response. Always human-ratified. |

**Promotion earned by:** True-positive rate and mean-time-to-contain over
N triaged incidents.

**Demotion triggered by:** False positive that causes business disruption
(blocked legitimate traffic, disabled a production account) at or above
the response severity ceiling.

**The turn:** Unlike the analyst who hesitates to escalate at 3 AM, this
one responds in milliseconds. And unlike the analyst who might overreact
and block production traffic, it physically cannot execute a response
above its authority. The speed is there. The overreach is not.

---

## 6. Energy / Grid Operations

**The agent:** Grid balancing agent. Forecasts demand, dispatches generation,
manages load shedding and frequency regulation.

**Consequence score:** Megawatts of load capacity affected.

| Tier | Name | Ceiling | What it can do |
|:---:|------|--------:|----------------|
| T0 | PROBATION | 0 MW | Forecasts demand. Advisory only. |
| T1 | VERIFIED | 10 MW | Single plant dispatch adjustments. |
| T2 | TRUSTED | 100 MW | Multi-plant coordination. Demand response signals. |
| T3 | AUTONOMOUS | 500 MW | Regional load shedding. Emergency dispatch. |
| T4 | PRINCIPAL | Grid-wide | System-wide actions. Always human-ratified. |

**Promotion earned by:** Forecast accuracy and frequency deviation
performance over N balancing intervals.

**Demotion triggered by:** Frequency deviation exceeds threshold on a
balancing action at or above the MW ceiling, or a dispatch command
causes a reliability event.

**The turn:** Unlike the grid operator who has four seconds to decide
during a cascade event, this one acts in milliseconds. But unlike a
misconfigured SCADA relay that trips an entire region, it cannot shed
more load than its authority allows. Speed without overreach.

---

## The Pattern

Every vertical has the same shape:

```
consequence_score = the domain's natural risk metric
ceiling          = how much risk this agent is allowed to take
promotion        = verified track record raises the ceiling
demotion         = failure at the ceiling drops it immediately
HITL gate        = high-authority promotion requires a human
```

The governance layer does not change. The configuration does.

**The sentence that works in every room:**

> It earns authority by being right, needs a human for the big grant,
> and gets walked back when wrong. Except it cannot exceed the authority
> it earned, cannot hide a mistake, and cannot have a bad day.

That sentence is true whether the consequence is dollars, megawatts,
patient acuity, or network segments. The math is different. The
governance is the same.

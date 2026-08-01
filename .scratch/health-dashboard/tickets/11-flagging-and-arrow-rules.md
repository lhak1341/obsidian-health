---
id: "11"
title: "Define flagging & auto-arrow computation rules"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: ["02", "04"]
---
# Define flagging & auto-arrow computation rules

## Question

The data model (ticket 02) now *stores* everything the attention logic needs — `ranges` (sex+age-banded),
two-tier `optimal_low`/`optimal_high` + `direction`, `type`, qualitative `normal:`, and a **date-keyed**
per-marker series. The vision (ticket 04) fixed *how* flags and arrows show. This ticket defines the exact
**computation**:

- **Trend arrow:** given the date-keyed series for a marker, what defines the arrow at a visit — delta vs the
  immediately-prior visit? vs a baseline? What magnitude counts as flat vs up/down (absolute, %, or
  within-noise threshold)? How does `direction` (lower_better/higher_better/within) map a numeric move to
  good/bad *color*? Handle holes (skipped visits) and a single data point (no arrow).
- **Out-of-range flag (tier 1):** reading vs the resolved lab `ranges` band (by sex + age-at-visit). One-sided
  ranges (only `high`, only `low`). What about a reading exactly on a bound?
- **Two-tier personal-target flag (tier 2):** reading inside lab-normal but outside `optimal_*` — the "inside
  normal but not optimal" state the vision makes visible (ALT < 30, homocysteine < 9, TG:HDL < 2, LDL
  lower_better, fasting glucose ceiling). Precedence when tier-1 and tier-2 both fire.
- **Qualitative flag:** reading ∉ `normal:` set → attention. Any severity distinction (Positive vs borderline)?
- **Derived markers:** compute the value from inputs first (ticket 02 `formula`), then apply the same
  range/target/arrow rules — confirm no special-casing.
- **Attention ranking:** the vision groups flagged markers as the hero. What orders them — severity (how far
  out of range), tier, recency of worsening? This feeds the concern-grouped scan.

Deliver the rule set precise enough to implement, keyed to the ticket-02 fields. Use `/grilling`; a
`/prototype` of the rules against the real 2020–2025 series is encouraged.

## Resolution

Full rule set: [research/11-flagging-arrow-rules.md](../research/11-flagging-arrow-rules.md). Settled via grilling — 6 forks + 3 confirmed defaults. Nothing stored; all derived on read from the ticket-02 notes.

- **Arrow:** latest vs immediately-prior numeric visit (gaps skipped; single point / qualitative = none). **±3% deadband** (tunable) → flat, applied consistently to color + ranking. Color: lower_better/higher_better green-if-healthy-move / red; band neutral in-range, colored toward/away nearest bound when out of range.
- **Status (one per marker, precedence high):** `high` red (numeric > range.high, or qualitative ∉ normal) · `low` blue (< range.low) · `watch` orange (in-range but past `optimal_*`) · `good` green. **Tier-1 (range + qualitative-abnormal) outranks tier-2 (target).** Bounds inclusive.
- **Qualitative abnormal** = tier-1 red (no sub-grades, neutral arrow).
- **Attention rank:** tier → normalized magnitude past the violated bound → worsening tie-break; qualitative-abnormals top of tier 1.
- **Group header dot** = worst member status. **Derived** = compute per visit then apply identical rules; missing input = gap.

**Hand-off to the build (via PRD):** the look mockup (ticket 05) already implements a first-cut; deltas to apply = add the 3% deadband, add magnitude to the attention sort, and make qualitative-abnormal red/tier-1 (mock currently orange/watch).

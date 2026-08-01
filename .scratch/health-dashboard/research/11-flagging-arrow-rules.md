# Flagging & auto-arrow computation rules

_Asset for ticket 11. The exact rules that turn stored readings (data model, ticket 02) into the
arrows, flags, and attention ranking the vision (ticket 04) / look (ticket 05) display._
_Keyed to ticket-02 fields; settled via grilling (6 forks + confirmed defaults)._

## Inputs (from the data model, ticket 02)

Per marker note: `type` (numeric | qualitative | derived), `ranges` (sex+age-banded, `low`/`high` each
optional), `optimal_low`/`optimal_high` (tier-2 target, each optional), `direction`
(lower_better | higher_better | within), `normal:` (qualitative expected set), `formula` (derived).
Per visit: the date-keyed reading. Range band resolved by the profile's sex + age-at-visit.

## 1. Series & prep

- A marker's **series** = its readings ordered by visit `date`, gaps (skipped visits) simply absent.
- **latest** = most recent reading; **prior** = most recent *earlier* reading with a numeric value
  (holes skipped).
- **Derived markers:** compute the value per visit from `formula` inputs **first**, then treat exactly
  like a stored numeric marker. If any input is missing at a visit, that visit's derived value is a
  **gap** (no point, no arrow) — no special-casing anywhere else.

## 2. Trend arrow (per marker, at latest visit)

- Baseline = **latest vs immediately-prior numeric visit** (skips gap years). Single data point → **no
  arrow**. Qualitative markers → **no arrow** (no numeric trend; neutral dash).
- **Flat deadband:** if `|latest − prior| / |prior|` < **3%** (tunable in settings) → **flat** (neutral
  dash). The deadband is consistent everywhere: a sub-threshold move is neither *worsening* nor
  *recovering* for color and ranking.
- **Direction** of the arrow = sign of `latest − prior` (▲ up / ▼ down).
- **Color:**
  - `lower_better` / `higher_better` → **green** if the move is in the healthy direction, **red** if
    against it.
  - `within` (band) → **neutral gray** while the reading is in range (normal wiggle carries no good/bad);
    when the reading is **out of range**, color by **toward vs away from the nearest bound** — green if
    moving back toward the band, red if moving further out.

## 3. Status (one per marker; precedence top-down)

Resolve range band by sex + age-at-visit; **bounds are inclusive** (a reading exactly on a bound counts
as *in* range / *in* target).

| # | Status | Color | Condition |
|---|--------|-------|-----------|
| 1 | `high` | red | numeric `latest > range.high`, **or** qualitative `latest ∉ normal` |
| 2 | `low` | blue | numeric `latest < range.low` |
| 3 | `watch` | orange | in lab-range, but past personal target (`latest > optimal_high` or `latest < optimal_low`) |
| 4 | `good` | green | none of the above |

- **Tier 1** = out-of-range (`high`/`low`) + qualitative-abnormal. **Tier 2** = `watch` (past personal
  target, still in lab-range). **Tier 1 outranks tier 2** — a reading past both shows the tier-1 status.
- **Qualitative abnormal** (reading ∉ `normal:` set) = tier-1 `high` equivalent (red), no severity
  sub-grades.
- One-sided ranges/targets (only `high` or only `low`) only fire on the side that exists.

## 4. Concern-group header status

Group header dot = **worst status among its markers**: red (`high`) > blue (`low`) > orange (`watch`) >
green (`good`).

## 5. Attention ranking (the hero order, most urgent first)

Flagged = any marker whose status ≠ `good`. Sort by, in order:

1. **Tier** — tier-1 (out-of-range + qualitative-abnormal) above tier-2 (`watch`).
2. **Magnitude** — within tier, normalized distance past the violated bound, most extreme first:
   `(latest − bound) / bound` for the relevant bound (range bound for tier 1, target bound for tier 2).
   **Qualitative abnormals have no magnitude → rank at the top of tier 1.**
3. **Worsening** — tie-break: a marker moving the bad way (per §2, above deadband) ranks above one that's
   stable or recovering.

This ordering drives both the "Needs attention" hero and the concern-grouped scan.

## Decisions ledger

| # | Fork | Decision |
|---|------|----------|
| 1 | Arrow baseline | latest vs immediately-prior numeric visit; single point / qualitative = no arrow |
| 2 | Flat threshold | ±3% percentage deadband, tunable in settings; consistent for color + ranking |
| 3 | Arrow color | directional colored good/bad; band neutral in-range, colored toward/away bound when out of range |
| 4 | Status levels | 4 levels (high=red, low=blue, watch=orange, good=green); high≠low; tier1 (range) > tier2 (target) |
| 5 | Qualitative flag | reading ∉ normal set = tier-1 red; no sub-grades; neutral arrow |
| 6 | Attention rank | tier → normalized magnitude → worsening; qualitative-abnormal top of tier 1 |
| D1 | Bounds | inclusive (on-bound = in range/target) |
| D2 | Derived | compute per visit then apply identical rules; missing input = gap |
| D3 | Group dot | worst member status |

## Consistency notes

- The look mockup (ticket 05) already implements a first-cut (`statusKey`, `arrow`, `tgtStatus`,
  `buildAttention`). Deltas to apply when building: add the **3% deadband**, add **magnitude** to the
  attention sort (mock uses tier + rising only), and make **qualitative-abnormal red/tier-1** (mock
  currently treats it as `watch`/orange). Everything else matches.
- Nothing here is stored — all derived on read from the ticket-02 notes; recomputes when a reading,
  range, target, or profile (sex/dob → age-at-visit) changes.

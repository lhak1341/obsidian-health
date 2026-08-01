# Data model & source of truth

_Asset for ticket 02. The structured shape the plugin reads, replacing the one hand-maintained table._
_Settled via grilling; 14 forks + 2 stress-tests (repeat tests, unit-on-entry)._

## Principle

Three kinds of vault note, all frontmatter-first. **The notes are canonical**; `.base` files are
views over them; the plugin reads the notes directly **and** registers a custom Bases view (per
ticket 01) so concern-headers open filtered Base views. One consistent vocabulary; **a new metric is
a new marker note, never a schema change**.

```
profiles/<person>.md   — constants per person   (sex, dob, blood type, allergies)
markers/<id>.md        — static registry         (name, unit, ranges, target, panel, concern, formula, blurb)
health/labs/<date>.md  — one per lab visit        (bare readings, keyed by marker id)
```

---

## 1. Visit note — `health/labs/<date>.md`

**Grain = one note per lab visit (draw/report date), NOT per calendar year.** A test repeated within a
year is simply a second visit note. This refines the map's earlier "one note per year" direction.

```yaml
---
type: lab-visit        # discovery gate — plugin + Base filter on this one predicate
person: lhak           # → profiles/lhak.md (defaulted/implicit for single-user today)
date: 2025-07-23       # canonical key; filename is cosmetic. Gap (2021) = no note exists
wbc: 5.16              # flat key = marker id; bare native scalar
neut_pct: 53.7
alt: 22
chol: 5.1              # stored in the marker's CANONICAL unit (see §4)
bp_sys: 118
bp_dia: 76
hbsag: Negative        # qualitative marker = bare string
psa: ">1,000"          # censored/qualitative = string
# ferritin absent      # test skipped this visit = key OMITTED (holes handled downstream)
---
(body = free-form notes for this visit)
```

- **Values:** numeric → bare number; qualitative → string; **skipped → omit the key** (Bases + plugin
  + sparklines treat missing cleanly).
- **No stored trend arrows.** Arrows are derived by the plugin from the time series — that's the whole
  point (kill manual upkeep).
- **Time series is keyed by `date`**, so a year can contribute multiple points; "year" is only a
  display bucket.
- **Same-day genuinely-different readings** (fasting vs post-prandial glucose) are modelled as
  **distinct marker ids** (`glucose_fasting`, `glucose_pp`), not a grain problem.

## 2. Marker note — `markers/<id>.md`

Static per-marker metadata, **separate from measurements**. **id = note basename** (stable snake_case);
the frontmatter key in a visit note joins to it by basename. Body holds the clinical "what it means"
blurb (feeds tooltips / meaning-in-place).

```yaml
---
name: Alanine aminotransferase
aliases: [ALT, SGPT]          # display + matching legacy/source names
type: numeric                 # numeric | qualitative | derived
unit: U/L                     # canonical unit stored in visit notes
# dual-unit markers:
#   alt_unit: mg/dL
#   alt_factor: 38.67         # canonical = reported_in_alt_unit / alt_factor
panel: biochemical            # SINGLE — mirrors the lab report (Blood/Biochemical/Antigen/Urine)
concern: [liver]              # MULTI — dashboard clinical buckets; a marker may span several
ranges:                       # lab reference range — sex + age-banded list; low/high each OPTIONAL
  - {sex: any, age: [0, 120], low: 0, high: 41}
# tier-2 personal target (separate from ranges):
optimal_high: 30              # optimal_low / optimal_high each optional
direction: lower_better       # lower_better | higher_better | within — also colors trend arrows
---
ALT is a liver enzyme. Elevated levels suggest hepatocellular injury...
```

**Range resolution** picks the band whose `sex` matches the person and whose `age` window contains
**age-at-visit** = `visit.date − profile.dob`. Handles sex-specific (already in the data) and
age-dependent markers (PSA bands, pediatric) with no redesign. Lab-to-lab variance is **not** modelled —
a range is treated as canonical per (sex, age); the per-lab caveat is noted, not encoded.

**Variants by `type`:**

```yaml
# qualitative marker — no numeric range; declares expected value(s)
type: qualitative
normal: Negative               # or a list: normal: [Yellow, Straw]. Reading not in set = flagged

# derived marker — computed per visit from other markers, never stored
type: derived
formula: "tg / hdl"            # over other marker ids; recomputes when inputs change
optimal_high: 2
concern: [lipids]

# paired display (BP) — two ordinary numeric markers, grouped only for presentation
# markers/bp_sys.md:  pair: bp, order: 1   (own range)
# markers/bp_dia.md:  pair: bp, order: 2   (own range)   → UI renders "118/76"
```

**Vitals** (BP, weight, BMI) are ordinary markers — same shape as labs. No special non-scalar type.

## 3. Profile note — `profiles/<person>.md`

Constants per person, not a time series. **Sex + dob are load-bearing** — the range resolver reads them.

```yaml
---
sex: m
dob: 1990-04-12
blood_type: O+
allergies: [penicillin]
---
```

**Person dimension is present** (`person:` key on visit notes) but single-user today. Family-profiles
(ticket 10) just adds more profile notes + sets `person:` — no redesign. Until then `person:` may be
defaulted/implicit.

## 4. Units on data entry

Stored value is **always the canonical unit**. When the lab reports the alt unit, the **data-entry
workflow (ticket 06) converts on input** using the marker note's `alt_factor` — the user picks the
unit they're reading and the form does the math. No manual conversion; no mixed units in storage, so
Bases + trend logic stay consistent.

→ **Requirement handed to ticket 06:** the entry form offers a per-marker unit picker (canonical vs
`alt_unit`) and converts to canonical before writing.

---

## What this deliberately does NOT define

- **Flagging & auto-arrow computation** — the exact rules that read `ranges` + `optimal_*` + `direction`
  + the date-keyed series to produce arrows and attention flags. This model *stores enough* for them;
  the rules are the "Flagging & auto-arrow rules" fog (now unblocked — the model stores personal targets).
- **Add-test / package planner** schema — separate fog.
- **The `.base` view definitions** and the plugin's registered Bases view — downstream of the look
  ticket (05) and PRD assembly.

## Decisions ledger (the 14 + 2)

| # | Fork | Decision |
|---|------|----------|
| 1 | Measurement store | flat frontmatter keys per visit note |
| 2 | Marker registry | one note per marker in `markers/` |
| 3 | Marker key | id = note basename; `aliases` for display/matching |
| 4 | Range shape | sex + age-banded list; low/high optional |
| 5 | Value types | native scalar / string / omit-if-absent; `type` on marker; arrows derived |
| 6 | BP | two ordinary markers, `pair`/`order` display-grouped |
| 7 | Dual units | store canonical + `alt_unit`/`alt_factor` |
| 8 | Derived markers | `type: derived` + `formula` over marker ids |
| 9 | Profile facts | `profiles/<person>.md`; `person:` key on visit notes |
| 10 | Source of truth | notes canonical; `.base` = views; plugin also registers a Bases view |
| 11 | Note discovery | folder + `type: lab-visit` gate + `date` + `person` |
| 12 | Grouping | `panel` (single) + `concern` (multi) |
| 13 | Target shape | `optimal_low`/`optimal_high` (optional) + `direction` |
| 14 | Qualitative normal | `normal:` value(s) on the marker note |
| S1 | Repeat tests / grain | one note **per visit/draw-date**, not per year; series keyed by `date` |
| S2 | Unit on entry | entry form (ticket 06) converts; storage stays canonical |

---
id: "02"
title: "Decide the data model and source of truth"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: ["01", "04"]
---
# Decide the data model and source of truth

## Question

Define the structured data the plugin reads, replacing the one hand-maintained table. Decide:

- **File layout:** one note per year (confirmed direction) — folder, naming, and what one note holds
  (all panels for that visit? frontmatter vs body table?).
- **Marker identity & metadata:** how each marker (WBC, ALT, Uric acid…) is keyed, and where its *static*
  metadata lives (full name, unit, sex-specific reference range, clinical-info blurb) — separate from the
  per-visit *measurements*. Today both are scattered across the note + reference tables.
- **Value modelling:** numeric values, units (some markers carry dual units mmol/L + mg/dL), and
  qualitative results (Negative / Normal / ">1,000").
- **Messy-data requirements — the model must survive all of it:**
  - **Reference-range provenance:** ranges vary by lab, sex, and age (PSA is age-dependent; the note itself
    warns ranges differ per lab). Decide whether a range is a single canonical value or scoped to lab/year/age.
  - **Gaps:** many cells are empty (test skipped that year) — trend logic and sparklines must handle holes.
  - **Qualitative results:** Negative / Normal / ">1,000" are not numerically plottable; model them alongside numerics.
- **Personal targets (two-tier):** store the user's *personal* target/threshold per marker separately from the
  lab "normal" range (e.g. ALT < 30, homocysteine < 9, LDL "as low as possible", TG:HDL ratio). The
  attention logic reads these, not just lab-normal. (See the vision ticket 04.)
- **Vitals as first-class markers (scope, ticket 07):** BP, weight, BMI come in the same annual report and
  must model the same way as labs (value + unit + range + trend). BP is two numbers (systolic/diastolic) —
  the model must handle a marker that isn't a single scalar. Imaging is out of scope; don't model it.
- **Extensibility (scope, ticket 07):** adding a new numeric metric later (body-comp, waist, resting HR,
  wearable summary) must need **no redesign** — new marker = new metadata entry, not a schema change.
- **Base-compatibility:** the shape must let an Obsidian Base consume it too (informed by ticket 01).
- **Source of truth (vision, ticket 04):** the vision settled on **the Obsidian Base (and the notes behind it)
  as the record**, with the plugin as a curated overlay that reads it and links concern headers to filtered
  Base views. Confirm the mechanics with ticket 01; the per-year notes/frontmatter are the store.
- **Derived markers (vision, ticket 04):** the model must support computed markers (e.g. TG:HDL ratio)
  defined from other markers, not just stored readings.
- **Static profile facts (vision, ticket 04):** blood type, allergies — constants, not a time series. Model
  them separately from per-visit measurements.
- **Per-person keying + pediatric ranges (vision, ticket 04; gated by ticket 10):** if family profiles are in
  scope, everything keys by person, and **reference ranges must resolve by sex and age-at-visit** (pediatric
  ranges differ from adult and shift with age) — not a single global range per marker. Even single-profile,
  ranges are already sex-specific; the age dimension is the new burden. Design the range lookup accordingly.

Use `/grilling` + `/domain-modeling`; a `/prototype` of the schema against the real 2020–2025 data is
encouraged. This is the foundational decision — most fog graduates once it lands.

## Resolution

Full spec: [research/02-data-model.md](../research/02-data-model.md). Settled via grilling — 14 forks + 2 stress-tests.

**Three note kinds, frontmatter-first, notes canonical (`.base` = views over them):**
- **`health/labs/<date>.md`** — one note **per lab visit** (not per year; a repeat test = another visit note). `type: lab-visit` gate + `person:` + `date:` (the canonical key; gaps = missing note). Readings are **flat keys = marker id → bare scalar**; qualitative = string; skipped test = key omitted; **no stored arrows** (derived). Time series keyed by `date`.
- **`markers/<id>.md`** — static registry, **id = basename**, `aliases` for matching; body = clinical blurb (tooltips). Carries `type` (numeric|qualitative|derived), `unit` (+ `alt_unit`/`alt_factor` for dual units), `panel` (single) + `concern` (multi), `ranges` (**sex + age-banded list**, low/high optional; resolved by sex + age-at-visit), two-tier target `optimal_low`/`optimal_high` + `direction` (lower_better|higher_better|within, also colors arrows). Qualitative → `normal:` value(s); derived → `formula` over ids; BP → two markers `pair`/`order` display-grouped. Vitals are ordinary markers.
- **`profiles/<person>.md`** — constants (sex, dob → range resolver; blood_type, allergies). Person dimension present but single-user today; family-profiles (ticket 10) just switches it on, no redesign.

**Units:** stored value always canonical; the **entry form (ticket 06) converts** on input via `alt_factor` — no manual math, no mixed units. **Extensibility:** new metric = new marker note, never a schema change.

**Hand-offs:** (1) ticket 06 entry form must offer a per-marker unit picker + convert to canonical. (2) The flagging/auto-arrow fog is now unblocked — the model stores personal targets, ranges, direction, and a date-keyed series.

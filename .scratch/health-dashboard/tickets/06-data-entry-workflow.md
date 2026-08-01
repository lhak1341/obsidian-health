---
id: "06"
title: "Design the data-entry workflow — how a new year's results get in"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: ["02"]
---
# Design the data-entry workflow — how a new year's results get in

## Question

Each year adds ~40 values across panels. Today they're hand-typed into the markdown table. Decide how
entry works under the new model (blocked by the source-of-truth decision in ticket 02):

- **Mechanism:** hand-edit a per-year note's frontmatter/table? A plugin form/modal? Paste-and-parse a
  block from the lab report? OCR / import from the lab PDF?
- **Speed & error-proofing:** ~40 values is tedious — how to make entry fast and hard to get wrong
  (validation against known markers, units, plausible ranges).
- **New vs existing markers:** what happens when a year introduces a marker never seen before, or drops one.
- **The arrows are computed, not entered** — confirm entry captures only raw values; trend/flag are derived.
- **Unit conversion at entry (requirement from ticket 02):** the lab may report a marker in its `alt_unit`
  (e.g. mg/dL when canonical is mmol/L). The entry flow must offer a **per-marker unit picker** and convert
  to the canonical unit via the marker note's `alt_factor` **before writing** — storage stays canonical, no
  manual math. Also note grain is **one note per visit/draw-date**, not per year (ticket 02) — entry creates
  a `health/labs/<date>.md`.

Use `/grilling`. Output: the chosen entry flow, referenced by the PRD.

## Resolution

**Primary mechanism: a plugin entry modal** — an "Add lab visit" command opens a form pre-populated
with all known markers (from `markers/` notes), grouped by panel. Once-a-year cadence justifies a
guided form; it's the only option satisfying unit-conversion + validation + new/dropped-marker handling
in one place. Paste-parse/OCR rejected as primary (variable report formats, silent misreads).

**Visit identity — date & edit/create:**
- **Note date = report date** → `health/labs/<date>.md`. Historical snapshots (2020–2025) were recorded
  by report date; draw dates were never captured and can't be backfilled. Yearly cadence + arrow logic
  (orders visits, doesn't measure spacing) makes the draw/report few-days gap irrelevant to trends.
- **Optional `drawn:` frontmatter** — store a collection date only if a future report shows one; never
  the key, never required, never backfilled.
- **Modal does both create and edit** — pick a date that already exists → form loads pre-filled; else
  creates. One command, no separate edit path; typo-fixes get the same validation + unit conversion.

**Field types in the form:**
- **Numeric** → value input + **unit picker** (defaults to canonical unit; alt option = marker's `alt_unit`)
  + live range hint.
- **Qualitative** → **dropdown/combobox** seeded from the marker's `normal:` values + previously-seen
  values, free-text fallback for novel results — prevents typo drift ("Negative" vs "negative") that
  would break flagging.
- **BP** → **single row, two inputs** (`120 / 80`) writing the two paired marker keys.

**Unit conversion — at entry, before write; storage always canonical.** Per numeric row the ordering is:
**pick unit → convert (× `alt_factor`) → validate the canonical value → pre-save summary → write.**
Validation runs on the *converted* value against canonical ranges (a mg/dL number validated against
mmol/L ranges would false-flag). Note stores only the canonical scalar — never the alt unit, never arrows
(arrows/flags are derived on read per ticket 11).

**Validation, three tiers:**
- **Hard block** (can't save): non-numeric text in a numeric field; missing visit date; same marker twice.
- **Soft warn** (yellow, non-blocking): value wildly outside the reference band (>~5× ceiling or <⅕ floor)
  — usually a unit mistake or extra digit; nudges "right unit?". Main defense against the unit-error class,
  and it works *because* it checks the post-conversion number.
- **Never warn** on merely out-of-range — that's the app's signal, not an error.
- **Pre-save summary** lists `entered 90 mg/dL → stores 5.0 mmol/L` per converted row as the eyeball checkpoint.

**New & dropped markers:**
- **New marker** → **inline "+ Add marker"** affordance opens a minimal mini-form (id, unit, panel/concern,
  direction; ranges optional, fill later), creates `markers/<id>.md`, then the row appears — keeps the
  once-a-year flow unbroken when a new test shows up.
- **Dropped marker** → leave the field blank; key is omitted (ticket 02: skipped = omit).

**Entry captures raw values only** — trend arrows and flags are always derived on read (ticket 11),
never entered or stored.

**Deferred / spun off:**
- **One-time historical migration** (5 snapshots → per-visit + `markers/` + `profiles/` notes) → its own
  `task` ticket; distinct one-shot with its own questions (script vs manual, deriving `markers/` from the
  old reference-range columns).
- **Paste-parse / OCR accelerator** → deferred to fog; revisit only if manual entry actually hurts.

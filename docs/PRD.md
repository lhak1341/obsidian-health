---
labels: [ready-for-agent]
title: "Health Dashboard — Obsidian plugin"
tracker: local-markdown
source: "wayfinder map .scratch/health-dashboard/MAP.md (tickets 01–15)"
---

# Health Dashboard — Obsidian plugin

## Problem Statement

Every year I get an annual health-check report — blood, biochemistry, antigen/tumour-marker, and urine panels
plus vitals. Today the results live in one hand-maintained Obsidian note as big markdown tables. That note is
painful and dishonest: I hand-type the year-over-year trend arrows (△/▼), so they rot; I can't tell at a glance
which markers actually need attention this year; seeing a single marker's trajectory means scanning across
columns; understanding what a marker *means* or whether a value is normal means scrolling to reference tables;
and planning which optional tests to add next year lives as loose prose. I also want to track my spouse soon,
which the single flat note can't express. I want the same data to power a real dashboard and a compact glance
widget on my main Obsidian dashboard — without me maintaining anything by hand that a computer could derive.

## Solution

A custom Obsidian plugin ("Health", plugin id `health`) that treats per-visit frontmatter notes as the single
source of truth and derives everything else on read. It presents a one-screen, flat-editorial **Health
Dashboard** where flagged markers are the hero, grouped by clinical concern, with computed trend arrows,
sparklines, click-to-expand history charts, and meaning-on-hover. A guided "Add lab visit" modal makes yearly
entry fast and hard to get wrong, converting units to canonical on input so nothing is stored mixed. A separate
Planner surface tracks the optional-test backlog with cost and priority. A compact two-tier widget in
`lhak-dashboard` shows my status at a glance and links into the full view. The data model already carries a
person dimension, so tracking a spouse is a switcher plus a second profile — no redesign. Because the notes are
frontmatter-first, Obsidian Bases can consume them too, and the plugin both reads the notes directly and
registers a custom Bases view so concern headers open filtered Base views natively.

## User Stories

1. As the owner of years of lab results, I want each lab visit stored as its own note, so that the data is
   structured, greppable, and consumable by both the plugin and Obsidian Bases.
2. As someone who hates busywork, I want year-over-year trend arrows computed automatically, so that I never
   again hand-type or update a △/▼.
3. As a health-conscious user, I want the dashboard to surface which markers need attention this year, so that I
   focus on what matters instead of reading every number.
4. As a user with personal targets stricter than the lab's normal range, I want two-tier flagging (lab range
   *and* my personal optimal), so that a value that's "lab-normal" but past my target still gets flagged.
5. As a user reviewing results, I want flagged markers grouped by clinical concern (lipids, glucose, liver,
   kidney, …), so that related signals read together.
6. As a user scanning a concern group, I want the group to show a single worst-member status dot, so that I can
   triage groups at a glance before expanding.
7. As a user tracking a marker over time, I want a sparkline and current value + arrow on each row, so that I
   see the trajectory without opening anything.
8. As a user who wants detail, I want to click a marker to expand its full history chart inline (accordion), so
   that I can drill in without leaving the dashboard.
9. As a user reading a history chart, I want to see the reference-range band, my personal-target line, and an
   emphasized latest point, so that the value is interpretable in context.
10. As a user who forgets what markers mean, I want the marker's meaning and normal range on hover, so that I
    don't have to hunt reference tables.
11. As a user with ~60 tracked markers, I want a curated default set with a "Show all" toggle, so that the
    dashboard stays scannable but nothing is hidden permanently.
12. As a user, I want curated membership and ordering to require no manual upkeep (ordering follows attention
    rank), so that the important things surface themselves.
13. As a user with qualitative results (Negative, Normal, colour), I want them shown as chips and flagged when
    outside their expected value, so that non-numeric markers are first-class.
14. As a user with blood pressure, I want systolic/diastolic shown as a paired `118/76` reading with a dual
    trend line, so that BP reads naturally.
15. As a user entering a new year's results, I want a guided "Add lab visit" form pre-populated with all known
    markers grouped by panel, so that entering ~40 values is fast.
16. As a user, I want the same modal to create a new visit or edit an existing one by picking a date, so that
    fixing a typo uses the same validated path.
17. As a user whose lab reports a value in a different unit than I store, I want a per-marker unit picker that
    converts to canonical before writing, so that I never do unit math and storage never mixes units.
18. As a user, I want to see a pre-save summary of any converted values, so that I can eyeball what actually
    lands in the note.
19. As a careful user, I want entry validation that hard-blocks malformed input, soft-warns on values wildly
    outside range (likely a unit slip or extra digit), but never warns on merely out-of-range values, so that
    the app catches mistakes without crying wolf on real abnormal results.
20. As a user whose year introduces a never-seen marker, I want to add it inline during entry, so that a new
    test doesn't break my flow.
21. As a user whose year drops a test, I want to simply leave it blank and have the key omitted, so that gaps
    are represented honestly.
22. As a user, I want entry to capture only raw values (arrows and flags derived), so that stored data stays
    minimal and trustworthy.
23. As a user planning next year's tests, I want an optional-test backlog with each candidate's cost, priority,
    rationale, and source link, so that I can plan my package.
24. As a user, I want a candidate test to be just a not-yet-measured marker, so that when I order it, entering
    the first value graduates it onto the dashboard with no extra step.
25. As a user, I want the planner on its own surface (not the daily results screen), so that occasional
    planning doesn't clutter the everyday view.
26. As a user, I want a free-form yearly package-analysis writeup linked from the planner, so that the narrative
    recommendations live alongside the structured backlog.
27. As a user of my `lhak-dashboard`, I want a compact Health widget there, so that I see my status at a glance
    from my main dashboard.
28. As a user, I want to choose the widget's size (a tiny inline chip, or a denser list of top flagged markers),
    so that it fits whatever space I have.
29. As a user, I want the widget's rows to deep-link into the full view at that marker, and its header to open
    the dashboard, so that a glance turns into a drill-in with one click.
30. As a user, I want the widget to recompute when my dashboard opens (not constantly), so that it's cheap given
    data changes about once a year.
31. As a user who will track a spouse, I want a profile switcher on the dashboard top bar showing exactly one
    active person at a time, so that each person's dashboard stays clean and unambiguous.
32. As a user, I want each person's visits stored under their own folder, so that two people can share a report
    date without collision.
33. As a user, I want the entry modal to let me pick whose visit I'm recording, so that data goes to the right
    person.
34. As a user, I want reference ranges resolved by the active profile's sex, so that flags are correct per
    person.
35. As a user, I want to add and edit profiles (sex, date of birth, blood type, allergies) from the settings
    tab, so that the load-bearing facts for range resolution are captured safely.
36. As a user, I want the widget on my main dashboard pinned to me (self), so that the glance surface is about
    my own health; I check family via the full view's switcher.
37. As a user, I want plugin settings to hold only app preferences and pointers (folder paths, deadband, widget
    tier, default profile, concern→Base overrides), while marker/person meaning stays in the notes, so that
    there's a single source of truth and no drift.
38. As a user, I want the plugin usable immediately with sensible defaults before I configure anything, so that
    it works out of the box.
39. As a user, I want concern headers to open a filtered Obsidian Base view (by convention, with an optional
    override), so that I can pivot into the raw data natively.
40. As a user with an existing years-old note, I want my historical results migrated into the new structure and
    verified against the old table, so that I start with my real history intact.
41. As a user, I want the plugin and view to be theme-aware (light/dark) and match my established flat-editorial
    design language, so that it feels native to my vault.
42. As a developer handing this off, I want the derivation logic (flags, arrows, ranking, grouping, unit
    conversion, range resolution) isolated as a pure core, so that it's testable without Obsidian.

## Implementation Decisions

**Overall architecture.** A pure **domain core** does all derivation; thin Obsidian **adapters** wrap it. The
plugin scans markdown files, reads frontmatter via the metadata cache into a typed snapshot, feeds the core, and
renders the returned model as plain DOM in an `ItemView`. It also registers a custom Bases view (Bases plugin
API, requires a recent Obsidian; the plugin renders inside the Bases framework driven by the filtered dataset).
Source-of-truth is the notes; `.base` files are views.

**Note kinds (schema).** Three frontmatter-first kinds; a new metric is a new marker note, never a schema change.

- *Visit note* — one per lab visit, organised **folder-per-person**, filename cosmetic; a discovery predicate
  (`type: lab-visit`) plus `person` and `date` (= report date) keys are authoritative. Body holds flat keys =
  marker id → bare scalar (numeric) or string (qualitative); skipped tests omit the key; **no stored arrows**.
  ```yaml
  type: lab-visit
  person: self
  date: 2025-07-23
  alt: 22
  hbsag: Negative
  hbsab: '> 1,000'   # censored/qualitative strings are single-quoted (see Further Notes)
  ```
- *Marker note* — id = note basename; body = clinical blurb (feeds hover tooltips). Frontmatter (schema):
  ```yaml
  name: Alanine aminotransferase
  aliases: [ALT, SGPT]
  type: numeric              # numeric | qualitative | derived
  unit: U/L                  # canonical; dual-unit adds alt_unit + alt_factor
  panel: biochemical         # single, mirrors the lab report
  concern: [liver]           # multi, dashboard clinical buckets
  ranges: [{sex: any, age: [0,120], low: 0, high: 41}]  # sex + age-banded, low/high optional
  optimal_high: 30           # tier-2 personal target (optimal_low/optimal_high optional)
  direction: lower_better    # lower_better | higher_better | within
  curated: true              # default-shown; else behind "Show all"
  # planner candidates also carry: status: candidate, cost, priority, source_url, year_planned
  ```
  Variants: qualitative markers carry `normal:` (value or list; reading ∉ set = flagged); derived markers carry
  `formula:` over other marker ids (recomputed, never stored); BP is two ordinary numeric markers grouped by a
  `pair`/`order` pair for display. Vitals are ordinary markers.
- *Profile note* — per person: `sex` (+ optional `dob`), blood type, allergies. `sex`/`dob` feed range
  resolution.
- *Plan note* — free-form prose per year, holding the narrative package-analysis writeup; linked from the
  Planner surface.

**Domain core (the single test seam).** A pure function, roughly
`computeDashboardModel(markers, visits, profile, settings) → DashboardModel`, returning concern groups (each
with a worst-member status dot), per-marker status + arrow + sparkline series, attention rank, and the curated
selection. Two pure helpers live inside it: **unit conversion** (`convert(value, fromUnit, marker) → canonical`)
and **range resolution** (`resolve(marker, profile, atDate) → band`). This core is Obsidian-free.

**Flagging & arrows (in the core).** Arrow = latest numeric value vs the immediately-prior numeric visit, with a
tunable ±3% deadband → flat; direction coloured good/bad per the marker `direction`. Status precedence (highest
first): high (red) → low (blue) → watch (orange: past personal target but in lab range) → good (green); tier-1
lab range and qualitative-abnormal outrank tier-2 personal target; range bounds inclusive; qualitative reading ∉
`normal` = red. Attention rank = tier → normalized magnitude → worsening trend, qualitative sorting to the top of
tier 1. A concern group's dot is its worst member.

**Data entry.** A guided "Add lab visit" modal, pre-populated from marker notes grouped by panel, create-or-edit
by date. Numeric fields = value + unit picker + live range hint; qualitative = seeded dropdown + free-text
fallback; BP = a paired two-input row. Per numeric field the pipeline is: pick unit → convert via `alt_factor` →
validate the *canonical* value → pre-save summary → write. Validation is three-tier: hard-block malformed
(non-numeric in numeric field, missing date, duplicate marker); soft-warn when a value is wildly outside the band
(≈ >5× ceiling or <⅕ floor); never warn on merely out-of-range. New marker = inline add-marker mini-form; dropped
= omitted key. A person selector routes the write to the active profile's folder.

**Planner.** A candidate optional test is a marker note with `status: candidate` plus `cost`, `priority`
(essential | lifestyle | secondary), `source_url`, `year_planned`. Auto-graduation is by data presence: the
backlog = candidate markers with zero readings; the first reading graduates it. The Planner is a separate surface
(top-bar link / command, not the daily hero); its backlog is a Base over candidate markers sorted priority then
cost. The yearly analysis is a linked free prose plan note.

**Settings boundary.** Marker/person meaning lives in notes; plugin persisted settings hold only app prefs +
pointers: folder paths, arrow deadband %, widget tier/maxRows/showSparkline, show-all default, concern→Base
overrides, default profile. Storage is the plugin's own persisted config surfaced through a settings tab. Curated
ordering is automatic (attention rank) — nothing to configure. Concern→Base mapping is convention (a `.base` per
concern in a configured folder) with an optional per-concern override; a missing Base degrades to in-plugin
expand. Ships usable before any config.

**Multi-profile.** Adults only for now (self + spouse). Exactly one active profile at a time; a top-bar switcher
flips the session-active profile; the default profile loads on open. No merged all-people view. Range resolution
keys off the active profile's sex. Profile add/edit is in the settings tab.

**lhak-dashboard widget.** Two tiers chosen by setting: a **Chip** (inline pill — flagged count + status pips)
and a **List** (default — dense single-line rows: status dot, name, sparkline, value, arrow; top-N + "view all";
all-clear = one green line). It lives as a panel in the host's left column using the host's existing panel
mount interface. Integration mirrors the established sibling-plugin handshake: the health plugin exposes a
`mountHealthWidget(container, { tier, maxRows, onOpenMarker }) → handle{ destroy }` entry point; the host looks
the plugin up in the plugins registry, owns placement + tier, and destroys the handle on close. The widget is
pinned to self. Header opens the dashboard via a command; a List row opens the full view at that marker via the
`onOpenMarker` callback. It recomputes on mount only.

**Prior art / integration.** Follow the two sibling lhak plugins for vault-read and rendering conventions
(metadata-cache scan → typed snapshot → `ItemView` plain DOM; hand-rolled SVG charts, no charting library;
flat-editorial design tokens; light/dark theming). The widget→host handshake copies the existing month-strip
integration pattern exactly.

## Testing Decisions

**What makes a good test here.** Tests exercise **external behaviour of the domain core**, not implementation
details or Obsidian internals. A good test states a set of parsed marker/visit/profile inputs and asserts the
returned `DashboardModel` — statuses, arrows (including deadband edge cases), attention ordering, concern
grouping and worst-member dots, curated selection, resolved ranges, and unit conversions. No DOM, no vault, no
metadata cache in these tests.

**What is tested.** The single pure core seam: `computeDashboardModel` and its inner `convert` / `resolve`
helpers. Priority cases: deadband boundary (just inside vs just outside ±3%); status precedence (tier-1 range
beating tier-2 target; qualitative-abnormal = red); inclusive-bounds behaviour; direction-aware arrow colouring;
sex-based range resolution picking the right band; unit conversion producing canonical values and the resulting
soft-warn threshold; attention ranking order; a concern group's worst-member dot; missing/omitted keys handled
cleanly in a series.

**Fixtures.** Lift real fixtures from the already-migrated data (5 visits spanning 2020–2025, ~59 markers across
four panels, one profile) — it exercises sex-banded ranges, qualitative markers, censored strings, gaps
(skipped tests), and repeat-in-year grain naturally.

**Adapters.** The Obsidian adapters (vault scan, `ItemView` render, registered Bases view, entry modal,
`mountHealthWidget`) are intentionally thin and are **not** unit-tested; correctness is verified by keeping logic
out of them and exercising the core. Manual/visual verification for the rendered surfaces (the mockups are the
visual source of truth). No test suite exists in this greenfield repo yet; introduce a lightweight unit-test
runner for the core only.

## Out of Scope

- Building/shipping decisions aside, this spec does not cover ops like release or store submission.
- Clinical interpretation or medical advice beyond encoding the user's own stated thresholds.
- Imaging findings (ECG, chest X-ray, ultrasound) — narrative, not trendable numeric markers.
- Procedures such as colonoscopy — not trended numeric markers (may appear as backlog prose, not structured).
- Future numeric metrics (body composition, waist, resting heart rate, wearable summaries) — the model must
  *accommodate* them later without redesign, but recording/presenting them is a future effort.
- Pediatric age-banded reference ranges and any child-specific UI — deferred to v2; the model already supports
  age-banding, so a child later is a data-authoring increment, not a redesign.
- Paste-parse / OCR entry acceleration — deferred; revisit only if the guided form proves painful.

## Further Notes

- **Migration is already done and verified.** The historical note was migrated (as a deliberate exception to the
  planning-only stance) into the new structure and verified by round-trip diff, source spot-checks, and a
  per-panel completeness tally. Three parse bugs were caught only by checking against something external to the
  script (source values; a panel tally; and, decisively, Obsidian's own metadata cache) — the lesson for the
  build: **validate an Obsidian data migration against Obsidian's parser, not just a self-consistent
  round-trip.** Notably, markdown-escaped characters (`\|` inside table cells, `\>` in values) and emoji-in-heading
  matching are the sharp edges; store censored strings single-quoted to avoid invalid YAML escapes.
- **Build follow-ups from the migration** (data hand-refinement, not code): the auto-assigned `concern` buckets
  are coarse placeholders and need real clinical grouping; ~9 markers lack a blurb; dual-unit `alt_factor`s and
  personal `optimal_*` targets are unset; and the planner prose still needs moving out of the old note into
  candidate markers + a yearly plan note (which completes retiring the old note's last unique content).
- **Design assets** (visual source of truth): the dashboard vision and dialed-in look mockups, and the widget
  size-ladder mockup, exist as prototypes in the wayfinder workspace and are linked from the corresponding map
  tickets. Prose defers to these for layout and visual language.
- **Suggested build order:** data model + reader → domain core (flags/arrows/ranking) → full dashboard view →
  entry modal → widget → settings → multi-profile → planner.
- Full decision provenance: the wayfinder map and its 15 tickets under the project workspace record every fork
  and its resolution.

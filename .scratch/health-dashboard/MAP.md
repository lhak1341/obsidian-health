---
labels: [wayfinder:map]
tracker: local-markdown
feature: health-dashboard
---
# Health dashboard plugin — design spec

## Destination

A design spec / PRD for a **custom Obsidian plugin** (`obsidian-health`) that turns the
annual health-check data — the report's **lab panels + vitals** (today: one hand-maintained
`Laboratory test.md`) — into a health dashboard. Reaching the end = a spec ready to hand to a build
effort. **Plan, don't build.**

The plugin must, per the source idea:
- **Kill manual upkeep** — auto-compute the year-over-year arrows (no more hand-typed △/▼).
- **Surface attention** — show which markers matter this year (out-of-range, bad trend, past a personal threshold).
- **Trend over time** — any marker's trajectory across years at a glance, drill-in for the full chart.
- **Explain in place** — meaning/normal-range on hover (tooltip) instead of searching the reference tables.
- **Plan next year's tests** — track the optional-test backlog (ApoB, HbA1c, Homocysteine…) with cost + priority.

Two surfaces: the **full plugin view**, and a **compact widget in `lhak-dashboard`** (same integration style
as `linear-calendar`) that shows the important metric at a glance and links into the full view.

## Notes

- **Domain:** personal annual health-check labs. Source of truth today: `Laboratory test.md`
  (blood/biochem/antigen/urine panels, 5 snapshots 2020–2025; each value carries a sex-specific
  reference range, unit, and a manual trend arrow; plus prose "what to look for" + yearly recommendations).
- **Data direction (decided, ticket 02):** refactor the one big note into **many notes, one per lab visit**
  (`health/labs/<date>.md`), frontmatter-first so **Obsidian Bases** consume them too. Bases question resolved
  (ticket 01 hybrid): plugin reads notes **and** registers a custom Bases view.
- **Prior art (lhak's own plugins):** `obsidian-lhak-dashboard`, `obsidian-linear-calendar` — read for
  data-access + rendering conventions before designing.
- **Skills to consult:** `/grilling` + `/domain-modeling` (default), `/prototype` (UI questions),
  `obsidian-bases`, `obsidian-plugin-fork` / plugin-dev skills, `obsidian-markdown`.
- **Mode:** planning. Tickets resolve decisions; the deliverable is the PRD, not a working plugin.
- **Scope (settled, ticket 07):** lab panels **+ vitals** (both from the annual report). Imaging out; model
  must stay extensible for future numeric metrics. Two-tier ranges (personal target ≠ lab-normal) are a
  load-bearing concept throughout (vision 04, model 02, flagging fog).

## Decisions so far

> **MAP COMPLETE** — the way to the destination is fully walked. All 15 tickets closed; the handoff spec
> `docs/PRD.md` (labelled `ready-for-agent`) is the deliverable. Nothing left to decide.

<!-- one line per closed ticket -->

- [Assemble the PRD](tickets/14-assemble-the-prd.md) — **the destination, reached.** Compiled all decisions via
  the user's **`/to-spec`** into **`docs/PRD.md`** (to-spec template, 42 user stories, `ready-for-agent`).
  Agreed **one test seam**: pure domain core `computeDashboardModel(markers, visits, profile, settings) →
  DashboardModel` (unit-conversion + range-resolution inside), Obsidian adapters thin/untested. Repo greenfield.
- [Migrate the historical snapshots into the new note structure](tickets/12-migrate-historical-snapshots.md) —
  **EXECUTED** (plan-not-do exception, user-approved). Under **`09 about-me/`** in the vault: **5 visit notes**
  (2020→2025), **59 marker notes** (blood 30 · biochem 14 · antigen 4 · urine 11; id = snake of source Test via
  wikilink target; ranges sex-banded; body blurb from the Reference glossary), **`profiles/self.md`** (sex m,
  blood_type "A, Rh+"), + auto-generated all-column eyeball **`health/Lab visits.base`**. Verified: script
  round-trip **0/236 mismatch** + source spot-checks + per-panel tally — which caught **two parse bugs the
  round-trip couldn't** (`\|`-mis-split rows; entire antigen panel dropped by exact-emoji heading match). **Refines ticket 03:** `Laboratory test.md` **not deleted** — keeps
  the planner prose (feeds add-test-planner fog). Follow-ups: coarse `concern` buckets, 9 blurbs, `alt_factor`,
  `optimal_*` all left to hand-refine.
- [Design the add-test / package planner](tickets/15-add-test-package-planner.md) — **candidate = marker note
  with `status: candidate`** + `cost`/`priority`/`source_url`/`year_planned` (no new note kind; lab tests only,
  procedures/imaging out). **Auto-graduation:** backlog = candidate markers with zero readings; first reading
  drops it onto the dashboard, no manual step. **Surface = separate Planner view** (top-bar/command, not the
  daily hero) — a **Base** over candidates sorted priority→cost. **Yearly analysis = free prose note**
  `plans/<year>.md`, linked. Completes `Laboratory test.md`'s retirement (build step). Amends data model (02)
  with the optional planner fields + prose-note kind.
- [Design the multi-profile experience](tickets/13-multi-profile-experience.md) — **folder per person**
  (`health/labs/<person>/<date>.md`; 5 migrated notes moved into `self/`, verified). **Always one active
  profile** (switcher flips session-active; `defaultProfile` loads on open) — no merged view. **Widget pinned to
  self** (ticket 08 unchanged). **Profile management in the settings tab** (add/edit form → `profiles/<person>.md`,
  guards sex/dob). Entry modal (06) gains a **person selector** writing to `<person>/`. Range resolution keys off
  active profile **sex** (age-banding stays wired, pediatric out of scope). Switcher visual = vision-mockup top bar.
- [Decide family profiles — in scope now, or v2](tickets/10-family-profiles-scope.md) — **multi-profile in scope
  now, adults only.** User will track a **spouse** soon (no kids yet) → sex-specific ranges the model (02) already
  has; person dimension already present, nothing structural added. In: self + spouse, switcher, per-person entry +
  filtering. **Pediatric age-banded range authoring deferred to v2** (see Out of scope). The *how* spun into
  [Design the multi-profile experience](tickets/13-multi-profile-experience.md).
- [Design the plugin settings](tickets/09-plugin-settings.md) — **boundary:** marker/person *meaning* lives in
  notes (ranges, `optimal_*`, direction, concern, `normal:`, **`curated:` flag**, profile facts); plugin `saveData`
  holds only app prefs + pointers. Curated set = per-marker flag, **ordering auto** (attention-rank, ticket 11) —
  nothing to configure. Storage = **`saveData` JSON** (`data.json`) via `PluginSettingTab`. Schema: `paths`,
  `arrowDeadbandPct` (11), `widget{tier,maxRows,showSparkline}` (08), `showAllByDefault`, `concernBaseOverrides`,
  `defaultProfile`. **Concern→Base = convention** (`health/bases/<concern>.base`) **+ optional override**, graceful
  when absent. Ships usable pre-config. `defaultProfile` depth depends on family-profiles (10).
- [Design the lhak-dashboard health widget](tickets/08-lhak-dashboard-health-widget.md) — **two-tier ladder**,
  host picks tier: **Chip** (inline pill, count + status pips) and **List** (default; dense single-line rows =
  dot·name·sparkline·value·arrow, top-3 + "view all", all-clear = one green line). Lives as a **`HealthPanel` in
  lhak-dashboard's left column**. Integration mirrors `CalendarPanel`→`mountMonthStrip`: health plugin exposes
  **`mountHealthWidget(container,{tier,maxRows,onOpenMarker})→handle{destroy}`**, host reads `app.plugins.plugins['health']`
  and owns placement+tier. Entry: header → `executeCommandById('health:open-dashboard')`, row → open view at that
  marker via `onOpenMarker`. Refresh = on mount only (`update()` no-op). Tier/row-cap/toggles feed settings (09).
  Asset: [prototypes/widget-mockup.html](prototypes/widget-mockup.html) · [artifact](https://claude.ai/code/artifact/aa22f9e2-ccdb-409d-b236-7b2016b5fcab).
- [Design the data-entry workflow](tickets/06-data-entry-workflow.md) — primary flow = a plugin **"Add lab
  visit" modal** (form pre-populated from `markers/` notes, grouped by panel; does both create + edit by picking
  a date). **Note date = report date** (draw dates never recorded, can't backfill; optional `drawn:` extra only).
  Field types: numeric = value + **unit picker** + range hint, qualitative = seeded **dropdown** + free-text
  fallback, BP = **paired `120/80` row**. **Unit conversion at entry, storage canonical:** pick unit → convert
  (× `alt_factor`) → validate canonical → pre-save summary → write. Validation 3-tier (hard-block malformed;
  **soft-warn only when >~5×/<⅕ the band** = likely unit slip; never warn on merely out-of-range). New marker =
  inline **"+ Add marker"**; dropped = omit. Raw values only, arrows/flags derived (11). Spun off: historical
  migration (task 12); deferred: paste-parse/OCR.
- [Name the plugin and the note structure](tickets/03-name-the-plugin-and-notes.md) — display name **"Health"**,
  manifest **`id: health`** (installs at `.obsidian/plugins/health/`), repo stays `obsidian-health`, view titled
  **"Health Dashboard"**. Note structure inherited from data-model (02). Old `Laboratory test.md` **retired** after
  migration — notes+Bases view are the single source of truth. **Refined by ticket 12:** not actually deleted;
  the note is kept for its planner prose (lab-table/glossary role retired, not the file).
- [Decide scope — labs-only vs broader health data](tickets/07-scope-labs-only-vs-broader.md) — **in:** lab
  panels + vitals (both from the annual report, both trended); **out:** imaging (narrative); model must stay
  extensible for future numeric metrics (body-comp, wearables) with no redesign.
- [Define flagging & auto-arrow computation rules](tickets/11-flagging-and-arrow-rules.md) — all derived on read
  from the ticket-02 notes. **Arrow** = latest vs immediately-prior numeric visit, **±3% deadband** (tunable) → flat,
  applied consistently; directional colored good/bad, band neutral in-range + toward/away-bound when out. **Status**
  (precedence high): `high` red / `low` blue / `watch` orange (past personal target, in-range) / `good` green;
  **tier-1 range + qualitative-abnormal outranks tier-2 target**; bounds inclusive; qualitative ∉ normal = red.
  **Attention rank** = tier → normalized magnitude → worsening (qualitative top of tier 1). Group dot = worst member.
  Asset: [research/11-flagging-arrow-rules.md](research/11-flagging-arrow-rules.md).
- [Design how the dashboard looks — layout and visual language](tickets/05-dashboard-look-and-feel.md) — target
  look locked as a higher-fidelity dial-in over the vision seed, honoring the established flat-editorial identity
  (dot-grid, Space Grotesk / serif / mono, status palette) + Obsidian light/dark theming. **Columns auto-balance**
  (ResizeObserver 3/2/1 by width, greedy shortest-column; concern order = priority, not a pin); **charts stay
  hand-rolled SVG** (no lib — matches lhak plugins) with range band + target line + emphasized last point + dual BP
  line; rows keep sparkline+arrow+value on aligned tracks; qualitative chips, tuned states.
  Asset: [prototypes/look-dialed.html](prototypes/look-dialed.html) · [artifact](https://claude.ai/code/artifact/084702a5-4af9-49f5-b8f7-b509f53eeae0).
- [Decide the data model and source of truth](tickets/02-data-model-source-of-truth.md) — three frontmatter-first
  note kinds, **notes canonical** (`.base` = views): `health/labs/<date>.md` **one per visit** (repeat test = another
  note; flat keys = marker id → bare scalar; qualitative = string; skipped = omit; no stored arrows; series keyed by
  `date`), `markers/<id>.md` (id = basename; `type`, `unit`+`alt_factor`, `panel`+`concern`, **sex+age-banded `ranges`**,
  two-tier `optimal_*`+`direction`, `formula` for derived, `normal:` for qualitative, BP = two paired markers),
  `profiles/<person>.md` (sex/dob feed range resolver; person dimension present but single-user today). Entry form
  (ticket 06) converts units → canonical. New metric = new marker note, no schema change.
  Asset: [research/02-data-model.md](research/02-data-model.md).
- [Research: how the vault feeds the plugin](tickets/01-research-vault-feeds-plugin.md) — both lhak plugins read
  `getMarkdownFiles()` → `metadataCache.frontmatter` (no Dataview/Bases today); single mtime-cached scan → typed
  snapshot → `ItemView` renders plain DOM. **Bases has a plugin API** (`registerBasesView`, `@since 1.10.0`): register
  a custom Bases view that receives the filtered/formula-evaluated `BasesQueryResult` — plugin *can* leverage Bases as a
  renderer, needs `minAppVersion ≥ 1.10`. **Recommended: hybrid** — per-year frontmatter = shared source of truth, plugin
  owns rich `ItemView` (TS flag logic) **+** registers a Bases view so concern-headers open filtered Base views natively.
  Widget→dashboard = child exposes `mount…()→handle{destroy}`, host reads `app.plugins.plugins[id]`, jump = `executeCommandById`.
  Asset: [research/01-vault-feeds-plugin.md](research/01-vault-feeds-plugin.md).
- [Chart the dashboard vision](tickets/04-chart-the-dashboard-vision.md) — flat-editorial, one-screen dashboard
  in the lhak-dashboard design language; **flagged markers are the hero**, **concern-grouped** scan,
  click-to-expand history charts (accordion), **two-tier** lab-vs-personal-target flags, auto arrows +
  sparklines, **curated set + Show all**, qualitative results, **Obsidian Base = source of truth** with concern
  headers opening filtered Base views, static profile facts + **profile switcher** on a one-line top bar.
  Asset: [vision-mockup.html](prototypes/vision-mockup.html) · [artifact](https://claude.ai/code/artifact/241ff284-b487-4ce2-8d0a-ccfd115cdbba).

## Not yet specified

_Empty — the fog is fully cleared. Every in-scope area graduated to a ticket and closed; the spec is written._

<!-- Deferred within scope (captured in the PRD's Out of Scope / Further Notes, not open work):
     paste-parse/OCR entry accelerator — revisit only if the guided form hurts. -->

## Out of scope

<!-- ruled beyond the destination -->

- Building / shipping the plugin (destination is the spec only).
- Clinical interpretation or medical advice beyond encoding the user's own stated thresholds.
- **Imaging findings** (ECG, chest X-ray, ultrasound) — narrative, not trendable; ruled out per
  [Decide scope](tickets/07-scope-labs-only-vs-broader.md).
- **Future numeric metrics** (body-composition, waist, resting HR, wearable summaries) — the model must
  *accommodate* them later, but recording/presenting them is a future effort, not this map.
- **Pediatric age-banded reference ranges + child-specific UI** — deferred to v2 per
  [Decide family profiles](tickets/10-family-profiles-scope.md). No children to track yet; the model already
  supports age-banding, so a child later is a data-authoring increment, not a redesign.

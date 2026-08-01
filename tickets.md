# Tickets: Health Dashboard — Obsidian plugin

Builds the `health` Obsidian plugin from `docs/PRD.md`: frontmatter-first notes as source of truth, a pure domain core doing all derivation, thin Obsidian adapters rendering a one-screen Health Dashboard, a guided entry modal, a Planner surface, a `lhak-dashboard` widget, and multi-profile support.

Work the **frontier**: any ticket whose blockers are all done. Migration itself is already complete and verified (see PRD "Further Notes") — no ticket for it.

## Scaffold plugin + core test runner

**What to build:** A loadable `health` plugin skeleton. Installing it in the vault and running the plugin's open command surfaces a blank Health view; a lightweight unit-test runner is wired up and runs (with zero or a trivial passing test) so the pure core has a home to be tested in from ticket 3 onward. Prefactor only — no domain logic yet.

**Blocked by:** None — can start immediately.

- [x] Plugin manifest declares id `health`; plugin loads in the vault without errors
- [x] An open command registers and opens an empty `ItemView`
- [x] A unit-test runner is configured and runnable, scoped to the core (Obsidian-free)
- [x] Build tooling bundles the plugin (dev + prod)

## Domain types + vault reader

**What to build:** Scanning the vault yields a typed snapshot of all four note kinds (visit, marker, profile, plan) read from frontmatter via the metadata cache. Visits are discovered by the `type: lab-visit` predicate and organised folder-per-person; `person` and `date` are authoritative; body flat keys map marker id → scalar/qualitative; skipped tests omit keys; censored/qualitative strings survive as single-quoted values. Verifiable by scanning the real migrated data into the typed snapshot.

**Blocked by:** Scaffold plugin + core test runner.

- [x] Visit, marker, profile, and plan notes each parse into a typed structure
- [x] Visits discovered by `type: lab-visit`, keyed by `person` + `date`, folder-per-person
- [x] Omitted marker keys represented as gaps (not zeros/nulls that read as readings)
- [x] Censored/qualitative strings preserved intact
- [x] The real migrated dataset reads into the snapshot cleanly (validated against Obsidian's own parser, not just a self-consistent round-trip)

## Domain core — flags, arrows, ranking, grouping

**What to build:** A pure `computeDashboardModel(markers, visits, profile, settings) → DashboardModel` with inner `convert(value, fromUnit, marker)` and `resolve(marker, profile, atDate)` helpers, all Obsidian-free. Returns concern groups (each with a worst-member status dot), per-marker status + arrow + sparkline series, attention rank, and the curated selection. Status precedence high→low→watch→good; tier-1 lab range and qualitative-abnormal outrank tier-2 personal target; bounds inclusive; qualitative reading ∉ `normal` = red. Arrow = latest vs immediately-prior numeric visit with ±3% deadband, coloured by marker `direction`.

**Blocked by:** Domain types + vault reader.

- [x] `computeDashboardModel` returns statuses, arrows, sparkline series, attention rank, concern groups + worst-member dots, curated selection
- [x] `convert` produces canonical values via `alt_factor`; `resolve` picks the sex/age band
- [x] Unit tests off real fixtures cover: deadband boundary (just inside vs just outside ±3%), status precedence (tier-1 beats tier-2; qualitative-abnormal red), inclusive bounds, direction-aware arrow colour, sex-based band selection, conversion + resulting soft-warn threshold, attention order, worst-member dot, omitted keys in a series
- [x] Core has zero Obsidian imports

## Dashboard ItemView (read-only render)

**What to build:** Opening the Health view renders the computed model as plain DOM matching the flat-editorial mockups: flagged markers are the hero, grouped by clinical concern with a single worst-member status dot per group; each row shows a sparkline, current value, and computed arrow; clicking a marker expands its full history chart inline (accordion) showing the reference-range band, personal-target line, and an emphasized latest point; marker meaning + normal range on hover; curated default set with a "Show all" toggle; qualitative results as chips; blood pressure as a paired `118/76` reading with a dual trend line. Theme-aware (light/dark). Hand-rolled SVG charts, no charting library.

**Blocked by:** Domain core — flags, arrows, ranking, grouping.

- [x] Concern groups render with worst-member status dot; ordering follows attention rank
- [x] Rows show sparkline + value + arrow; accordion expands inline history chart (ref band + target line + latest point)
- [x] Meaning + normal range on hover
- [x] Curated set shown by default; "Show all" reveals the rest
- [x] Qualitative markers render as chips (flagged when ∉ normal); BP renders paired with a dual trend line
- [x] Light/dark theme-aware, matching the mockups as the visual source of truth

## Add lab visit modal (create-or-edit)

**What to build:** A guided "Add lab visit" modal pre-populated from marker notes grouped by panel, create-or-edit selected by date. Per numeric field the pipeline is pick unit → convert via `alt_factor` → validate the canonical value → pre-save summary → write. Three-tier validation: hard-block malformed (non-numeric in numeric field, missing date, duplicate marker), soft-warn on values wildly outside the band (≈ >5× ceiling or <⅕ floor), never warn on merely out-of-range. Qualitative fields = seeded dropdown + free-text fallback; BP = paired two-input row. New marker addable inline; dropped test = omitted key. A person selector routes the write to the active profile's folder. Only raw values are stored (arrows/flags derived). Saving updates the dashboard.

**Blocked by:** Dashboard ItemView (read-only render).

- [x] Modal pre-populates all known markers grouped by panel; picks create-or-edit by date
- [x] Numeric pipeline: unit pick → convert → validate canonical → pre-save summary of converted values → write
- [x] Validation hard-blocks malformed, soft-warns wildly-outside, never warns merely out-of-range
- [x] Qualitative dropdown + free-text; BP paired row
- [x] Inline add-marker mini-form; dropped test omits the key
- [x] Person selector routes write to the active profile's folder; only raw values stored; dashboard reflects the save

## Settings tab + profile add/edit

**What to build:** A settings tab holding only app preferences and pointers — folder paths, arrow deadband %, widget tier/maxRows/showSparkline, show-all default, concern→Base overrides, default profile — with marker/person meaning staying in the notes (single source of truth, no drift). Profiles are added/edited here (sex, date of birth, blood type, allergies). The plugin is usable with sensible defaults before anything is configured.

**Blocked by:** Dashboard ItemView (read-only render).

- [x] Settings persist folder paths, deadband %, widget tier/maxRows/showSparkline, show-all default, concern→Base overrides, default profile
- [x] No marker/person meaning stored in settings
- [x] Profile CRUD captures sex, dob, blood type, allergies
- [x] Plugin works out of the box before any configuration

## Multi-profile switcher

**What to build:** A top-bar switcher on the dashboard shows exactly one active person at a time; the default profile loads on open; there is no merged all-people view. Each person's visits live under their own folder so shared report dates don't collide. Range resolution keys off the active profile's sex. The entry modal's person selector routes writes to the right person. Switching flips the session-active profile to a clean, unambiguous per-person dashboard.

**Blocked by:** Add lab visit modal (create-or-edit); Settings tab + profile add/edit.

- [x] Top-bar switcher shows exactly one active profile; default loads on open; no merged view
- [x] Visits stored folder-per-person; shared dates across people do not collide
- [x] Range resolution uses the active profile's sex
- [x] Switching profiles re-renders that person's dashboard

## lhak-dashboard widget

**What to build:** A compact Health widget mountable in the `lhak-dashboard` host via `mountHealthWidget(container, { tier, maxRows, onOpenMarker }) → handle{ destroy }`, mirroring the established sibling-plugin month-strip handshake (host looks the plugin up in the registry, owns placement + tier, destroys the handle on close). Two tiers: a **Chip** (inline pill — flagged count + status pips) and a **List** (dense single-line rows: status dot, name, sparkline, value, arrow; top-N + "view all"; all-clear = one green line). Pinned to self. Header opens the dashboard via a command; a List row deep-links into the full view at that marker via `onOpenMarker`. Recomputes on mount only.

**Blocked by:** Dashboard ItemView (read-only render).

- [x] `mountHealthWidget` entry point returns a handle with `destroy`; host handshake mirrors the month-strip pattern
- [x] Chip tier (flagged count + pips) and List tier (top-N rows + "view all", all-clear green line)
- [x] Header opens the dashboard; List rows deep-link to the marker via `onOpenMarker`
- [x] Pinned to self; recomputes on mount only

## Planner surface + Bases view

**What to build:** A separate Planner surface (top-bar link / command, not the daily hero) showing the optional-test backlog — candidate markers (`status: candidate` with `cost`, `priority`, `source_url`, `year_planned`) that have zero readings — sorted priority then cost, with the yearly free-form package-analysis plan note linked alongside. A candidate is just a not-yet-measured marker: entering its first reading auto-graduates it onto the dashboard with no extra step. The plugin registers a custom Bases view; concern headers open a filtered Obsidian Base view by convention (a `.base` per concern in a configured folder) with an optional per-concern override, degrading to in-plugin expand when a Base is missing.

**Blocked by:** Dashboard ItemView (read-only render).

- [ ] Planner is a separate surface; backlog = candidate markers with zero readings, sorted priority then cost
- [ ] Yearly package-analysis plan note linked from the Planner
- [ ] First reading auto-graduates a candidate onto the dashboard
- [ ] Custom Bases view registered; concern headers open a filtered Base (convention + override), degrading to in-plugin expand when absent

## Migration data hand-refinement

**What to build:** Hand-refine the migrated data (authoring, not code): replace the coarse auto-assigned `concern` buckets with real clinical grouping; write the ~9 missing marker blurbs; set the dual-unit `alt_factor`s and personal `optimal_*` targets; and move the planner prose out of the old note into candidate markers + a yearly plan note, retiring the old note's last unique content.

**Blocked by:** Domain types + vault reader.

- [ ] `concern` buckets reflect real clinical grouping
- [ ] The ~9 markers missing a blurb have one
- [ ] Dual-unit `alt_factor`s and personal `optimal_*` targets set where applicable
- [ ] Planner prose moved into candidate markers + a yearly plan note; old note retired

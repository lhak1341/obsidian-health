# obsidian-health

Obsidian plugin (`health`) — see `docs/PRD.md` and `tickets.md`.

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill —
bun, script contract, `bun test` vs `bun run test`, settings-tab structure, CSS
specificity, `metadataCache` write-lag, live debugging. Only repo-specific facts are below.

## Domain

Real vault data lives under `09 about-me/{markers,profiles,health/labs/<person>}`.

- Before editing real vault data directly (not through the app), read the
  `obsidian-plugin-dev` skill's `references/debugging.md` for the vault path first — do not
  `find`/guess; decoy copies of the vault exist on disk.
- Marker `panel` (drives the Add Visit form's grouping, mirroring the physical lab report's
  sections) and `concern` (drives dashboard column grouping, clinical/thematic) are
  intentionally separate axes over the same markers. Do not collapse them.
- `MarkerNote.baseOrder` (Base-table column sequencing, `core/base-views.ts`) is a separate axis
  from `MarkerNote.order` (dashboard curated-row + visit-editor field sequencing) — checked real
  vault data before assuming reuse was safe: Kidney's `order` values reflect attention priority
  (`uric_acid` first), not the lab-report column sequence (`creatinine` first). Don't collapse them.
- `MarkerNote.sex` (`m`/`f`, optional — unset means everyone) restricts whether a marker shows at
  all, filtered in `computeDashboardModel` and the visit editor's `buildFields`. Separate axis
  from `ranges[].sex`, which only picks which reference band resolves for a marker every profile
  still sees.
- When a marker field gains a per-profile resolved counterpart (global field + `resolve*()` +
  profile override, e.g. `optimalLow`/`optimalHigh` → `resolveTarget`/`ProfileNote.targets`),
  grep every reader of the old field before shipping — TypeScript won't catch one still reading
  `marker.optimalHigh` directly, since both are same-shaped numbers. Missed this in
  `format.ts`'s `formatTargetText`; code review caught it, not tsc or tests. A marker's
  body/blurb (tooltip prose) is a separate read path from the resolved target — it can keep
  a stale hardcoded number even after every code reader of the old field is fixed, since
  it's prose, not a TS reader `grep` would catch.
- New marker notes default to `curated: false` (hidden until "Show all") and no `direction`
  (neutral gray trend arrow) unless set explicitly — easy to forget both when authoring.
- A marker's `type:` (numeric vs qualitative) must match how the source lab actually reports
  it, not just the assay's nominal capability — `uro_ubg` was scaffolded `numeric` but this
  user's lab (dipstick, not quantitative) always reports it as text ("Normal"), which
  hard-blocked saving until retyped `qualitative`. Check real recorded values before trusting
  a newly-scaffolded marker's `type:`.
- A lab report's own red/"out of range" flagging doesn't always mean "needs attention" here — for
  a `higher_better` marker with only a floor (`ranges[].low`, e.g. an antibody titer like `hbsab`),
  the reference interval's low bound is often the *protective* threshold, so clearing it is the
  good outcome even though the report flags it red for being "outside the interval." Don't mirror
  the report's literal flagging without checking which direction is actually clinically better.
- Command ids are not slugs of display names: "Open dashboard" → `open-health-dashboard`.
  Others: `open-health-planner`, `add-lab-visit`.
- Visit values are stored raw-as-reported (not canonical) with unit noted in a `<id>_unit`
  sibling key on `VisitNote.values`; conversion to canonical happens read-time in
  `dashboard.ts`'s `buildSeries`/`toCanonicalReading`. Don't reintroduce write-time conversion.
- Marker frontmatter keys are snake_case for camelCase `MarkerNote` fields (`alt_unit`,
  `alt_factor`, `source_url`, `year_planned`, `optimal_high`/`optimal_low`) — get the casing
  wrong and the field silently parses as `undefined`, no error.
- A new marker needs wiring in 3 places to be fully visible: the marker note, the visit note's
  value, and `03 base/Health.base`'s matching view's `order:` list (keyed by the marker's
  `concern`) — the in-plugin dashboard works without step 3, so it's easy to forget.
- A paired marker's `pair:` frontmatter is a shared group key (e.g. both twins carry `pair: bp`),
  not the partner's `id` — `pairByPartner` (`core/entry.ts`) matches on equal `pair` values, not
  an id-to-pair-id lookup. Get this backwards in a test fixture and the pair silently splits into
  two solo rows instead of failing loudly.

## Write seam

Every frontmatter write goes through `vault/writer.ts`'s `writeFrontmatter()`, which does
not resolve until `metadataCache`'s `"changed"` event fires for that file (with a timeout
fallback). This exists because `getFileCache` can return pre-write data after
`processFrontMatter` resolves. A caller doing `scanVault()`/`reload()` right after any
`writer.ts` write can trust the result — no manual in-memory patching.

## Testing

- `src/vault/fixtures/fake-app.ts` — minimal in-memory `App` fake (the `vault` /
  `metadataCache` / `fileManager` subset `reader.ts` and `writer.ts` use). Supports
  injecting a mid-batch write failure via `failOn`, and simulating re-index lag via
  `deferIndexing` + `flushMetadataCache(path)`. Also has `vault.read`/`vault.modify` for raw
  (non-frontmatter) file content, e.g. a `.base` file. Reuse it rather than rebuilding.
- `src/core/fixtures/real-vault.ts` is a small anonymized sample, **not** the full vault.
  Before hardcoding a lookup keyed on frontmatter values (e.g. `concern` ids), enumerate
  the real values from `09 about-me/markers/*.md` — the fixture alone missed the literal
  `Blood Count` concern and broke column placement for that whole group.
- `vitest.config.ts`'s `include` covers `src/core|vault|render/**`. A test file outside
  those globs is silently skipped by `bun run test`.
- Not every `render/*.ts` file is testable even for its pure exports: `dashboard-view.ts`,
  `visit-editor-view.ts`, `planner-view.ts` import `icons.ts`, which value-imports `obsidian`
  (unresolvable outside the app). Pure logic that needs coverage from inside one of these goes
  in its own Obsidian-free sibling file — check for an existing domain-shaped one first
  (`rows.ts` for `RowEntry`-scoped logic, `tier-lanes.ts` for concern-group ordering) before
  adding a new bucket file. `rows.ts` is itself hybrid: untested DOM-builders (`buildArrowCell`,
  `fillMarkerRowContent`) sit beside its tested pure exports.
- Settings-tab classes cannot be instantiated in tests. Extract the decision logic —
  see `SettingsDirtyTracker` (`settings-dirty-tracker.ts`) and `saveOrder`
  (`settings-context.ts`), both tested with zero Obsidian imports.

## Structure

- A new settings-tab section with its own drag-reorder/rename/CRUD block follows the
  `SettingsSectionContext` + stateful section-class pattern (`settings-context.ts`,
  `settings-concern-section.ts`, `settings-profile-section.ts`). Do not grow
  `settings-tab.ts` directly.
- The `--hlth-*` tokens in `styles.css` are scoped to `.health-dashboard-outer`,
  `.health-planner-outer`, and `.health-visit-editor-outer` (one selector list — the three
  ItemViews sharing the plugin's visual language). Anything mounted into a host plugin, or into
  a `Modal`'s `contentEl` (also outside that DOM subtree), cannot see them — use raw Obsidian
  vars/`Setting` there instead of `.hlth-editor-*`. Interactive-element classes
  (`.hlth-showall-btn`, `.hlth-pill`) need the same three-selector list separately — they
  were scoped to `.hlth-dash` only for a while, so Planner/Editor buttons silently rendered
  with Obsidian's default button skin instead of the plugin's. When adding a 4th view to
  this family, extend both lists, not just the token one.
- `.hlth-hidden` (`display: none`) is scoped `.hlth-row.hlth-hidden`, not a general-purpose hide
  utility — toggling it on any other element type (an input, a span) silently does nothing.
  Use inline `style.display` for one-off visibility toggles outside dashboard rows.
- A conditionally-empty flex child (e.g. an arrow span with `textContent === ""`) still consumes
  its own `gap` slot on both sides. Skip appending it entirely when there's nothing to show,
  rather than rendering it empty — don't fight the gap with margins.
- `IconSuggest` (`src/render/icon-suggest.ts`, ported from linear-calendar) already exists
  for Lucide-icon text fields. Reuse it.
- Don't use Obsidian's `Setting` class inside the dashboard/planner/visit-editor family — its rows
  render full-settings-page-sized, clashing with the compact `.hlth-editor-*` language. Build
  inputs directly with `.hlth-editor-field`/`.hlth-editor-select` instead (see `visit-editor-view.ts`'s
  Person/Date/Facility row for the pattern). This restriction is scoped to those three views' own
  DOM — a `Modal` opened from any of them sits outside that tree anyway (see the `--hlth-*` note
  above), so `Setting` is the right choice there instead (see `EditTargetModal` in
  `dashboard-view.ts`).
- `mountHealthWidget` (`main.ts`) is the guest side of the dashboard handshake;
  `obsidian-lhak-dashboard/src/panels/HealthPanel.ts` is the host side.
- `.hlth-widget { zoom: 0.9 }` is intentional, not an oversight — Obsidian is
  Chromium-only.
- `HealthView` splits `refresh()` into `reload()` (rescans the vault — data may have changed) and
  `repaint()` (recomputes from the cached snapshot, no I/O — for pure UI-state changes). Session-only
  UI state (`showAll`/`unitToggles`/`openMarkerId`/`activePerson`) lives in one `DashboardViewState`
  object passed by reference through `DashboardRenderOptions`, not bare DOM state or scattered fields.
  Row open/close is the one exception: it self-handles via CSS class toggle and does NOT trigger a
  repaint — don't wire a new toggle through the same path without checking whether it actually needs one.
- Every `ItemView` splits into a thin adapter (`src/*-view.ts`: lifecycle, I/O, Obsidian `Modal`/`Notice`)
  and a pure render module (`src/render/*-view.ts`: `renderX(root, state, opts)`, DOM-only, no I/O) —
  see `dashboard-view.ts`, `planner-view.ts`, `bases-view.ts`, `visit-editor-view.ts` and their
  `render/` siblings. State that must survive a repaint is passed by reference in a shared state
  object (mutated in place by input handlers); I/O-touching callbacks stay adapter-owned in `opts`.
- Curated view and Show all use two independent lane-layout systems, not one: Show all keeps the
  pinned-column system (`WIDE_LANES`/`MEDIUM_LANES`/`NARROW_LANES` in `tier-lanes.ts`); Curated view
  uses a dynamic weight-based packer (`packLanes`, same file — see `docs/adr/0003`) that ignores the
  pin entirely, including a `pinFirst` exception for Vitals. A change to one doesn't touch the other.

## Process

After finishing a ticket, check off its boxes in `tickets.md` and commit separately
(`docs: check off ticket N`).

Architecture decisions live in `docs/adr/` (`0001-*.md`, `0002-*.md`, ...) -- check there before
redesigning something that already has a record; write one when a decision is hard to reverse,
non-obvious without context, and a real trade-off.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature-slug>/` (`MAP.md` + `tickets/`) -- established by the
`.scratch/health-dashboard/` map that produced this plugin's original PRD. See
`docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

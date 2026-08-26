# View/UI/settings conventions (src)

- Every `ItemView` splits into a thin adapter (`src/*-view.ts`: lifecycle, I/O, Obsidian
  `Modal`/`Notice`) and a pure render module (`src/render/*-view.ts`: `renderX(root, state,
  opts)`, DOM-only, no I/O) — see `dashboard-view.ts`, `planner-view.ts`, `bases-view.ts`,
  `visit-editor-view.ts` and their `render/` siblings. State that must survive a repaint is
  passed by reference in a shared state object (mutated in place by input handlers); I/O-
  touching callbacks stay adapter-owned in `opts`.
- `HealthView` splits `refresh()` into `reload()` (rescans the vault — data may have changed)
  and `repaint()` (recomputes from the cached snapshot, no I/O — for pure UI-state changes).
  Session-only UI state (`showAll`/`unitToggles`/`openMarkerId`/`activePerson`) lives in one
  `DashboardViewState` object passed by reference through `DashboardRenderOptions`, not bare
  DOM state or scattered fields. Row open/close is the one exception: it self-handles via CSS
  class toggle and does NOT trigger a repaint — don't wire a new toggle through the same path
  without checking whether it actually needs one.
- A new settings-tab section with its own drag-reorder/rename/CRUD block follows the
  `SettingsSectionContext` + stateful section-class pattern (`settings-context.ts`,
  `settings-concern-section.ts`, `settings-profile-section.ts`). Do not grow
  `settings-tab.ts` directly.
- Settings-tab classes cannot be instantiated in tests. Extract the decision logic — see
  `SettingsDirtyTracker` (`settings-dirty-tracker.ts`) and `saveOrder`
  (`settings-context.ts`), both tested with zero Obsidian imports.
- Don't use Obsidian's `Setting` class inside the dashboard/planner/visit-editor family — its
  rows render full-settings-page-sized, clashing with the compact `.hlth-editor-*` language.
  Build inputs directly with `.hlth-editor-field`/`.hlth-editor-select` instead (see
  `visit-editor-view.ts`'s Person/Date/Facility row for the pattern). A `Modal` opened from
  any of them sits outside that view's own DOM tree, so `Setting` is the right choice there
  instead (see `EditTargetModal` in `dashboard-view.ts`).
- The `--hlth-*` tokens in `styles.css` are scoped to `.health-dashboard-outer`,
  `.health-planner-outer`, and `.health-visit-editor-outer` (one selector list — the three
  ItemViews sharing the plugin's visual language). Anything mounted into a host plugin, or
  into a `Modal`'s `contentEl` (also outside that DOM subtree), cannot see them — use raw
  Obsidian vars/`Setting` there instead. Interactive-element classes (`.hlth-showall-btn`,
  `.hlth-pill`) need the same three-selector list separately. When adding a 4th view to this
  family, extend both lists, not just the token one.
- `mountHealthWidget` (`main.ts`) is the guest side of the dashboard handshake;
  `obsidian-lhak-dashboard/src/panels/HealthPanel.ts` is the host side. `.hlth-widget { zoom:
  0.9 }` is intentional, not an oversight — Obsidian is Chromium-only.
- Command ids are not slugs of display names: "Open dashboard" → `open-health-dashboard`.
  Others: `open-health-planner`, `add-lab-visit`.
- `vitest.config.ts`'s `include` covers `src/core|vault|render/**`. A test file outside those
  globs is silently skipped by `bun run test`.
- `IconSuggest` (`render/icon-suggest.ts`, ported from linear-calendar) already exists for
  Lucide-icon text fields. Reuse it.

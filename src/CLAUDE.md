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
- Styles are written in `styles.src.css`; `styles.css` is generated from it (esbuild, second
  entry in `esbuild.config.mjs`, gitignored) with the `@lhak/style` alias layer inlined. Colours
  and fonts are `--lk-` roles, which resolve only under an element carrying `lk-root`:
  `HealthPlugin.applyViewRoot(el)` adds it and applies the font settings to the three ItemViews'
  `contentEl` and the Bases view's container, and the shared tooltip (`render/tooltip.ts`, on
  `document.body`) carries `lk-root` itself. The lhak-dashboard widget reads the roles from its
  host's root. A `Modal` and the settings tab sit outside every root: use raw Obsidian vars or
  `Setting` there. `bun run lint` runs the `@lhak/style` stylelint check (no raw colours, no px
  font sizes, no `--hlth-`); `src/styles.test.ts` pins the built sheet.
- Font settings are the shared `@lhak/style` font-role keys (`fontHeading`/`fontBody`/`fontMono`
  + `*Custom`): heading sets `--lk-font-label`, body `--lk-font-interface`, mono
  `--lk-font-code`. `settingsFromSaved` (`settings.ts`) reads saved data and maps the old
  `"health"` choice to `"default"`; `applyFonts()` re-applies to every open ItemView and the
  tooltip on a settings change; an open Bases view takes the change on its next render. Import from `@lhak/style/obsidian-helpers/font-roles` in code a
  test loads (it never loads `obsidian`). Interactive-element classes (`.hlth-showall-btn`,
  `.hlth-pill`) carry their own parallel list, keyed on the inner `.hlth-dash`/`.hlth-planner`/
  `.hlth-visit-editor` containers rather than the outer roots; `styles-scope-parity.test.ts`
  fails if the two lists stop covering the same number of views.
- `mountHealthWidget` (`main.ts`) is the guest side of the dashboard handshake;
  `obsidian-lhak-dashboard/src/panels/HealthPanel.ts` is the host side. `.hlth-widget { zoom:
  0.9 }` is intentional, not an oversight — Obsidian is Chromium-only.
- Command ids are not slugs of display names: "Open dashboard" → `open-health-dashboard`.
  Others: `open-health-planner`, `add-lab-visit`.
- Lucide-icon text fields use the shared `IconSuggest` (`@lhak/style/obsidian-helpers`). Its
  rows carry `lk-icon-suggest-item`/`lk-icon-suggest-icon`, styled in `styles.src.css`.
- Dashboard, planner and visit editor share ONE tab: `findHealthLeaf` reuses whichever is open, so `openVisitEditor`/`openPlanner` replace the dashboard in place. A live-check script that detaches that leaf closes the user's
  dashboard — switch back with the `open-health-dashboard` command instead.

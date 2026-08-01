# Research: how the vault feeds the plugin — existing plugins + Bases

_Asset for ticket 01. Findings a data-model decision (ticket 02) can build on._

## TL;DR

- **Both existing lhak plugins read the vault the same way:** `app.vault.getMarkdownFiles()` → `app.metadataCache.getFileCache(file).frontmatter`. **No Dataview, no Bases** today. Frontmatter is the shared source of truth; a debounced `metadataCache.on('changed')` drives re-render.
- **Bases _does_ expose a plugin API** (obsidian `1.13.1` typings, APIs `@since 1.10.0`): `Plugin.registerBasesView(viewId, registration)` lets a plugin register a **custom Bases view type**. Your view receives the Base's post-filter/post-formula dataset (`BasesQueryResult` of `BasesEntry` objects) and renders however it wants. So the plugin _can_ leverage Bases — not by "querying a `.base` from anywhere", but by owning a render surface **inside** the Bases framework. Requires bumping `minAppVersion` to ≥ `1.10`.
- **Widget-in-dashboard is a solved pattern:** the host plugin reads `app.plugins.plugins['<id>']`, calls a **public method the child plugin exposes** (`mountMonthStrip(container, …)`), and gets back a **handle** (`{next, prev, today, destroy}`) it drives. "Jump to full view" = `app.commands.executeCommandById('<id>:<command>')`. Copy this verbatim for the health widget (ticket 08).

---

## 1. How lhak's plugins read + render vault data

Both are esbuild/bun-built Obsidian plugins that register a custom `ItemView` and paint plain DOM (no framework, no chart lib — hand-built SVG/DOM).

### Data access (identical shape in both)

```ts
for (const file of app.vault.getMarkdownFiles()) {
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter;        // FrontMatterCache
  const tags = getAllTags(cache);        // includes inline + frontmatter tags
  // classify / map fm → typed item
}
```

- **lhak-dashboard** (`src/data/*.ts`): one **combined single-pass scan** — `loadDashboardData()` runs `getMarkdownFiles()` **once** and calls per-file pure classifiers (`classifyStats`, `classifyProject`, `classifyPinned`) inside the loop. `data/CLAUDE.md` rule: _never add a separate scan; add another `classify*()` call in the existing loop._ Seam is `loadDashboardData() → DashboardSnapshot`; panels receive the snapshot via `update(snapshot)`.
- **linear-calendar** (`src/data/FrontmatterScanner.ts`): a `DataSource` interface (`scan(mapping, year)`) backed by an **mtime-keyed cache** (`Map<path, {mtime, item}>`), invalidated on `vault.on('delete'|'rename')` and re-run on `metadataCache` change. Notes are gated by a tag (`#linear-calendar`) then `mapFrontmatterToItem`.

**Takeaway for the health model:** the proven pattern is _year-notes with structured frontmatter_ (matches the "many notes, one per year" data direction already decided), scanned once into a typed snapshot. A cache keyed on `file.stat.mtime` is the established way to keep it cheap.

### Render + view lifecycle

- `registerView(VIEW_TYPE, leaf => new XView(leaf, …))` + an `open-*` command + ribbon icon → `activateView()` (reuse existing leaf via `getLeavesOfType(VIEW_TYPE)[0]`, else `getLeaf('tab')` + `setViewState`).
- `ItemView`: `onOpen()` builds DOM **once**; a `render()`/`renderCalendar()` clears+repaints on data change; `onClose()` tears down timers/listeners. State persisted across reloads via `getState()`/`setState()` (year, layout, hidden categories, density).
- Re-render triggers: debounced (300 ms) `metadataCache.on('changed')` for relevant files + `vault` create/delete/rename.
- **Settings**: `loadData()`/`saveData()` with `Object.assign({}, DEFAULT_SETTINGS, saved)`; `PluginSettingTab` for UI. Save → `saveAndRefresh(kind)` fans out to open views.

### Build / deploy (copy for obsidian-health)

- `bun esbuild.config.mjs` (dev) / `… production` (build).
- `deploy` script builds then `cp main.js manifest.json styles.css` into the iCloud vault's `.obsidian/plugins/<id>/`.
- Tests: `vitest run` — **data + utils layers only**; panel/DOM render has **no unit tests** ("verify visually after deploy"). Pure logic (classifiers, layout thresholds, cache policy) is extracted into tested pure functions; DOM is the untested shell.

### Visual / interaction conventions (for look ticket 05)

- **Theme-native colors:** lean on Obsidian CSS vars — `var(--color-accent)`, `color-mix(in srgb, … %, transparent)` for tints. Category colors stored as hex in settings, converted to `rgba()` with a hover-boost (`0.15 → 0.25`).
- **Density is a first-class control:** linear-calendar exposes a row-height slider; layout toggle (horizontal/vertical). lhak-dashboard adapts via **`ResizeObserver` + `data-*` attribute thresholds** (in a pure `layoutFlags()` util) — _not_ `container-type`/`cqi`/`clamp()` (perf: they recalc every resize pixel). Panes resize in the 600–900px band; breakpoints below 600 never fire.
- **Tooltip/hover:** a dedicated `Tooltip` component with a single document listener, cleaned up on close. Hover raises tint, not a separate element per cell.
- **Chrome:** toolbar with `clickable-icon` buttons + `setIcon()` (lucide), section labels, `lhk-*` / `lc-*` class prefixes. Empty states are explicit (`.lhk-empty` "Add pinned: true to a note's frontmatter").
- **Overflow:** flex row + `overflow:hidden` clips the _end_; for "newest must stay visible" (a year-over-year strip ending at the latest year) add `justify-content:flex-end` + `flex-shrink:0`.

---

## 2. Can a plugin leverage Bases, or should it own rendering?

**Both are possible; the realistic answer for this project is a hybrid.**

### What the Bases plugin API actually offers (obsidian 1.13.1, `@since 1.10.0`)

| Surface | What it gives you |
|---|---|
| `Plugin.registerBasesView(viewId, registration)` | Register a **custom view type** selectable in a `.base` file. Returns `false` if Bases disabled. |
| `BasesViewRegistration` (`factory`, `options`, `name`, `icon`) | Factory `(controller: QueryController, containerEl) => BasesView` + config options surfaced in the Bases UI. |
| `abstract class BasesView` | You extend it. Gets `data: BasesQueryResult`, `allProperties: BasesPropertyId[]`, `config`, and an `onDataUpdated()` callback the framework calls whenever the vault or Base config changes (results are **recreated**, don't hold refs). |
| `BasesEntry` | Per-row: `.file: TFile` + `.getValue(propertyId): Value \| null` — reads the **computed** value of a frontmatter property _or a Base formula_. |
| `BasesEntryGroup` | groupBy support (`key`, `entries[]`). |

**So Bases handles query + filter + formula-evaluation + sort/group; your registered view owns rendering** and gets pushed fresh data on every change. That's a genuine "leverage Bases" path — the Base is the source of truth, your plugin is a renderer plugged into it.

**Limits / caveats:**
- The entry point is a **`.base` file (or an `![[x.base#view]]` embed)** — the framework drives your view. `QueryController` is opaque in the typings (empty class); there's **no documented "read arbitrary `.base` data from my own ItemView"** call. To get Bases-computed data you register a view and let it push.
- Requires `minAppVersion ≥ 1.10` (both existing plugins are at `1.8.0`). Bases must be enabled in the vault.
- Computation you can push into the Base is limited to the **Bases formula language** (see the skill's FUNCTIONS_REFERENCE). Rich year-over-year arrow/flag logic (two-tier personal-target rules) is more naturally TypeScript.

### The three patterns

- **A — Base-driven custom view** (`registerBasesView`): `.base` defines filter (the year-notes) + formulas; your registered view renders. Native "concern header opens a filtered Base view." Constrained to the formula language + `.base` entry point.
- **B — Own `ItemView` + frontmatter scan** (what both lhak plugins do today): full control of computation and render; register your own `VIEW_TYPE`; Bases coexists independently reading the same frontmatter. Simplest, most flexible, proven in this codebase.
- **Hybrid (recommended, matches vision 04):** frontmatter on the per-year notes = **shared source of truth**. The plugin owns its rich dashboard as an `ItemView` (Pattern B) for the hero/flagged/accordion UI and TypeScript flag logic; **and** registers a custom Bases view (Pattern A) so the vision's _"concern headers open filtered Base views"_ resolves natively — the same notes power both, no divergence. Ticket 02 decides how much lives in frontmatter vs. Base formulas.

---

## Sources

- `~/workspace/github.com/lhak1341/obsidian-lhak-dashboard/src/{main,view,types}.ts`, `src/data/*.ts`, `src/panels/CalendarPanel.ts`, `src/{data,panels,utils}/CLAUDE.md`, `package.json`.
- `~/workspace/github.com/lhak1341/obsidian-linear-calendar/src/{main}.ts`, `src/view/{LinearCalendarView,GridRenderer,Tooltip}.ts`, `src/data/{DataSource,FrontmatterScanner}.ts`.
- `obsidian` `1.13.1` type definitions (`node_modules/obsidian/obsidian.d.ts`): `registerBasesView`, `BasesView`, `BasesEntry`, `BasesViewRegistration`, `QueryController`.
- `obsidian-bases` skill (`.base` YAML schema, formulas, embedding).

## 3. Widget → dashboard integration (for health widget, ticket 08)

The exact mechanism, straight from `CalendarPanel.ts` — **copy this**:

1. **Child plugin exposes a public method** on its plugin class. linear-calendar's `main.ts`:
   ```ts
   mountMonthStrip(container, categoriesEl, onMonthChange?): MonthStripHandle
   ```
   It constructs the plugin's **own renderer** into the host's container (styles/tooltips/bars all work as in the full view) and returns a handle:
   ```ts
   interface MonthStripHandle { next(); prev(); today(); destroy(); }
   ```
   A `ResizeObserver` inside re-renders on width change; `onMonthChange(year, month)` fires on mount + each nav so the host paints its own label.

2. **Host reaches the child instance** and calls it:
   ```ts
   const lc = app.plugins?.plugins?.['obsidian-linear-calendar'];
   if (!lc?.mountMonthStrip) { /* render "plugin not found" empty state */ }
   this.handle = lc.mountMonthStrip(stripEl, catsEl, (y, m) => label.setText(...));
   ```
   Host owns nav buttons (`handle.prev/next/today`) and **must call `handle.destroy()`** on re-mount/close.

3. **"Jump to full plugin"** = fire the child's command, not a direct view call:
   ```ts
   const cmd = 'obsidian-linear-calendar:open-linear-calendar';
   if (!app.commands.commands[cmd]) new Notice('… plugin not found.');
   else app.commands.executeCommandById(cmd);
   ```

4. **Host wiring** (from `panels/CLAUDE.md`): CalendarPanel is an **"embedded UI panel"** — `update(snapshot)` is a **no-op** (it doesn't consume vault data), `render()` (the re-mount) is called **once from `loadData()`**, not on every vault change. It's kept as a typed field precisely for that startup-only `render()`.

**For obsidian-health:** the health plugin exposes e.g. `mountHealthWidget(container): WidgetHandle` returning `{ refresh(); destroy() }`; lhak-dashboard adds a `HealthPanel` mirroring `CalendarPanel` (no-op `update`, `render()` from `loadData()`); "open full view" fires `obsidian-health:open-health-dashboard`. Graceful "plugin not found" empty state included.

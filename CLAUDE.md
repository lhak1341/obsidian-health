# obsidian-health

Obsidian plugin (`health`) — see `docs/PRD.md` and `tickets.md`.

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill —
bun, script contract, `bun test` vs `bun run test`, settings-tab structure, CSS
specificity, `metadataCache` write-lag, live debugging. Only repo-specific facts are below.

## Domain

Real vault data lives under `09 about-me/{markers,profiles,health/labs/<person>}`.

- Marker `panel` (drives the Add Visit form's grouping, mirroring the physical lab report's
  sections) and `concern` (drives dashboard column grouping, clinical/thematic) are
  intentionally separate axes over the same markers. Do not collapse them.
- New marker notes default to `curated: false` (hidden until "Show all") and no `direction`
  (neutral gray trend arrow) unless set explicitly — easy to forget both when authoring.
- A marker's `type:` (numeric vs qualitative) must match how the source lab actually reports
  it, not just the assay's nominal capability — `uro_ubg` was scaffolded `numeric` but this
  user's lab (dipstick, not quantitative) always reports it as text ("Normal"), which
  hard-blocked saving until retyped `qualitative`. Check real recorded values before trusting
  a newly-scaffolded marker's `type:`.
- Command ids are not slugs of display names: "Open dashboard" → `open-health-dashboard`.
  Others: `open-health-planner`, `add-lab-visit`.

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
  `deferIndexing` + `flushMetadataCache(path)`. Reuse it rather than rebuilding.
- `src/core/fixtures/real-vault.ts` is a small anonymized sample, **not** the full vault.
  Before hardcoding a lookup keyed on frontmatter values (e.g. `concern` ids), enumerate
  the real values from `09 about-me/markers/*.md` — the fixture alone missed the literal
  `Blood Count` concern and broke column placement for that whole group.
- `vitest.config.ts`'s `include` covers `src/core|vault|render/**`. A test file outside
  those globs is silently skipped by `bun run test`.
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
  ItemViews sharing the plugin's visual language). Anything mounted into a host plugin
  cannot see them — use raw Obsidian vars there. Interactive-element classes
  (`.hlth-showall-btn`, `.hlth-pill`) need the same three-selector list separately — they
  were scoped to `.hlth-dash` only for a while, so Planner/Editor buttons silently rendered
  with Obsidian's default button skin instead of the plugin's. When adding a 4th view to
  this family, extend both lists, not just the token one.
- `IconSuggest` (`src/render/icon-suggest.ts`, ported from linear-calendar) already exists
  for Lucide-icon text fields. Reuse it.
- `mountHealthWidget` (`main.ts`) is the guest side of the dashboard handshake;
  `obsidian-lhak-dashboard/src/panels/HealthPanel.ts` is the host side.
- `.hlth-widget { zoom: 0.9 }` is intentional, not an oversight — Obsidian is
  Chromium-only.

## Process

After finishing a ticket, check off its boxes in `tickets.md` and commit separately
(`docs: check off ticket N`).

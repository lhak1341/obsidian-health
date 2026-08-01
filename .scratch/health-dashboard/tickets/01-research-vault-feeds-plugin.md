---
id: "01"
title: "Research: how the vault feeds the plugin — existing plugins + Bases"
type: wayfinder:research
mode: AFK
status: closed
assignee: lhak
blocked-by: []
---
# Research: how the vault feeds the plugin — existing plugins + Bases

## Question

Two things a data-model decision depends on:

1. **How do lhak's existing plugins read vault data and render?**
   Read `obsidian-lhak-dashboard` and `obsidian-linear-calendar` (both under
   `~/workspace/github.com/lhak1341/`). Capture: how they locate/parse notes, whether they read
   frontmatter/Dataview/Bases, how they render (view type, HTML/DOM, charts), build tooling, and any
   reusable conventions. Also capture their **visual / interaction conventions** (layout, view chrome,
   color, density, hover patterns) — the look ticket (05) draws inspiration from them so the new plugin
   feels consistent with lhak's existing ones. **Specifically capture how `obsidian-linear-calendar`
   integrates into `obsidian-lhak-dashboard`** — the widget/embed mechanism (view registration, dashboard
   widget API, how one plugin surfaces a panel inside another, and how a "jump to full plugin" link works).
   The health widget (ticket 08) reuses this pattern.

2. **Can an Obsidian plugin leverage Bases, or should it own rendering?** (the user's explicit open question)
   Investigate: is there a Bases API a plugin can read (query a `.base`, read the structured data behind it)?
   Can a plugin embed or extend a Base view? Or is the realistic pattern "notes + frontmatter are the shared
   source of truth; Bases and the plugin each read them independently"? Use the `obsidian-bases` skill +
   current Obsidian docs.

Deliver a short markdown summary (linked from this ticket) that a data-model decision can build on.

## Resolution

Full findings: [research/01-vault-feeds-plugin.md](../research/01-vault-feeds-plugin.md).

1. **Vault read (both lhak plugins, identical):** `vault.getMarkdownFiles()` → `metadataCache.getFileCache(file).frontmatter`. **No Dataview, no Bases** today — frontmatter is the shared source of truth. Single combined mtime-cached scan → typed snapshot → `ItemView` renders plain DOM (hand-built, no chart lib); debounced `metadataCache.on('changed')` re-renders. Build = bun+esbuild, deploy = `cp main.js/manifest.json/styles.css` into the vault's plugin dir; vitest covers data/utils only, DOM verified visually. Visual conventions captured for ticket 05 (theme CSS vars + `color-mix` tints, density slider, `ResizeObserver`+`data-*` thresholds not `cqi`, single-listener `Tooltip`, `lhk-*`/`lc-*` prefixes).
2. **Bases API exists** (`obsidian` 1.13.1, `@since 1.10.0`): `Plugin.registerBasesView(viewId, registration)` registers a **custom Bases view type**; the view extends `BasesView`, receives the post-filter/formula `BasesQueryResult` (`BasesEntry.file` + `.getValue(propertyId)`) and an `onDataUpdated()` push. So the plugin **can** leverage Bases — as a renderer plugged into the Bases framework, entry point a `.base` file/embed; **no** documented "query an arbitrary `.base` from my own view." Needs `minAppVersion ≥ 1.10`. **Recommendation → hybrid:** per-year-note frontmatter = shared source of truth; plugin owns its rich `ItemView` dashboard (Pattern B, TypeScript flag logic) **and** registers a custom Bases view (Pattern A) so vision-04's "concern headers open filtered Base views" resolves natively. Ticket 02 decides the frontmatter-vs-formula split.
3. **Widget→dashboard mechanism (for ticket 08), copy verbatim from `CalendarPanel.ts`:** child plugin exposes a public `mount…(container) → handle` method that mounts its own renderer and returns `{next,prev,today,destroy}`; host reaches it via `app.plugins.plugins['<id>']`, renders a "plugin not found" empty state if absent, and **must call `handle.destroy()`** on re-mount/close; "jump to full view" = `app.commands.executeCommandById('<id>:<command>')`. Host panel is an "embedded UI panel": `update()` no-op, `render()` from `loadData()` only.

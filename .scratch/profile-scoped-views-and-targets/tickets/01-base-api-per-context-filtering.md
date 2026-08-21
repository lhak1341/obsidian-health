---
id: "01"
title: "What does Obsidian's Bases API support for per-open-context filtering?"
type: wayfinder:research
mode: AFK
status: closed
assignee:
blocked-by: []
---
# What does Obsidian's Bases API support for per-open-context filtering?

## Question

`openConcernBase` (`src/dashboard-view.ts:130`) opens a single shared `.base` file
(`settings.basePath`) and switches to a named view, with no person filter. We want the
resulting Base view to show only the active profile's rows.

Investigate Obsidian's Bases API/format to answer:

- Can a `.base` file's filter reference something set at open-time (e.g. a property passed via
  `leaf.setViewState`), or are filters always static YAML baked into the file?
- Does the Bases plugin expose any API for programmatically writing/patching a `.base` file's
  filter before opening it (the plugin already writes frontmatter via `vault/writer.ts` -- would
  patching a `.base` file go through a comparable seam, or does it not participate in the
  `metadataCache` write-lag behavior that motivated that seam)?
- Is there a supported way to have multiple named views in one `.base` file where each view's
  filter differs (e.g. one view per profile), so `openConcernBase` could pick the view instead
  of patching a filter?
- What do other Obsidian plugins/community discussion say about parameterizing Base views at
  runtime, if anything?

## Resolution

Full detail: `.scratch/profile-scoped-views-and-targets/research/01-base-api-per-context-filtering.md`
on branch `research/base-api-per-context-filtering` (throwaway research branch, not merged).

1. **Filters are static YAML only — no open-time parameterization.** The only context-referencing
   token is `this`, and a staff reply (WhiteNoise) on a confirmed bug report says `this` actually
   tracks "whatever file is currently active" workspace-wide, not the base's own file or anything
   a caller can set — the docs describing it as base-file/embedding-file/sidebar-scoped are
   themselves wrong per staff. `leaf.setViewState`'s `state` object has no wiring into filter
   evaluation.
2. **No supported API to patch a `.base` file's filter.** `.base` files are whole-file YAML, not
   note frontmatter, so `FileManager.processFrontMatter()` (what `vault/writer.ts` wraps) doesn't
   apply — a plugin would use plain `Vault.create`/`modify`/`process`, confirmed by a forum
   workaround (`app.vault.create(basePath, baseContent)`). Two open, staff-unanswered forum FRs
   confirm there is no dedicated Bases read/write API at all. Whether such a write shares
   `metadataCache`'s `"changed"`-event write-lag is not directly confirmed anywhere — the closest
   documented analog (Canvas files, also non-markdown) shows metadataCache events do **not** fire
   for those writes, suggesting `.base` writes likely track `Vault`'s own `"modify"`/`"create"`
   events instead, not `metadataCache`. Flagged as inference, not confirmed fact.
3. **Yes — multiple named views per `.base` file, each with its own filter, is fully supported**
   and documented (view-level filters AND with base-level ones). This is exactly the mechanism
   `openConcernBase` already uses to switch views (`state.viewName`), so a per-profile view
   (`person == "<profile>"`) needs only a view-name lookup at open time, no runtime filter write.
4. **No community mechanism found for runtime-parameterizing Base views from a plugin.** The only
   official plugin extension point is `Plugin.registerBasesView()`, which registers a custom
   *renderer* (not a filter injector) and would only help if the dashboard shipped its own Bases
   view type instead of using the stock table view. No GitHub issues on `obsidianmd/obsidian-releases`
   (no separate Bases repo exists) discuss runtime parameterization.

**Recommendation for Thread A:** per-profile named views inside the existing shared `.base` file
(Q3's answer) is the only mechanism with full primary-source support and no unresolved API gaps.

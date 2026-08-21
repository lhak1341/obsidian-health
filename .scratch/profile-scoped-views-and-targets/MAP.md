---
labels: [wayfinder:map]
tracker: local-markdown
feature: profile-scoped-views-and-targets
---
# Profile-scoped views and targets — design spec

## Destination

A design spec covering two related gaps, both rooted in the plugin currently treating
vault-wide state as global when it should be profile-scoped:

- **Thread A -- Base-view mixing**: clicking a concern header (`openConcernBase` in
  `dashboard-view.ts`) opens the single shared `.base` file at `settings.basePath` with no
  person filter, so the Base view mixes every profile together.
- **Thread B -- global marker targets**: `MarkerNote.optimalLow`/`optimalHigh` (and
  `direction`) are defined once per marker in `types.ts`, with no per-profile override.
  `ProfileNote` carries no target fields. Concrete case: weight and waist circumference need
  different optimal targets per profile (anthropometric/personal-goal, not sex/age-banded --
  `ranges[].sex`/`ranges[].age` already cover the clinical-band case and are out of scope here).

Spec only -- this map does not carry execution. It ends with a written data-model and
UI-shape decision for both threads; implementation is a separate follow-up.

## Notes

- Domain background: `CLAUDE.md`'s "Domain" section, especially the `MarkerNote.sex` vs
  `ranges[].sex` distinction (different axis from what's in scope here) and the panel/concern
  split.
- Every frontmatter write goes through `vault/writer.ts`'s `writeFrontmatter()` -- any data-model
  change must fit that write seam.
- Consult the `obsidian-plugin-dev` skill for Obsidian API/CSS conventions before finalizing
  any Base-API or settings-tab shape.
- A new settings-tab section follows the `SettingsSectionContext` + stateful section-class
  pattern (`settings-context.ts`) -- don't grow `settings-tab.ts` directly if a target-editing
  UI ends up needing one.
- Threads A and B are independent mechanisms (Obsidian Bases API vs `MarkerNote`/`ProfileNote`
  schema) sharing one map because they're the same underlying complaint (no profile axis on
  vault-wide state). A ticket resolution in one thread should not block the other unless it
  turns out they share a UI surface.

## Decisions so far

- [What does Obsidian's Bases API support for per-open-context filtering?](.scratch/profile-scoped-views-and-targets/tickets/01-base-api-per-context-filtering.md) — Bases filters are static YAML with no open-time parameterization and no plugin API to patch them at runtime, but one `.base` file can hold multiple named views with distinct filters, so `openConcernBase` should pick a per-profile view name instead of trying to inject a filter.
  Asset: `.scratch/profile-scoped-views-and-targets/research/01-base-api-per-context-filtering.md` (branch `research/base-api-per-context-filtering`)
- [Where does a per-profile marker target override live?](.scratch/profile-scoped-views-and-targets/tickets/02-target-override-data-model.md) — `ProfileNote.targets: Record<markerId, {low?, high?}>`, falls back to the marker's global `optimalLow`/`optimalHigh` when unset (no migration needed), whole-pair replacement (no per-side merge with the global value), `direction` stays marker-level. Spun off [Where does a profile edit their marker target overrides?](.scratch/profile-scoped-views-and-targets/tickets/03-target-editing-ui.md).
- [Where does a profile edit their marker target overrides?](.scratch/profile-scoped-views-and-targets/tickets/03-target-editing-ui.md) — right-click "Edit target…" on the marker row's existing context menu (alongside Curate/Un-curate), opening a small form modal scoped to the dashboard's active profile; prefills the effective value, clearing both fields resets to the marker's global default.
- [How does openConcernBase pick a per-profile Base view?](.scratch/profile-scoped-views-and-targets/tickets/04-base-view-rollout.md) — runtime suffix convention (`${viewName} — ${person}`), hand-authored views (no plugin write API for `.base` files), no all-profiles combined view. Live-tested against the real vault: per-profile view-level filters work correctly, and a missing view degrades safely on its own (Obsidian shows an inline "not found" message, never silent wrong data) — no plugin-side existence check needed.

## Not yet specified

- **Per-profile direction override**: parked per [Where does a per-profile marker target override live?](.scratch/profile-scoped-views-and-targets/tickets/02-target-override-data-model.md) — no case has forced this yet (e.g. one profile bulking vs another cutting the same marker); revisit only if one actually shows up.
- **Missing-view message polish**: parked per [How does openConcernBase pick a per-profile Base view?](.scratch/profile-scoped-views-and-targets/tickets/04-base-view-rollout.md) — whether Obsidian's raw `View "X" not found` message is fine to ship as-is, or the plugin should catch it and route to the existing in-plugin-expand degrade instead. Small, not blocking.

## Out of scope

(none yet)

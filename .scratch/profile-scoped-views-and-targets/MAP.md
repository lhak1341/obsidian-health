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
- [Personal marker targets resolve into dashboard status and display](.scratch/profile-scoped-views-and-targets/tickets/06-personal-target-resolution.md) — delivered: `ProfileNote.targets`, `resolveTarget()`, and status/unit-toggle consumption all wired; live-verified against the real vault (waist circumference flips watch↔good under a personal target override). Unblocks [Edit a profile's marker target from the dashboard](.scratch/profile-scoped-views-and-targets/tickets/07-edit-target-from-dashboard.md).
- [Edit a profile's marker target from the dashboard](.scratch/profile-scoped-views-and-targets/tickets/07-edit-target-from-dashboard.md) — delivered: marker row's context menu gains "Edit target…" (numeric markers only) opening `EditTargetModal`, writing through `saveMarkerTarget`/`saveProfileNote`'s existing `ProfileInput`/`writeFrontmatter()` seam; clearing both fields removes the override. Live-verified against the real vault (Weight's target round-tripped 63–68 → 64/68 override → cleared back to 63–68, other profile fields untouched throughout). Code review during implementation also caught and fixed two latent bugs surfaced by this feature: `resolveTarget` treating an empty `targets` entry as an authoritative override instead of falling back, and the history chart collapsing a two-bound target to one line.
- [Plugin generates and maintains per-profile Base views](.scratch/profile-scoped-views-and-targets/tickets/08-plugin-authors-base-views.md) — a live "not found" click (real per-profile views were never hand-authored past ticket 05's own test-and-revert) exposed that the manual-authoring gap doesn't scale. Design: on-demand "Sync Base views" settings action, surgical text-splice (never a full-file YAML regenerate), an explicit `data.json` manifest for ownership (not name inference), concern set derived from live marker data, new `MarkerNote.base_order` field for column order (alphabetical fallback), `properties:` stays manual, silent-overwrite on drift, one combined preview-then-confirm modal covering adds/updates/deletes/first-run collisions, re-verify-before-write with a loud abort on concurrent edits. Scope covers both the unsuffixed base concern views and the per-profile ones. Spun off [Build: plugin generates and maintains Base views](.scratch/profile-scoped-views-and-targets/tickets/09-build-base-view-sync.md).
- [Build: plugin generates and maintains Base views](.scratch/profile-scoped-views-and-targets/tickets/09-build-base-view-sync.md) — delivered: `MarkerNote.baseOrder`, pure generator/diff/splice engine (`core/base-views.ts`), a `vault/base-view-sync.ts` adapter (plan/apply split, re-verify-before-write), and a "Sync base views" settings action with a combined preview modal. Live-verified against the real vault: this vault's actual 27 hand-authored views (9 base + 18 per-profile, never cleaned up after ticket 05's own test-and-revert) all surfaced correctly as first-run "adopt/overwrite" collisions; syncing picked up several markers that had a `concern:` but were never manually wired into the old Base `order:` lists, with zero hand-authored YAML; re-running immediately reported "already in sync". `bun run test` (255, up from 210), typecheck, and lint all clean.

## Not yet specified

- **Per-profile direction override**: parked per [Where does a per-profile marker target override live?](.scratch/profile-scoped-views-and-targets/tickets/02-target-override-data-model.md) — no case has forced this yet (e.g. one profile bulking vs another cutting the same marker); revisit only if one actually shows up.
- **Missing-view message polish**: parked per [How does openConcernBase pick a per-profile Base view?](.scratch/profile-scoped-views-and-targets/tickets/04-base-view-rollout.md) — whether Obsidian's raw `View "X" not found` message is fine to ship as-is, or the plugin should catch it and route to the existing in-plugin-expand degrade instead. Small, not blocking.

## Out of scope

(none yet)

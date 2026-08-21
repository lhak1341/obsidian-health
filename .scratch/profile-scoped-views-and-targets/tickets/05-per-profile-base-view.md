---
id: "05"
title: "Concern headers open a per-profile Base view"
type: wayfinder:task
mode: AFK
status: closed
labels: [ready-for-agent]
assignee: lhak
blocked-by: []
---
# Concern headers open a per-profile Base view

## What to build

Clicking a concern header on the dashboard while a profile is active opens (or attempts to
open) a Base view scoped to that profile, instead of today's single shared view that mixes
every profile's rows together.

The view name gains a person suffix, composed with whatever the concern header already
resolves to today (a `concernViewOverrides` entry, or the concern's label). No change to
`concernViewOverrides`'s own schema or behavior.

If the resulting per-profile view hasn't been hand-authored yet in the `.base` file, rely on
Obsidian's own inline "not found" behavior rather than adding a plugin-side existence check —
confirmed live during spec development that this degrades safely (no silent fallback to mixed
or wrong data).

Full decision detail and rationale: [How does openConcernBase pick a per-profile Base view?](04-base-view-rollout.md)
and the spec (`../SPEC.md`, "Concern-header Base view naming" / "Per-profile Base-view
authoring" / "Missing per-profile view").

## Acceptance criteria

- [x] Clicking a concern header while a profile is active computes a view name of the form
      `<today's view name> — <person>`.
- [x] The naming computation is a small, pure, unit-tested function (inputs: today's resolved
      view name, the active person; output: the suffixed name) — no Obsidian API involved in the
      function itself.
- [x] `concernViewOverrides` continues to resolve exactly as it does today (override, else
      label) before the person suffix is appended — existing behavior for that setting is
      unchanged.
- [x] Manually authoring a matching per-profile view in the vault's `.base` file (a view-level
      filter on top of the existing base-level filter) and clicking the concern header opens
      that view showing only the active profile's rows.
- [x] Clicking a concern header for a per-profile view that hasn't been authored yet does not
      show another profile's data or silently substitute a different view.

## Blocked by

None — can start immediately.

## Resolution

Added `concernViewNameForProfile(viewName, person)` — a pure function in `core/dashboard.ts`
beside `resolve()` — that appends ` — <person>` to whatever `openConcernBase` already resolves
today (a `concernViewOverrides` entry, or the concern's label; unchanged). `openConcernBase` now
threads the dashboard's active profile through to it; no existence check was added, matching the
decision that Obsidian's native "not found" state is an acceptable degrade on its own.

Verified end-to-end against the real vault: hand-authored a `Vitals — Khoa` view (view-level
`person == "Khoa"` filter layered on the base-level filter), reloaded the plugin, dispatched a
real click on the dashboard's "Vitals" header — opened the correctly-filtered view (6 rows, all
Khoa's). Removed the view and clicked again — Obsidian's inline `View "Vitals — Khoa" not found`
message appeared, no fallback to mixed or wrong data. Vault restored to its original state
(confirmed byte-identical base-file length before/after); no lasting change.

Typecheck, the new unit tests, and the full suite (210 tests) all pass.

---
id: "03"
title: "Where does a profile edit their marker target overrides?"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Where does a profile edit their marker target overrides?

## Question

[Where does a per-profile marker target override live?](02-target-override-data-model.md) locked
the shape: `ProfileNote.targets: Record<markerId, {low?: number; high?: number}>`, a nested map
in the profile note's frontmatter.

Decide how a user actually authors an entry in that map:

- Direct frontmatter editing only (like `ranges[]` today, which has no dedicated UI) -- is that
  sufficient given `targets` is a per-marker-id nested map (more error-prone to hand-type than a
  flat field)?
- A settings-tab section, following the `SettingsSectionContext` + stateful section-class
  pattern (`settings-context.ts`) that other CRUD sections in this repo use?
- Inline in the visit editor or dashboard (e.g. an edit affordance next to a marker row) --
  weigh against `CLAUDE.md`'s note that the dashboard/planner/visit-editor family doesn't use
  Obsidian's `Setting` class and builds inputs directly with `.hlth-editor-*` classes?
- If a dedicated UI is built, does it need marker-id autocomplete/validation (so a typo'd id
  silently creates a dead entry), and does that require anything beyond what `IconSuggest`
  (`src/render/icon-suggest.ts`) already demonstrates for suggest-field UX?

Invoke `/grilling` and `/domain-modeling` for this session.

## Resolution

**Surface: right-click "Edit target…" on the marker row's existing context menu**
(`dashboard-view.ts:491-501`), alongside the "Curate"/"Un-curate" item already there. Beats
both alternatives from the Question: raw frontmatter editing (b) is error-prone for a
marker-id-keyed nested map (a typo'd id silently creates a dead entry); a settings-tab section
(the ticket's own original recommendation) works but is a separate screen from where the
flagged value is actually seen. Right-click on the row sidesteps the marker-id-lookup problem
entirely -- there's no id to type, the user is already looking at the exact marker.

Opens a small form `Modal` -- the first form-style modal in the repo (the one existing `Modal`
subclass, `DiscardChangesModal` in `visit-editor-view.ts`, is confirm-only, not a form). Not a
blocker, just a new shape rather than a reused one.

**Scope:** edits `ProfileNote.targets[markerId]` for the dashboard's current `activePerson`.
Menu item hidden entirely (not disabled) when no profile is active. Appears in both Curated view
and Show all -- inherits the existing context-menu's behavior, which isn't conditioned on either.

**Prefill:** low/high fields prefill with the *effective* value (the profile's override if
present, else the marker's global `optimalLow`/`optimalHigh`) -- editing from a visible baseline
beats a blank form.

**Reset:** no separate "reset to global" button. Clearing both fields and saving accomplishes
the same thing, consistent with [Where does a per-profile marker target override live?](02-target-override-data-model.md)'s
unset-means-no-bound semantics (round-2 answer avoided a distinct merge/inherit state on purpose).

**Write path:** goes through the existing `saveProfileNote`/`writeFrontmatter` seam; the
dashboard `reload()`s after, per `CLAUDE.md`'s write-then-reload rule -- no new caching concern.

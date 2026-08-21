---
id: "04"
title: "How does openConcernBase pick a per-profile Base view?"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# How does openConcernBase pick a per-profile Base view?

## Question

[What does Obsidian's Bases API support for per-open-context filtering?](01-base-api-per-context-filtering.md)
found the mechanism: one `.base` file can hold multiple named views with independent filters,
and this is exactly what `openConcernBase` (`src/dashboard-view.ts:130`) already uses to switch
between concern views via `state.viewName` -- no runtime filter patching needed or supported.

Decide the rollout:

- **View naming convention**: today a concern's view is named after the concern's label (or a
  `concernViewOverrides` override). Per-profile views need a second axis -- does the view name
  become `<concern> - <person>` (e.g. "Liver - Self"), a `concernViewOverrides`-style per-profile
  map, or something else? Must stay legible to a human browsing the `.base` file's view tabs
  directly in Obsidian, not just to the plugin.
- **View authoring**: today concern views are hand-authored in the `.base` file (per `docs/PRD.md`:
  "Concern→Base mapping is convention"). Does adding a profile axis mean the user hand-authors
  `concerns × profiles` views (multiplies today's per-concern authoring burden by profile count),
  or does the plugin need to generate/maintain views programmatically -- and if so, using what
  write path, given ticket 01's finding that `.base` files don't go through `vault/writer.ts`'s
  `processFrontMatter` seam?
- **Missing-view fallback**: `openConcernBase` already returns `false` (degrading to in-plugin
  expand) when the configured `.base` file doesn't exist. Does a missing per-profile view for an
  existing concern get the same degrade, or something else (e.g. fall back to the
  profile-agnostic view if one still exists)?

Invoke `/grilling` and `/domain-modeling` for this session.

## Resolution

**View naming: runtime suffix convention.** `openConcernBase` computes `${viewName} — ${person}`
(e.g. "Vitals — Khoa") by appending the active profile to whatever it already computes today
(the concern's label, or a `concernViewOverrides` entry). No schema or settings change --
`concernViewOverrides` stays exactly as it is (still concern-keyed, still only needed for the
rare label/view-name mismatch). Rejected: a nested `concern -> person -> viewName` override map
-- more schema/UI churn for no forcing case, and against the plugin's existing minimal-settings
bias (an override map only exists today for exceptions, not the common path).

**View authoring: hand-authored in the `.base` file, `concerns × profiles` views.** This isn't
really a choice -- [What does Obsidian's Bases API support for per-open-context filtering?](01-base-api-per-context-filtering.md)
already established there's no plugin write API for `.base` files, so programmatic generation
was never on the table. Authoring burden scales with profile count, same as it already scales
with concern count today.

**Missing-view fallback: same degrade as a missing file (Q2), and it turns out simpler than the
Question assumed.** Live-tested against the real vault (`03 base/_plugin-health.base`, profiles
"Khoa"/"Maru"): created a temporary `.base` file with per-profile-filtered views
(`filters: {and: [person == "Khoa"]}` at the view level, layered on the base-level
`type == "lab-visit"` filter) via `obsidian-cli`, confirmed via screenshot that switching to
`Vitals — Khoa` correctly showed only Khoa's 6 rows. Then switched to a deliberately nonexistent
view name (`Vitals — Nobody`) -- Obsidian's own Bases renderer shows an inline
`View "Vitals — Nobody" not found` message and stays on that (empty) tab; it does **not** silently
fall back to the base's default view or to mixed/wrong data. So `openConcernBase` doesn't need a
pre-check ("does this view exist?") before switching -- it can just switch, and Obsidian's native
not-found state is already a safe degrade (no silent wrong data shown). Whether that raw message
is polished enough to ship as-is, or the plugin should catch it and route to the existing
in-plugin-expand degrade for visual consistency, is a small follow-up call, not a blocker -- noted
in fog rather than blocking this ticket.

**All-profiles combined view: dropped.** Nothing in this map's forcing case (the mixed-Base-view
complaint) asked for a combined view, and re-adding one later is just another hand-authored view
if it turns out to be wanted.

Test artifact (`03 base/_test-profile-view.base`) was created and removed from the real vault
during this session -- not committed anywhere, no lasting vault change beyond confirming the
behavior above.

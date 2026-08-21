---
labels: [ready-for-agent]
tracker: local-markdown
feature: profile-scoped-views-and-targets
---
# Profile-scoped views and targets — spec

## Problem Statement

The plugin tracks multiple profiles (e.g. "Khoa" and "Maru"), but two pieces of vault-wide
state don't know that:

1. Clicking a concern header (e.g. "Vitals") opens a Base view showing every profile's lab
   results mixed together in one table, with no way to see just one profile's numbers.
2. A marker's optimal target (e.g. weight, waist circumference) is one number shared by every
   profile, even though the right target for one person isn't the right target for another —
   it's a personal-goal number, not a clinical reference range (which already varies correctly
   by sex/age).

## Solution

- Concern headers open a **per-profile** Base view: the view name gains a `— <person>` suffix,
  and each such view filters to that profile's rows. Clicking "Vitals" while looking at Khoa's
  data shows only Khoa's rows.
- Profiles can set a **personal target override** (low/high) for any marker. When unset, the
  marker's existing global optimal range is used, so nothing changes for markers nobody has
  customized. The override is edited via a right-click "Edit target…" item on the marker's
  dashboard row, scoped to whichever profile is currently active.

## User Stories

1. As a user with multiple profiles tracked in one vault, I want each profile's Base view kept
   separate, so that I don't have to visually pick one person's rows out of a mixed table.
2. As a user, I want clicking a concern header to respect whichever profile is currently active
   on the dashboard, so that the Base view I land on matches what I was just looking at.
3. As a user who hasn't set up per-profile Base views yet, I want a clear, honest indication
   when a view doesn't exist, rather than silently seeing another profile's data or a confusing
   blank screen.
4. As a user, I want the plugin to keep working with zero setup for concerns I haven't
   per-profile-ized yet, so that adopting this feature is incremental, not all-or-nothing.
5. As a user setting up a new profile, I want to hand-author their per-concern Base views the
   same way I already author concern views today, so that the authoring model stays consistent
   rather than introducing a second mechanism.
6. As a user, I want the existing `concernViewOverrides` setting to keep working exactly as it
   does today for the rare concern/label mismatch, so that this change doesn't disrupt an
   existing customization.
7. As a user who doesn't need per-profile Base views for a given concern, I want no forced
   migration or broken behavior — the profile-agnostic view I'm not using simply isn't opened
   anymore in favor of the profile-suffixed one.
8. As a user tracking my weight against a personal goal, I want to set a target range that's
   different from the marker's generic optimal range, so that the dashboard flags against
   *my* goal, not a one-size-fits-all number.
9. As a user with a spouse profile in the same vault, I want to set a different weight target
   for them than for myself, so that each profile's dashboard reflects their own goal.
10. As a user, I want a profile's target override to apply to any marker that needs it, not just
    weight and waist circumference, so that the mechanism isn't hardcoded to today's two
    forcing-case markers.
11. As a user who hasn't set a personal target for a marker, I want the dashboard to keep using
    that marker's existing global optimal range, so that markers I haven't customized behave
    exactly as they do today.
12. As a user, I want to set only a floor or only a ceiling for a personal target (not
    necessarily both), so that I can express a one-sided goal (e.g. "waist circumference under
    X") without being forced to also pick an upper or lower bound I don't have an opinion on.
13. As a user, I want a partially-set personal target (e.g. only a floor) to not silently borrow
    the marker's global ceiling, so that what I see reflects exactly what I set, not a mix of
    sources I didn't choose.
14. As a user, I want to clear a personal target back to the marker's global default, so that I
    can undo a customization without deleting and recreating the profile note by hand.
15. As a user, I want to set a personal target right from the dashboard row where I already see
    the flagged value, so that I don't have to leave the dashboard or hunt through a settings
    screen to find the right marker.
16. As a user, I want the "Edit target…" option to only appear when I'm looking at a specific
    profile's data, so that I'm never asked to edit a target for an ambiguous "everyone" state.
17. As a user, I want the target-editing form to show me the value that's currently in effect
    (my override, or the global default if I haven't set one), so that I'm editing from a known
    starting point rather than a blank form.
18. As a user, I want my target edits saved reliably through the same mechanism other profile
    edits already use, so that saving a target doesn't behave differently from saving my sex,
    date of birth, or blood type.
19. As a developer maintaining this plugin, I want the target-resolution logic to be a small,
    pure, testable function, so that fallback and partial-override behavior can be verified
    without needing a live Obsidian environment.
20. As a developer maintaining this plugin, I want the per-profile Base-view naming logic to be
    a pure, testable function, so that the naming convention can be verified the same way.

## Implementation Decisions

- **`ProfileNote` gains a `targets` field**: `targets?: Record<string, { low?: number; high?: number }>`,
  keyed by marker id, frontmatter key `targets` (a nested map). No new note type, no new field
  on `MarkerNote`.
- **Fallback semantics**: when `profile.targets[marker.id]` is absent, the marker's existing
  `optimalLow`/`optimalHigh` fields are used. No migration of existing marker notes is needed —
  every marker keeps working exactly as it does today until a profile opts in.
- **Partial-override semantics**: an override is a whole-pair replacement, not a per-side merge.
  If only `low` is set in the override, `high` is simply absent for that profile — it does not
  fall through to the marker's global `optimalHigh`. This matches how the marker-level fields
  already behave (each side independently set or absent).
- **`direction` is unaffected** — it stays a marker-level field (`lower_better`/`higher_better`/
  `within`); no per-profile override. (Out of scope — see below.)
- **New pure resolver**: a `resolveTarget(marker, profile)` function, placed alongside the
  existing `resolve(marker, profile, atDate)` range resolver, returning `{ low?, high? }` per the
  fallback/partial-override rules above.
- **Target consumption**: the per-marker computation that already produces `band` (via
  `resolve()`) also computes the resolved target (via `resolveTarget()`) and carries it on the
  per-marker status info alongside `band`. The status-derivation logic that currently reads a
  marker's `optimalLow`/`optimalHigh` directly is updated to read the resolved target instead;
  the display-conversion logic that currently reads a marker's raw optimal fields for
  unit-toggled display is updated the same way.
- **Target-editing UI**: a marker's dashboard row context menu (which already offers
  Curate/Un-curate) gains an "Edit target…" item, scoped to the dashboard's currently active
  profile. Selecting it opens a small form modal with low/high number fields, prefilled with the
  *effective* value (override if present, else the marker's global default). Saving with both
  fields cleared removes the override entirely (falls back to global); saving with values set
  writes the override. The item is hidden (not disabled) when no profile is active.
- **Write path**: the target-editing save goes through `ProfileInput`/`saveProfileNote` (the
  same function that already writes sex/dob/bloodType/allergies), which goes through
  `vault/writer.ts`'s existing `writeFrontmatter()` seam. No new write path.
- **Concern-header Base view naming**: the view name a concern header switches to gains a
  profile suffix — `${viewName} — ${person}`, where `viewName` is exactly what's computed today
  (a `concernViewOverrides` entry, or the concern's label as fallback). `concernViewOverrides`'s
  schema and behavior are unchanged; it still only exists for the rare label/view-name mismatch,
  now composed with the person suffix rather than being made person-aware itself.
- **Per-profile Base-view authoring**: hand-authored in the `.base` file, same as concern views
  are today — there is no plugin write API for `.base` files (confirmed: `.base` files are
  whole-file YAML, not note frontmatter, so they don't go through `processFrontMatter`/
  `vault/writer.ts`, and no dedicated Bases read/write API exists). Each per-profile view adds a
  view-level filter (e.g. `person == "<profile>"`) layered on top of the base-level filter —
  confirmed live against the real vault: a view named `Vitals — Khoa` with that filter correctly
  showed only that profile's rows.
- **Missing per-profile view**: no plugin-side existence check before switching. Obsidian's own
  Bases renderer already shows an inline `View "X" not found` message and does not silently fall
  back to mixed data or another view — confirmed live. This is treated as an acceptable degrade
  as-is; no additional plugin-side handling is required for this spec (see Out of Scope for the
  possible future polish).
- **No all-profiles combined Base view** — dropped. Every concern-header click now opens a
  profile-suffixed view; there's no "everyone together" option shipped by this spec.

## Testing Decisions

Good tests here exercise external behavior of pure functions — inputs to outputs — not
Obsidian-coupled DOM or API calls, matching this repo's existing split between tested pure
`core/*.ts` logic and untested Obsidian-adapter files.

- **`resolveTarget(marker, profile)`**: new unit tests alongside `resolve()`'s existing suite.
  Cases: no profile override and no marker global (both undefined); no profile override, marker
  global present (falls back to global); profile override present for both bounds (override
  wins outright); profile override sets only one bound (the other is absent, not inherited from
  the marker's global value).
- **Status-derivation and display-conversion logic** (the functions that already have tests
  covering `optimalLow`/`optimalHigh` handling): extend the existing test suites with cases where
  the resolved target differs from the marker's global value, to confirm the profile-specific
  value — not the marker's global one — drives status/display once an override exists.
- **`saveProfileNote`/`ProfileInput`**: extend the existing suite (the `fake-app.ts` in-memory
  `App` fixture) with a case that writes a `targets` entry, and a case that removes one (the
  frontmatter key ends up absent, matching the existing "removes a field that's now blank" test
  already in that suite for other profile fields).
- **Per-profile Base-view naming**: the naming function is a plain string computation
  (`viewName`, `person` in; suffixed name out) and gets its own direct unit tests — label-only
  case, `concernViewOverrides`-present case, both with the person suffix appended.
- **Not unit tested** (Obsidian-coupled, consistent with `openConcernBase` having zero existing
  coverage today): the context-menu item itself, the new form modal, and the actual
  `leaf.setViewState` view-switch call. Verify these live/manually — the same method already used
  during spec development to confirm the Base-view filtering and missing-view-degrade behavior
  against the real vault.

## Out of Scope

- **Per-profile `direction` override** — a real case (e.g. one profile bulking, another cutting
  the same marker) is plausible but hasn't been hit yet. `direction` stays marker-level.
- **Migrating existing marker notes' `optimalLow`/`optimalHigh` values** — not needed; they
  remain the fallback for any profile without an override.
- **Polishing the missing-view experience** — whether Obsidian's raw `View "X" not found` message
  is fine to ship as-is, or the plugin should catch it and route to the existing in-plugin-expand
  degrade for visual consistency with the rest of the plugin, is left for a future pass.
- **Plugin-side generation or maintenance of `.base` view files** — no supported API exists,
  confirmed; views stay hand-authored, same as today.
- **An all-profiles combined Base view** — deliberately dropped; can be re-added later as just
  another hand-authored view if wanted.
- **Any change to `ranges[].sex`/`ranges[].age` clinical reference bands** — untouched; this spec
  only adds a second, independent personal-goal axis (`optimalLow`/`optimalHigh` and its
  per-profile override), not a change to how clinical ranges resolve.
- **Pediatric/age-banded personal targets** — not addressed; out of scope for the same reason
  clinical age-banding for children was deferred in the original PRD (no children tracked yet).

## Further Notes

This spec collapses the **Profile-scoped views and targets — design spec** wayfinder map
(`.scratch/profile-scoped-views-and-targets/MAP.md`) and its four closed decision tickets. See
that map for full rationale, rejected alternatives, and the live-verification detail (a real
per-profile Base view was created against the actual vault during wayfinding, confirmed to
filter correctly, then removed — no lasting vault change). Ticket 01's primary-source research
on the Bases API lives on the throwaway branch `research/base-api-per-context-filtering`.

Two small items were deliberately parked rather than decided (see Out of Scope): a per-profile
`direction` override, and polish for the missing-view message. Neither blocks this spec; both
can become their own future ticket if a real case shows up.

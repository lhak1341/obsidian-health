---
id: "06"
title: "Personal marker targets resolve into dashboard status and display"
type: wayfinder:task
mode: AFK
status: open
labels: [ready-for-agent]
assignee:
blocked-by: []
---
# Personal marker targets resolve into dashboard status and display

## What to build

A profile can carry a personal target override (low/high) for any marker, and the dashboard
uses it — falling back to the marker's existing global optimal range when a profile has no
override for that marker. This ticket delivers the data model and its consumption; there's no
editing UI yet (that's a separate ticket) — verify by hand-editing a profile note's frontmatter,
the same way `ranges[]` is edited today with no dedicated UI.

The override is a whole-pair replacement, not a per-side merge: setting only one bound leaves
the other bound absent for that profile, rather than inheriting the marker's global value for
the missing side. `direction` is unaffected and stays a marker-level property.

Full decision detail and rationale: [Where does a per-profile marker target override live?](02-target-override-data-model.md)
and the spec (`../SPEC.md`, the `ProfileNote.targets` / fallback / partial-override / target
consumption implementation decisions).

## Acceptance criteria

- [ ] A profile note can carry a marker-id-keyed map of `{ low?, high? }` overrides.
- [ ] A new pure resolver function takes a marker and a profile and returns the effective
      target, unit-tested directly alongside the existing range-resolution tests: no override and
      no marker global (both undefined); no override, marker global present (falls back to
      global); override present for both bounds; override sets only one bound (the other stays
      absent, not inherited from the marker's global value).
- [ ] The dashboard's status derivation (the logic that already flags a value against a marker's
      optimal range) uses the resolved target instead of reading the marker's global fields
      directly — existing tests for this logic are extended with cases where the resolved target
      differs from the marker's global value.
- [ ] The unit-toggle display logic that already reads a marker's optimal fields for conversion
      is updated the same way, with equivalent test coverage.
- [ ] Hand-editing a profile note's frontmatter to add a `targets` entry for a marker, then
      viewing that profile's dashboard, shows the marker flagged against the personal target
      rather than the marker's global optimal range.
- [ ] A profile with no `targets` entry for a marker (or no `targets` at all) sees that marker
      behave exactly as it does today.

## Blocked by

None — can start immediately.

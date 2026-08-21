---
id: "06"
title: "Personal marker targets resolve into dashboard status and display"
type: wayfinder:task
mode: AFK
status: closed
labels: [ready-for-agent]
assignee: lhak
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

- [x] A profile note can carry a marker-id-keyed map of `{ low?, high? }` overrides.
- [x] A new pure resolver function takes a marker and a profile and returns the effective
      target, unit-tested directly alongside the existing range-resolution tests: no override and
      no marker global (both undefined); no override, marker global present (falls back to
      global); override present for both bounds; override sets only one bound (the other stays
      absent, not inherited from the marker's global value).
- [x] The dashboard's status derivation (the logic that already flags a value against a marker's
      optimal range) uses the resolved target instead of reading the marker's global fields
      directly — existing tests for this logic are extended with cases where the resolved target
      differs from the marker's global value.
- [x] The unit-toggle display logic that already reads a marker's optimal fields for conversion
      is updated the same way, with equivalent test coverage.
- [x] Hand-editing a profile note's frontmatter to add a `targets` entry for a marker, then
      viewing that profile's dashboard, shows the marker flagged against the personal target
      rather than the marker's global optimal range.
- [x] A profile with no `targets` entry for a marker (or no `targets` at all) sees that marker
      behave exactly as it does today.

## Blocked by

None — can start immediately.

## Resolution

`ProfileNote` gained `targets?: Record<markerId, { low?: number; high?: number }>` (`core/types.ts`),
parsed from a `targets` frontmatter map by `parseTargets` in `vault/reader.ts`. A new pure
`resolveTarget(marker, profile)` (`core/dashboard.ts`, beside `resolve()`) returns the profile's
override for that marker id if one exists (whole-pair replacement -- a partial override does not
inherit the missing side from the marker's global value), else falls back to the marker's
`optimalLow`/`optimalHigh`.

`computeDashboardModel` now resolves the target once per marker and carries it on
`MarkerStatusInfo.target`; `deriveStatus` and `toDisplay` (unit-toggle conversion) both read the
resolved target instead of `marker.optimalLow`/`optimalHigh` directly.

Verified end-to-end against the real vault: added `targets: { waist_circumference: { high: 95 } }`
to Khoa's profile note, reloaded the plugin, opened the dashboard -- Waist Circumference (latest
88cm, global `optimal_high: 85`, normally "watch"/orange) rendered green ("good") under the
relaxed personal target. Removed the override and reloaded -- back to orange/"watch". Vault
restored to its original state (confirmed byte-identical before/after); no lasting change.

Typecheck, the new/updated unit tests, and the full suite (220 tests, up from 210) all pass.

Code review caught a real bug in `formatTargetText` (`render/format.ts`): it derived the ≤/≥
direction from the marker's raw global `optimalHigh`/`optimalLow` instead of the resolved
per-profile target it was given, so a partial override on the opposite side from the marker's
global bound would render the wrong direction. Fixed by changing `DisplayReading.target` from a
flattened number to the full `ResolvedRange` (converted on both sides in `toDisplay`, same as
`band`), and `formatTargetText` now derives direction from the presence of `target.low`/`.high`
directly, with no marker parameter at all. Live-verified: a low-only override on
`waist_circumference` (`{ low: 60 }`, global `optimal_high: 85`) now correctly renders "your
target ≥ 60" instead of the pre-fix "≤ 60".

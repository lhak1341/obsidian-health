---
id: "02"
title: "Where does a per-profile marker target override live?"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Where does a per-profile marker target override live?

## Question

`MarkerNote.optimalLow`/`optimalHigh` (`src/core/types.ts:31-32`) are defined once per marker,
shared by every profile. Concrete case forcing this: weight and waist circumference need
different optimal targets per profile (anthropometric/personal-goal-driven -- distinct from
`ranges[].sex`/`ranges[].age`, which already handle the clinical sex/age-banded case and stay
out of scope here).

Decide the data-model shape for a profile-level override:

- Where does the override live -- a new field on `ProfileNote` keyed by marker id, a new
  per-profile-per-marker note type, or something else? Weigh against the existing write seam
  (`vault/writer.ts`) and the "3 places a new marker needs wiring" pattern from `CLAUDE.md`.
  Design for any marker needing this, not just weight/waist circumference -- other markers will
  likely need the same override later.
- Fallback semantics: when no profile-level override exists, does it fall back to the marker's
  global `optimalLow`/`optimalHigh`, or is a global value no longer meaningful once the
  per-profile shape lands?
- Does `direction` (`lower_better`/`higher_better`/`within`) ever need to vary per profile too,
  or is direction always a property of the marker itself regardless of whose target it is?
- Sketch (don't build) how `computeDashboardModel` and the visit editor's `buildFields` would
  read the new shape, so the migration/consumption fog items on the map can be scoped correctly
  next.

Invoke `/grilling` and `/domain-modeling` for this session.

## Resolution

**Storage: `ProfileNote.targets: Record<markerId, {low?: number; high?: number}>`.** New field
on the profile note (frontmatter key `targets`, nested map). Onboarding a profile (e.g. a
spouse) means filling in one file rather than touching every marker note that should vary for
them; marker notes stay untouched, so no new "4th wiring place" is added to the existing
marker/visit/`Health.base` trio. Goes through the existing `saveProfileNote`/`writeFrontmatter`
seam — no new write path needed.

Rejected alternatives: `MarkerNote.targets: {person, low?, high?}[]` (mirrors `ranges[]`'s
shape exactly, symmetric with `resolve()`, but every profile wanting a custom target means
editing that marker's note, and a new profile means touching every marker note that should vary
for them); a new per-profile-per-marker note type like `PlanNote` (cleanest separation, but a 4th
note kind to author/maintain for what's currently two numeric fields).

**Fallback: yes, falls back to the marker's global `optimalLow`/`optimalHigh` when a profile has
no entry for that marker.** Every existing marker keeps working with zero authoring; overrides
are opt-in per profile. This also means **no migration is needed** for existing marker notes —
resolves that fog item outright.

**Partial override: whole-pair replacement, not per-side merge.** If a profile's entry sets only
`low`, `high` is simply unset for that profile — it does not fall through to the marker's global
`optimalHigh`. Matches how the marker-level fields already behave (each side independently set
or absent, no cross-referencing) and avoids mixed-source footguns when reading a profile note in
isolation.

**Direction: stays marker-level, no per-profile override.** A real case (opposite-direction
personal goals, e.g. bulking vs cutting weight) is plausible but hasn't been hit yet — parked in
the map's fog rather than built now.

**Consumption sketch** (resolves that fog item too):

```ts
function resolveTarget(marker: MarkerNote, profile: ProfileNote): { low?: number; high?: number } {
	const override = profile.targets?.[marker.id];
	return override ?? { low: marker.optimalLow, high: marker.optimalHigh };
}
```

- `deriveStatus` (`dashboard.ts:161`) takes a resolved `{low?, high?}` param instead of reading
  `marker.optimalHigh`/`optimalLow` directly — computed once in `computeDashboardModel`'s
  per-marker loop, same place `band = resolve(...)` already happens, threaded through the same
  way `band` is.
- `toDisplay`'s `rawTarget = marker.optimalHigh ?? marker.optimalLow` (`dashboard.ts:248`) reads
  the resolved target off `MarkerStatusInfo` (which gains a `target: {low?, high?}` field)
  instead of `info.marker` directly.
- Visit editor's `buildFields` doesn't read `optimalLow`/`optimalHigh` today — Thread B doesn't
  touch it.

**Spun off:** [Where does a profile edit their marker target overrides?](03-target-editing-ui.md)

# Don't build a combined "resolve profile and compute model" entry point

An architecture review (`/improve-codebase-architecture`) proposed one core function taking the
snapshot, settings, an optional requested person and a marker filter, and returning `no-profile` /
`empty` / `ready` with the profile, model, last visit date and profile list, to replace the
"resolve profile, then compute model" sequence in `dashboard-view.ts`, `main.ts`, `bases-view.ts`
and `planner-view.ts`.

Rejected after grilling: the callers differ in ways that would all have to come through its
interface. The Bases view filters markers to its query before building the model, the empty-state
wording differs per surface, and only the widget has a "no visits recorded" state. The interface
would be about as large as the three lines it replaces (shallow), and `resolveDefaultProfile`
already owns the one rule worth sharing.

Done instead: `resolveDefaultProfile` takes an optional requested person (replacing the
hand-written fallback in `HealthView.repaint` and `openVisitEditor`), and `visitDatesFor`
replaces the two last-visit derivations. `scanVault()` and empty-state text stay with the adapters.

Revisit if a fourth caller needs the same profile + model + empty-state sequence unchanged.

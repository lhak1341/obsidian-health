# Defer giving DashboardViewState a typed set/notify interface

`DashboardViewState` (`render/dashboard-view.ts`) is 4 flat fields: `showAll`, `unitToggles`,
`openMarkerId`, `activePerson`. An architecture review flagged it as a shallow interface: 3 of the
4 fields mutate and then call `onViewStateChange()` to trigger a repaint (`showAll`, `unitToggles`,
`activePerson`), while `openMarkerId` mutates and self-handles via a CSS class toggle on
already-built DOM, no repaint needed. Nothing in the type signals which behavior a given field
needs -- that's decided by the call site, by hand, each time a field is read or written. The
review's proposed fix: a small state object with an explicit `set(key, value, { repaint })` method,
or two typed buckets (repainting fields vs. self-handled fields), so a new field can't silently
pick the wrong one.

Decided not to act on it yet. The review's own deletion test cuts against it: if `DashboardViewState`
were deleted and its fields inlined as loose closures, nothing would get harder -- meaning the
interface isn't protecting an invariant today, just naming a pattern that could be gotten wrong.
No third toggle-like field is currently planned; `unitToggles` (added this session) is only the
second field to need the repaint-vs-self-handle judgment call, not yet a repeated source of bugs.
Matches the project's general stance against designing for hypothetical future requirements.

Recorded so a future architecture review doesn't re-flag `DashboardViewState` from scratch. If a
third field needing this same repaint-vs-self-handle decision shows up, that's the trigger to revisit
this -- at that point it's an established pattern, not a hypothetical one.

# Defer grouping DashboardRenderOptions' row-scoped callbacks

`DashboardRenderOptions` (`render/dashboard-view.ts`) has grown to 11 flat fields (`onAddVisit`,
`onEditVisit`, `onOpenPlanner`, `onOpenConcern`, `onToggleCurated`, `profiles`, `profile`,
`lastVisitDate`, `concernIcons`, `viewState`, `onViewStateChange`), with the last three feature
commits (`668b6c1`, `47f9c31`, `cd1c05c`) each landing as one more flat field. An architecture
review flagged this as the same growth shape ADR 0002 already named for `DashboardViewState` in
this same file: no field currently protects an invariant a caller could get wrong by hand, but a
pattern is visibly repeating -- specifically, `onToggleCurated` (a row-scoped action, right-click
to flip curated status) and the unit-toggle handling reached via `viewState` are both "per-row
interaction" callbacks sitting flat in the same options bag as page-level callbacks like
`onOpenPlanner`. The review's proposed fix: group row-scoped callbacks behind one `RowActions`
sub-object so a new per-row action can't silently flatten into the same bag as everything else.

Decided not to act on it yet, for the same reason ADR 0002 gave: the deletion test doesn't support
it. Every field is genuinely consumed by exactly the call sites that need it; deleting
`DashboardRenderOptions` and inlining its fields as loose parameters wouldn't concentrate
complexity anywhere, it would just remove one layer of naming. Grouping now would be designing
for a feature that hasn't arrived -- against this project's general stance (see CLAUDE.md) against
speculative abstraction.

Recorded so a future architecture review doesn't re-flag this interface's field count from
scratch. Trigger to revisit: a 4th callback arrives that shares `onToggleCurated`'s row-scoped
shape (fired from a marker row, not a page-level control) -- at that point grouping stops being
hypothetical and starts being an actual repeated pattern, same threshold ADR 0002 set for
`DashboardViewState`.

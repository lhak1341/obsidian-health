---
id: "07"
title: "Edit a profile's marker target from the dashboard"
type: wayfinder:task
mode: AFK
status: open
labels: [ready-for-agent]
assignee:
blocked-by: ["06"]
---
# Edit a profile's marker target from the dashboard

## What to build

A user can set or clear a personal marker target directly from the dashboard, without
hand-editing frontmatter. A marker row's existing context menu (which already offers
Curate/Un-curate) gains an "Edit target…" item, scoped to whichever profile is currently active
on the dashboard. Selecting it opens a small form with low/high number fields, prefilled with
the effective value (the profile's override if one exists, else the marker's global default).
Saving with both fields cleared removes the override (falls back to the marker's global value,
same as never having set one); saving with values set writes the override.

The item is hidden entirely — not shown disabled — when no profile is active, since there's
nothing coherent to edit in that state.

Depends on [Personal marker targets resolve into dashboard status and display](06-personal-target-resolution.md)
being done first: this ticket only adds the write path and UI on top of the resolver/consumption
that ticket delivers, so it needs that mechanism already working to be demoable.

Full decision detail and rationale: [Where does a profile edit their marker target overrides?](03-target-editing-ui.md)
and the spec (`../SPEC.md`, "Target-editing UI" / "Write path" implementation decisions).

## Acceptance criteria

- [ ] Right-clicking a marker row while a profile is active shows an "Edit target…" item
      alongside the existing Curate/Un-curate item.
- [ ] The item is absent (not present, not disabled) when no profile is active.
- [ ] Selecting it opens a form with low/high fields prefilled with the currently effective
      value for that marker and profile.
- [ ] Saving with values in both fields writes a `targets` override for that marker on the
      active profile, through the same write path other profile-field edits already use.
- [ ] Saving with both fields cleared removes the override for that marker, and the dashboard
      reflects the marker's global default afterward.
- [ ] The write path is covered by unit tests extending the existing profile-note-save test
      suite, with a case that adds a target override and a case that removes one.
- [ ] The context menu item and the modal itself are verified live/manually (not unit tested,
      consistent with this repo's existing untested Obsidian-adapter code).

## Blocked by

- [Personal marker targets resolve into dashboard status and display](06-personal-target-resolution.md)

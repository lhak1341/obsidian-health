---
id: "14"
title: "Assemble the PRD — the handoff spec"
type: wayfinder:task
mode: HITL
status: closed
assignee: lhak
blocked-by: ["15"]
---
# Assemble the PRD — the handoff spec

## Question

This is the map's **destination**: a single PRD / design spec ready to hand to a build effort. Every design
decision has landed (tickets 01–13 closed); this ticket **compiles** them into one coherent document — it
decides nothing new, only structures and sizes what's decided. If assembling surfaces a genuine gap, spin a
fresh decision ticket rather than deciding it inline.

Pull together, each section citing its source ticket + asset:

- **Vision & scope** — flat-editorial one-screen dashboard, flagged-markers-hero (04); scope = labs + vitals,
  imaging/pediatric/future-numeric out (07, 10).
- **Data model** — three note kinds, notes canonical + registered Bases view; `health/labs/<person>/<date>.md`,
  `markers/<id>.md`, `profiles/<person>.md` (02, refined by 13); range resolver keys off profile sex/age.
- **Flagging & arrows** — derived-on-read rules: arrow (±3% deadband), status precedence, attention rank (11).
- **Look & feel** — layout, auto-balancing columns, hand-rolled SVG charts, status palette, theming (05);
  assets `look-dialed.html`, `vision-mockup.html`.
- **Data entry** — "Add lab visit" modal, unit-convert-at-entry, validation tiers, inline add-marker,
  person selector (06 + 13).
- **Widget** — two-tier (Chip/List) lhak-dashboard panel, `mountHealthWidget` integration, pinned to self
  (08 + 13); asset `widget-mockup.html`.
- **Settings** — `saveData` schema, notes-own-meaning boundary, concern→Base convention, profile management
  (09 + 13).
- **Multi-profile** — folder-per-person, single-active switcher, per-person entry/resolution (13).
- **Migration (done)** — historical snapshots already migrated + verified (12); note the hand-refinements left
  (concern buckets, blurbs, alt_factor, optimal_*).
- **Prior art / integration** — how the vault feeds the plugin, Bases API, widget→dashboard handshake (01).

Decide only **document-shape** questions: section order, level of detail, what's normative vs informative,
where assets are linked. Output: `docs/PRD.md` (or agreed location), the deliverable this whole map was for.

## Resolution

Assembled via the user's **`/to-spec`** command (the canonical spec format — `to-spec` is
`disable-model-invocation`, so it's user-invoked, not something the agent runs headless). Per its process:
repo confirmed **greenfield** (no `src`/manifest/git — build not started; prior art = sibling lhak plugins);
**one test seam** agreed with the user — a pure domain core `computeDashboardModel(markers, visits, profile,
settings) → DashboardModel` with unit-conversion + range-resolution as pure fns inside, Obsidian adapters
(vault scan, ItemView, Bases view, entry modal, `mountHealthWidget`) thin and untested.

**Deliverable: `docs/PRD.md`**, written in the to-spec template (Problem Statement · Solution · 42 User Stories ·
Implementation Decisions · Testing Decisions · Out of Scope · Further Notes), **labelled `ready-for-agent`**,
compiling all 14 closed decisions (tickets 01–13, 15). The earlier freeform `docs/PRD.md` was overwritten by
this canonical version.

**Map complete** — nothing left to decide; the spec is ready for a build effort.

# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`. This convention was
established organically by the `.scratch/health-dashboard/` map (which produced this plugin's
original PRD) before this file existed — this doc formalizes what's already in use, not a fresh
template.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The map/spec is `.scratch/<feature-slug>/MAP.md` (uppercase)
- Tickets are one file per ticket at `.scratch/<feature-slug>/tickets/<NN>-<slug>.md`, numbered
  from `01`
- Supporting assets live alongside: `.scratch/<feature-slug>/research/<NN>-<slug>.md` (research
  findings), `.scratch/<feature-slug>/prototypes/<slug>.html` (prototype artifacts) — linked from
  their ticket and from the map's Decisions-so-far entry via an `Asset:` line
- Both `MAP.md` and each ticket file open with a YAML frontmatter block

### Map frontmatter

```yaml
---
labels: [wayfinder:map]
tracker: local-markdown
feature: <feature-slug>
---
```

### Ticket frontmatter

```yaml
---
id: "<NN>"
title: "<ticket title>"
type: wayfinder:<research|prototype|grilling|task>
mode: <HITL|AFK>
status: <open|claimed|closed>
assignee: <username, once claimed>
blocked-by: [<NN>, <NN>]
---
```

- `status` values: `open` (unclaimed) → `claimed` (assigned, in progress) → `closed` (resolved)
- `blocked-by` lists ticket ids; a ticket is unblocked when every id it lists is `closed`
- The body's resolution heading is `## Resolution`, not `## Answer` — append it on close
- A resolution that spins off further work ends with a `**Spun off:**` line linking the new
  ticket(s), rather than opening them silently

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed), following
the frontmatter shapes above.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number
directly.

## Wayfinding operations

Used by `/wayfinder`.

- **Map**: `.scratch/<feature>/MAP.md`.
- **Child ticket**: `.scratch/<feature>/tickets/NN-<slug>.md`.
- **Blocking**: the `blocked-by` frontmatter array. A ticket is unblocked when every id it lists
  is `closed`.
- **Frontier**: scan `.scratch/<feature>/tickets/` for files with `status: open` and no
  unclosed `blocked-by` entries; first by number wins.
- **Claim**: set `status: claimed` and `assignee`, save before any work.
- **Resolve**: append the answer under a `## Resolution` heading, set `status: closed`, then
  append a context pointer (gist + link, plus an `Asset:` line if a research/prototype file was
  produced) to the map's Decisions-so-far in `MAP.md`.

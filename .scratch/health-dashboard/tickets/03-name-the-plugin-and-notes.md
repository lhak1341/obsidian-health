---
id: "03"
title: "Name the plugin and the note structure"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Name the plugin and the note structure

## Question

The user explicitly asked "what should it be named?" Decide the names this effort will use:

- **The plugin / dashboard** — repo is `obsidian-health`; is that the plugin name, or does the
  user-facing dashboard get a distinct name? (candidates to react to: "Health", "Vitals", "Labs",
  "Bloodwork", "Health Dashboard", "Checkup").
- **The note structure** — what the per-year notes / folder are called (e.g. `Health/2025.md`,
  `Labs/2025 checkup.md`), and whether "Laboratory test" survives as an index/legacy note.

Small, independent decision — takeable now, doesn't block on the data model. Use `/grilling`.

## Resolution

- **Plugin display name:** "Health". **Manifest `id`: `health`** → installs at
  `.obsidian/plugins/health/` in the user's vault
  (`…/lhakZettel/.obsidian/plugins/health/`). Repo/GitHub slug stays `obsidian-health`.
- **View title:** "Health Dashboard".
- **Note structure:** already settled by [Decide the data model and source of truth](02-data-model-source-of-truth.md) —
  `health/labs/<date>.md` (one per visit) + `markers/<id>.md` + `profiles/<person>.md`. This ticket adds
  no new folder decision.
- **`Laboratory test.md`:** **retired** after migration — deleted, not kept as a legacy/index note.
  Notes + registered Bases view are the single source of truth (per ticket 02); keep a one-time backup
  during migration, then delete. Avoids dual source-of-truth drift.

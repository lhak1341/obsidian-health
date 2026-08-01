---
id: "15"
title: "Design the add-test / package planner"
type: wayfinder:prototype
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Design the add-test / package planner

## Question

The last undesigned in-scope area (source idea: "Plan next year's tests — track the optional-test backlog with
cost + priority"). The kept `Laboratory test.md` already holds the **raw material** — "What to look for in
future test" (ApoB, HbA1c, Homocysteine, TSH… with costs + URLs) and the yearly "Health check package analysis"
(priority tiers, rationale, "absolute minimum"). Design how this becomes structured + surfaced:

- **Schema** — a new note kind (`plans/<year>.md`? `candidates/<id>.md`?) vs frontmatter on markers. Fields:
  candidate test, cost, priority tier, rationale, source URL, year planned, status (backlog/ordered/done). Stay
  consistent with the "new metric = new note, no schema change" principle (02).
- **Link to markers** — a planned test that becomes a real marker (e.g. HbA1c ordered next year) — how the
  candidate graduates into a `markers/<id>.md` + shows up in entry.
- **Surface** — where the backlog + yearly recommendation live in the UI (a dashboard section? a separate
  view/command? out of the main flagged-hero screen?). Reconciles with the look (05) and vision (04).
- **Recommendation writeups** — the prose "package analysis" per year: stored where, rendered how (or just a
  free note the plugin links to, not structured).

Use `/grilling` + `/prototype` if a surface mockup helps. Output: the planner schema + UX, referenced by the
PRD. **In scope** (destination covers the optional-test backlog); pediatric/imaging remain out (07, 10).

## Resolution

**Candidate = a marker note with `status: candidate`** — no new note kind. A candidate is a *future numeric
marker* (ApoB, HbA1c, Homocysteine, TSH…); it reuses all the marker machinery (unit, ranges, concern, tooltip).
Extra planner fields on the note:
```yaml
status: candidate
cost: 75000            # VND (as recorded in source); currency noted, not modelled
priority: essential    # essential | lifestyle | secondary  (the source's tiers)
source_url: https://diag.vn/product/apob-5/
year_planned: 2025     # optional
```
Fits "new metric = new note, no schema change" (02). **Procedures (colonoscopy) + imaging stay out of scope**
(07) — backlog is optional *lab tests* only.

**Graduation = auto, data presence wins.** The backlog = candidate markers with **zero readings**. The moment a
visit note carries the marker's key (you ordered it, entered the value in the existing modal), it graduates onto
the dashboard with **no manual step** — `status: candidate` is just a backlog-membership hint; data overrides it.
Planner fields stay on the note as history.

**Surface = a separate Planner view**, off a top-bar link / command — *not* on the daily flagged-hero screen
(touched ~once a year). Its backlog table is a **Base** over candidate markers (`status: candidate`, no readings),
**sorted priority then cost**, showing cost + source link. Reuses the established flat-editorial look (05) — no
fresh mockup (the decisions were structural, not visual).

**Yearly package analysis = a free prose note**, `plans/<year>.md` (e.g. `health/plans/2025.md`), linked/embedded
from the Planner surface. Narrative by nature (executive summary, tiered recommendations, skip list, "absolute
minimum") — structuring it would fight it. May wikilink the candidate markers it recommends. **Build step:** the
existing "What to look for" + "Health check package analysis" prose moves out of `Laboratory test.md` into the
candidate marker notes (the backlog items) + `plans/2025.md` — completing that note's retirement (its last unique
content). Left as a documented build step, not executed here.

**Amendments:** data model (02) gains the optional `status`/`cost`/`priority`/`source_url`/`year_planned` marker
fields + the `plans/<year>.md` prose-note kind; the plugin registers a Planner view + candidate Base.

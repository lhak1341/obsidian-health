---
id: "10"
title: "Decide family profiles — in scope now, or v2"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Decide family profiles — in scope now, or v2

## Question

The vision surfaced a wish to track spouse and children alongside the user (profile switcher in the mock).
This is a scope call with a real cost, so decide it explicitly before the data model locks:

- **In scope now** — the data model keys everything by person from day one; the dashboard is multi-profile.
- **v2 / later** — ship single-profile (self) first; design the model so a person dimension can be added
  without redesign, but don't build the multi-profile UI/data yet.

The load-bearing complication either way: **children need age-specific pediatric reference ranges** (a normal
hemoglobin for a 5-year-old ≠ an adult's), and ranges shift as a child ages. That means reference ranges must
be resolvable per person by **sex and age-at-visit**, not a single global range — a significant data-model
requirement (feeds ticket 02). Decide whether to take that on now.

Use `/grilling`. Whatever is deferred lands in the map's Out of scope with a pointer here.

## Resolution

**Multi-profile is in scope now — for adults only.** User intends to track a **spouse** in the near future
(no children yet). A spouse is another adult → needs only sex-specific ranges, which the data model (ticket 02)
already carries; the person dimension + `profiles/<person>.md` are already in the model, so nothing structural
is added.

**In scope (this PRD):** multi-profile for adults — `profiles/self.md` + `profiles/spouse.md`, a **profile
switcher** on the top bar (already in vision 04), per-person data entry (the modal picks whose visit it is),
and per-person flagging / widget / dashboard filtering by active profile. The *how* of this surface is spun
into its own ticket (see below) — this ticket only settled the **scope call**.

**Deferred to v2 → Out of scope:** **pediatric age-banded reference-range authoring** and any child-specific
UI. The model already supports age-banding (ticket 02), so adding a child later is a data-authoring + minor-UI
increment, not a redesign. Revisited only when a child actually needs tracking.

**Spun off:** [Design the multi-profile experience — switcher, per-person entry, filtering](13-multi-profile-experience.md).

---
id: "13"
title: "Design the multi-profile experience — switcher, per-person entry, filtering"
type: wayfinder:prototype
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Design the multi-profile experience — switcher, per-person entry, filtering

## Question

Multi-profile (adults) is in scope per [Decide family profiles](10-family-profiles-scope.md) — self + spouse,
model already person-keyed (ticket 02). Design how the multi-profile *surface* behaves. Prereqs all closed
(vision 04, data model 02, entry 06, widget 08, settings 09) — this refines them for the person dimension:

- **Profile switcher** — where it sits (vision 04 put it on the one-line top bar), how it looks, self vs
  spouse toggle; is the dashboard ever "all people at once" or always exactly one active profile?
- **Per-person entry** — the "Add lab visit" modal (ticket 06) gains a **person selector**; a visit note is
  written per person. Where does the person live — folder (`health/labs/<person>/<date>.md`) or a `person:`
  frontmatter key on a flat folder? (Reconciles with ticket 02's `health/labs/<date>.md` grain.)
- **Per-person flagging / widget** — does the lhak-dashboard widget (ticket 08) show the active profile only,
  an aggregate ("2 flagged across 2 people"), or is it pinned to self? Does switching profile in the full view
  change what the widget shows?
- **Adding / managing a profile** — how a new `profiles/<person>.md` is created (settings tab? a command?
  hand-authored?), and what static facts it captures (sex, dob, blood type, allergies).
- **Range resolution per person** — confirm the range resolver keys off the active profile's sex (+ age when
  pediatric arrives), consistent with the two-tier model.

Use `/prototype` (switcher is visual) + `/grilling`. Output: the multi-profile UX + any amendments to the
entry/widget/settings specs, referenced by the PRD. **Pediatric ranges are out of scope** (ticket 10).

## Resolution

**Person in the path — folder per person.** `health/labs/<person>/<date>.md`
(`self/2025-07-23.md`, `spouse/2025-07-23.md`). Zero same-date collision, clean to browse; `person:` key +
Bases filter stay authoritative (filename cosmetic per ticket 02). **Executed:** the 5 migrated notes moved
into `health/labs/self/` — confirmed all 5 still resolve as `type: lab-visit` in Obsidian's cache. Migration
generator updated to write `self/`.

**One active profile, always.** The switcher picks whose dashboard you see; flags/charts/curated set are that
person's. No merged all-people view (it would double marker rows and muddy per-person attention). `defaultProfile`
(settings, ticket 09) loads on open; the switcher flips the session-active profile.

**Widget pinned to self.** The lhak-dashboard widget (ticket 08) always shows **self's** flags — no aggregate,
no person tags. Spouse is seen via the full view's switcher. **Ticket 08's widget spec is unchanged.**

**Profile management in the settings tab.** The settings tab (ticket 09) lists profiles with an add/edit form
(id, sex, dob, blood type, allergies) that writes `profiles/<person>.md`. A form (not hand-authoring) guards
`sex`/`dob` — load-bearing for range resolution. Lives beside `defaultProfile`.

**Per-person entry.** The "Add lab visit" modal (ticket 06) gains a **person selector** (defaults to active
profile); the visit note is written into that person's folder (`health/labs/<person>/`).

**Range resolution.** Keys off the **active profile's `sex`** to pick the `ranges` band (migrated markers
already carry `m`/`f`). Age-at-visit banding stays wired in the model, unused until pediatric (out of scope,
ticket 10). `dob` optional for adults today.

**Switcher visual:** reuse the top-bar switcher already drawn in the [vision mockup](../prototypes/vision-mockup.html)
(ticket 04) — no fresh prototype; this ticket's decisions were structural, not visual.

**Amendments to earlier specs:** entry (06) → person selector + write to `<person>/` folder; settings (09) →
profile add/edit management; widget (08) → **unchanged** (pinned self); data model (02) → visit path is
`health/labs/<person>/<date>.md` (refines the flat `health/labs/<date>.md`).

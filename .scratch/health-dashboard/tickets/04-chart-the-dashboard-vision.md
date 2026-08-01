---
id: "04"
title: "Chart the dashboard vision — what it shows and what data to present"
type: wayfinder:prototype
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Chart the dashboard vision — what it shows and what data to present

## Question

The heart of the effort: **what is this dashboard, and what data does it put in front of you?**
Decide the vision before the data model, because the vision dictates what the model must carry.

Resolve, ideally against a rough `/prototype` mockup with the real 2020–2025 data:

- **The one job / hero view** — when you open it, what's the first thing it tells you? (e.g. "3 markers
  need attention this year" vs a full panel dump.) What earns a spot at the top.
- **What data to present, and what to hide** — which markers matter enough to surface, which are
  reference-only, how they're grouped (by panel? by concern — cardio / metabolic / kidney / liver?).
- **The "new insight" angle** — the user's hunch that a different presentation yields insight the flat
  table hides. Candidates to react to: trend sparklines, concern-grouped scorecards, ratios
  (TG:HDL), distance-from-range heatmap, year-over-year deltas. Pick the ones that pay off.
- **Personal target vs lab-"normal" (two-tier)** — the "what to pay attention to" job hinges on this: your
  own targets differ from the lab range (ALT < 30, homocysteine < 9, LDL "as low as possible", TG:HDL ratio;
  see the note's "What to look for" section). Decide how the dashboard shows a marker that's *inside* lab-normal
  but *outside* your target, and how goals ("as low as possible") are visualised vs a hard threshold.
- **Drill-in story** — from the summary down to a single marker's full history + meaning.
- **Levels** — glance (attention) → scan (grouped panels) → dig (single-marker trend + tooltip).
- **Compact / widget form factor** — the "glance" level must also work as a small widget embedded in
  `lhak-dashboard` (see ticket 08): what few metrics/signals earn a spot in that shrunken surface, and
  what it links to. Design the glance view knowing it has to survive at widget size.

Output: a vision sketch / mockup (linked asset) + a written statement of what the dashboard shows at
each level. This graduates the attention-summary, trend-viz, and layout fog into concrete decisions.

## Comments

### Resolution

Settled over six prototype passes. **Asset:** `prototypes/vision-mockup.html` (flat-editorial health
dashboard rendered from the real 2020–2025 data; published artifact
<https://claude.ai/code/artifact/241ff284-b487-4ce2-8d0a-ccfd115cdbba>). The vision:

- **Visual language:** flat-editorial in the `lhak-dashboard` (Khoa/Capritarius) design system — dotted
  paper, hairline rules, no cards/shadows, Space Grotesk / Iosevka / Maple type, the 8 chromatic accents
  used *as information* (red out-of-range, orange past-target, green good). Lucide icons. One screen, no
  page scroll — a 3-column grid that fills the pane; columns scroll internally.
- **Levels:** glance → scan → dig.
  - **Glance (hero):** a "Needs attention" block where **the flagged markers themselves are the hero**
    (name + colored value + arrow + why), not an abstract count. All-clear shows a green line.
  - **Scan:** markers **grouped by health concern** (not by lab panel), each group a flat list with a
    status roll-up dot and a content-descriptor tag; healthy groups stay quiet.
  - **Dig:** click a marker row → expand its full-history chart (in-range band, dashed personal-target
    line, all years, latest called out). Accordion — **one open at a time**. Hover a marker **name** for
    meaning + range + target (no separate ⓘ element).
- **Two-tier status:** lab reference range vs the user's *personal target* (ALT ≤ 30, TG:HDL < 1.0,
  LDL "as low as possible"…). A marker inside lab-normal but past a target flags "past target" (orange).
- **Auto arrows + sparklines** replace the hand-typed △▼. **Derived markers** (TG:HDL) are first-class.
- **Completeness:** a **curated set by default** (settings-editable), a **Show all** toggle reveals the full
  panel incl. **qualitative results** (Negative/Normal, no chart). The **full record lives in an Obsidian
  Base**; each **concern header opens its filtered Base view** — plugin = curated overlay, Base = source of truth.
- **Static profile facts** (blood type, allergies) live on a top-bar line, out of the trending grid.
- **Top bar (one line):** profile switcher pills (You / Spouse / Child) + profile facts + last-record date,
  Show all at the right. No `Health` wordmark; theme follows Obsidian.
- **Scope confirmed:** labs + vitals (blood pressure modelled as two numbers, weight, BMI mocked).
- **Multi-profile:** wanted (spouse, children). Flagged as a scope call — pediatric age-based ranges are a
  real data-model cost → decide in-scope-now vs v2 (new ticket).

Downstream this graduates: **look & feel** (05, seeded by the mock), a new **plugin settings** ticket, a
new **family-profiles scope** ticket, and several **data-model** requirements (see ticket 02).
The user will dial visual details further during implementation.

---
id: "05"
title: "Design how the dashboard looks — layout and visual language"
type: wayfinder:prototype
mode: HITL
status: closed
assignee: lhak
blocked-by: ["04"]
---
# Design how the dashboard looks — layout and visual language

## Question

**Seed:** the vision prototype `prototypes/vision-mockup.html` (artifact
<https://claude.ai/code/artifact/241ff284-b487-4ce2-8d0a-ccfd115cdbba>) already establishes the visual
language, layout, and interactions in the flat-editorial system. This ticket is the *dial-in* pass on top of
it — the user explicitly deferred fine visual work (column rebalancing, spacing, tag polish, real charts vs
the mock's sparklines/SVG, empty/qualitative states) to implementation. Start from the mock, not a blank page.

Turn the vision (ticket 04) into a concrete look: **how the dashboard actually appears.** Decide,
against a higher-fidelity `/prototype` (consult the `frontend-design` skill; it lives inside Obsidian,
so honour Obsidian theming / CSS variables, light + dark):

- **Layout / composition** — how the glance → scan → dig levels are arranged on screen (single view,
  panels, columns, cards); what's above the fold.
- **The marks** — how a marker + its trend is drawn (sparkline shape, arrow/delta chip, in-range vs
  out-of-range color), the attention view's visual treatment, ratio/heatmap elements if the vision kept them.
- **Tooltip / hover** — how meaning + normal range appear on hover without clutter.
- **Visual language** — type scale, color for status (normal / watch / out-of-range), density, iconography;
  fits an Obsidian dashboard, not a clinical printout.
- **Inspiration from lhak's own plugins** — draw layout / interaction / visual conventions from
  `obsidian-lhak-dashboard` and `obsidian-linear-calendar` (both under `~/workspace/github.com/lhak1341/`)
  so this plugin feels of a piece with them. Reuse what already works (view chrome, density, color, hover
  patterns); the research ticket (01) captures the concrete conventions.

Output: an annotated visual mockup (linked asset) the PRD can reference as the target look.

## Resolution

Target look locked — higher-fidelity dial-in over the vision seed. Annotated asset:
[prototypes/look-dialed.html](../prototypes/look-dialed.html) · [artifact](https://claude.ai/code/artifact/084702a5-4af9-49f5-b8f7-b509f53eeae0).
The file header comments the deltas from the seed; annotations double as build notes for the PRD.

Honors the established identity (flat-editorial, dot-grid, Space Grotesk / serif / mono triad, status
palette) and Obsidian theming (light + dark, CSS vars). Three direction forks decided this session, plus
three live fixes from the user's reactions:

- **Columns auto-balance** — greedy shortest-column packing into a **ResizeObserver-driven count (3/2/1 by
  pane width)**, matching the ticket-01 convention. Concern order is a priority list, not a hard column pin;
  the widget plugs whichever column ends shortest. (Chosen over fixed concern→column and over a plain
  responsive-count-only approach.)
- **Charts stay hand-rolled SVG** (no chart lib — matches lhak-dashboard + linear-calendar): range band,
  dashed target line + label, emphasized last point, dual diastolic line for BP, and a "trend appears after
  next visit" note for single-reading markers. **Fix:** dropped `preserveAspectRatio="none"` (was stretching
  the chart horizontally in wide columns) → uniform scale, `width:100%; height:auto`.
- **In-row indicator keeps sparkline + arrow + value**, with fixed sparkline + value tracks so numbers align
  down a column.
- **States dialed:** qualitative history as per-visit chips (bad results tint orange); empty-state + "all
  clear" voice tuned; `+N hidden` tag emphasized.
- **Header fixes from reactions:** status dot moved to **after** the concern name; concern name set
  `white-space:nowrap` (+ tag truncates) so long names like "Immunity & markers" stay one line.

The user deferred nothing further — this is the PRD's target look. Real charts remained hand-rolled per the
decision (no library introduced).

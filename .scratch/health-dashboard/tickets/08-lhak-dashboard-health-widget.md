---
id: "08"
title: "Design the lhak-dashboard health widget"
type: wayfinder:prototype
mode: HITL
status: closed
assignee: lhak
blocked-by: ["01", "04"]
---
# Design the lhak-dashboard health widget

## Question

The health plugin gets a second surface: a compact widget/icon inside `obsidian-lhak-dashboard` —
same integration style as `obsidian-linear-calendar` — so the user sees the important metric(s) at a
glance from the main dashboard and can jump into the full health plugin.

Decide (against a `/prototype`, reusing the integration mechanism captured in ticket 01 and the glance
view from ticket 04):

- **What the widget shows** — in a small footprint: the "N need attention" count? the single worst
  marker? a mini attention list? an icon that just changes color on status? Pick what pays off at that size.
- **Entry point** — how the icon/widget opens the full plugin view (click target, deep-link to a marker).
- **Integration mechanism** — how it registers in lhak-dashboard (per ticket 01's findings): widget API,
  embedded view, or rendered panel.
- **Refresh / state** — when the widget recomputes (on vault change, on open).

Output: a widget mockup + the integration approach, referenced by the PRD.

## Resolution

Asset: [prototypes/widget-mockup.html](../prototypes/widget-mockup.html) ·
[artifact](https://claude.ai/code/artifact/aa22f9e2-ccdb-409d-b236-7b2016b5fcab).

**What it shows — a two-tier ladder, host picks the tier:**
- **Chip** — inline pill (~30px tall): heart glyph + flagged count + status pips (worst-status colored dots).
  Near-zero footprint; rides an existing stat row or the clock strip. All-clear → green ✓ "in range".
- **List** (**default**) — a dashboard-column panel (~280px): header (`Health · N flagged · M tracked`) + the
  top-N flagged markers as **dense single-line rows** (status dot · name · mini sparkline · value · trend arrow).
  All-clear → one green "All markers in range" line + last-visit date. (Compact middle tier was prototyped then
  dropped — the tightened List ate its niche.)
- Rows tightened after review: single-line (why-reason moved to hover title), halved padding — fits alongside
  stats+projects in the left column.

**Placement (in lhak-dashboard):** a new **`HealthPanel` in the left column**, below stats/projects — same
`mount(container)` Panel interface those use (`view.ts`: root=clock+calendar strip, body=left/mid/right cols).
Chip variant may instead ride inline in the clock strip.

**Integration mechanism** (mirrors `CalendarPanel`→`mountMonthStrip`, per research ticket 01):
- Health plugin **exposes `mountHealthWidget(container, { tier, maxRows, onOpenMarker }) → handle{ destroy }`**.
- lhak-dashboard's `HealthPanel` reads `app.plugins.plugins['health']`, calls `mountHealthWidget`, stores the
  handle, calls `handle.destroy()` on `onClose`. **Host owns placement + tier choice** (passes `tier` in).
- **Entry points:** header/chip click → `executeCommandById('health:open-dashboard')` (opens full view at top);
  **each List row → open full view scrolled + expanded to that marker**, wired internally by the mount fn via the
  `onOpenMarker(id)` callback (health plugin owns the DOM + knows how to anchor its own view).

**Refresh/state:** embedded-panel convention — `update()` is a **no-op**, recompute only on **mount / dashboard
open** (`loadData()`); no live vault subscription (health data mutates ~once a year). Staleness window clears on
next dashboard open.

**Row cap:** default **top 3** flagged, then a "+N more · view all →" footer opening the full attention section.

**Feeds ticket 09 (plugin settings):** the widget **tier** (Chip/List), row cap, and detailed toggles
(sparkline on/off) are configuration — settle their home/exact controls there. The mount API already accepts
`{ tier, maxRows }` so settings just supply them.

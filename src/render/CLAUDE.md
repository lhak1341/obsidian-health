# Render-layer conventions (src/render)

- `dashboard-view.ts`, `visit-editor-view.ts`, `planner-view.ts` (the adapters, one level up)
  import `icons.ts`, which value-imports `obsidian` (unresolvable outside the app). Pure logic
  that needs test coverage from inside one of these views goes in its own Obsidian-free
  sibling file — check for an existing domain-shaped one first (`rows.ts` for
  `RowEntry`-scoped logic, `tier-lanes.ts` for concern-group ordering) before adding a new
  bucket file. `rows.ts` is itself hybrid: untested DOM-builders (`buildArrowCell`,
  `fillMarkerRowContent`) sit beside its tested pure exports.
- Curated view and Show all use two independent lane-layout systems, not one: Show all keeps
  the pinned-column system (`WIDE_LANES`/`MEDIUM_LANES`/`NARROW_LANES` in `tier-lanes.ts`);
  Curated view uses a dynamic weight-based packer (`packLanes`, same file — see
  `docs/adr/0003`) that ignores the pin entirely, including a `pinFirst` exception for Vitals.
  A change to one doesn't touch the other.
- Any raw SVG attribute (`fill=`/`stroke=`, set via `setAttribute`, not `.style`) that uses
  `var(--foo)` needs an explicit fallback (`var(--foo, #hexvalue)`) — `html-to-image`
  (screenshot export) only bakes computed `style` properties into its clone, so an
  attribute-level `var()` with no fallback resolves to nothing in the isolated export and
  silently renders black instead of the theme color. Every chart color in `charts.ts` and
  every `statusColor()`/`arrowColor()` (`format.ts`) carries a hardcoded hex fallback for
  exactly this reason. `svg-var-fallback.test.ts` scans `src/**/*.ts` for a fallback-less
  `var()` on any line that is not a `.style`/`setProperty` assignment, so a new SVG color that
  forgets one fails the suite.
- `.hlth-hidden` (`display: none`) is scoped `.hlth-row.hlth-hidden`, not a general-purpose
  hide utility — toggling it on any other element type (an input, a span) silently does
  nothing. Use inline `style.display` for one-off visibility toggles outside dashboard rows.
- A conditionally-empty flex child (e.g. an arrow span with `textContent === ""`) still
  consumes its own `gap` slot on both sides. Skip appending it entirely when there's nothing
  to show, rather than rendering it empty — don't fight the gap with margins.

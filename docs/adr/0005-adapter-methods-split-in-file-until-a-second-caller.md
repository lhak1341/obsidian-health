# Adapter methods split in-file until a second real caller exists

An architecture review (`/improve-codebase-architecture`) flagged `HealthView`
(`dashboard-view.ts`) as a shallow "god object" -- 338 lines, private methods for vault
reload/repaint, curated toggling, target editing, screenshot export, and Base-view
navigation, each reaching into `this.plugin`/`this.snapshot`/`this.viewState` directly.
It proposed extracting screenshot export's rasterize/save logic into a standalone,
reusable module (`renderToPng(el, opts)` + `saveScreenshotFile(dataUrl, name)`), and
applied the deletion test to `openConcernBase`/`switchToBaseView` as evidence: deleting
either just moves ~15 lines back to the call site, so (the review argued) neither is yet
a real module.

Grilled both claims and rejected the extraction. `exportScreenshot` has exactly one
caller (the export button) and no second caller is planned -- grep confirmed `toPng`/
`showSaveDialog` are used nowhere else in the codebase. Per `/codebase-design`, one
adapter doesn't justify a seam; two would. Adapters in this project are also
intentionally untested (see CONTEXT.md's Adapter definition -- correctness comes from
keeping logic out of adapters and in the domain core), so testability isn't available
as a justification for extraction here the way it would be for `core/` code. The method
was still hard to read, so it was split into named private methods on `HealthView`
itself (`prepareForCapture`/`rasterize`/`promptAndSave`) -- readability without a new
file or a new interface.

Re-examining `HealthView` as a whole with that same lens found no misplaced domain
logic in any of its methods -- `toggleCurated`, `editTarget`/`saveTarget`,
`openConcernBase`/`switchToBaseView` are all genuine Obsidian-facing orchestration
(vault write + reload, DOM/Electron, workspace view-state), exactly what CONTEXT.md's
Adapter doctrine says belongs there. The review's deletion-test argument doesn't
transfer to this level either: deleting *any* private method on *any* class moves its
lines to the call site -- that's true of ordinary method decomposition too, not a
shallowness signal. The deletion test is meaningful at module/seam boundaries, not
between private methods of one class. No action taken on `HealthView`'s overall shape.

Recorded so a future architecture review doesn't re-flag either `HealthView`'s size or
a single-caller adapter method from scratch. Trigger to revisit: a second real caller
for the screenshot-export logic (e.g. another `ItemView` in the `.hlth-*` family wanting
PNG export), or a private method on `HealthView` found to contain actual domain logic
(a computation that belongs in `core/dashboard.ts`, not glue around it).

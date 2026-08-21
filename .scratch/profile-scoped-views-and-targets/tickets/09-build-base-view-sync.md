---
id: "09"
title: "Build: plugin generates and maintains Base views"
type: wayfinder:task
mode: AFK
status: closed
assignee: lhak
blocked-by: []
---
# Build: plugin generates and maintains Base views

## What to build

Implement the design settled in [Plugin generates and maintains per-profile Base views](08-plugin-authors-base-views.md)
(read its Resolution for full rationale before starting):

- New optional `base_order: number` field on `MarkerNote`.
- A generator (pure function, Obsidian-free where possible) that, given the current markers,
  profiles, and settings, computes the desired set of Base views: one unsuffixed view per live
  concern (union of every `MarkerNote.concern` value, not `CONCERN_CONFIG`) plus one
  `<Concern> — <person>` view per (concern × profile) pair. Column order per view: sort by
  `base_order`, fallback alphabetical-by-id for markers without one. Per-profile views add a
  `person == "<person>"` view-level filter on top of the concern's `order`/`sort`.
  `concernViewNameForProfile`'s existing name-resolution (override-or-label, then person suffix)
  is the one source of truth for view names — reuse it, don't reimplement.
- A settings-tab "Sync Base views" action (adapter-side I/O, not in the pure generator) that:
  1. Reads `settings.basePath`'s current file content and the sync manifest
     (`data.json`: `managedBaseViews: string[]`, exact names written last sync).
  2. Diffs desired-vs-current-vs-manifest into three buckets: add, update (content differs from
     desired), would-delete (in manifest, no longer desired). Also surfaces any view whose name
     matches something desired but isn't in the manifest yet (first-run/collision case) as its
     own explicit adopt/overwrite line, never auto-merged into "update".
  3. Shows one confirmation `Modal` listing every bucket (names only, not full YAML diffs) with a
     single OK/Cancel.
  4. On confirm: re-reads the file and re-locates every anchor block immediately before writing;
     if anything no longer matches what the preview was built from, abort with an error `Notice`
     and do not write.
  5. Writes via targeted string-splice (locate each managed view's block by its exact name,
     replace/insert/remove just that block) — never a full-file `parseYaml`/`stringifyYaml`
     regenerate.
  6. On success, updates the manifest to the new desired set and shows a summary `Notice`.
- `properties:` (displayName) block is untouched — this ticket only ever touches `views:`.

## Acceptance criteria

- [ ] `base_order` parses as an optional number on `MarkerNote`; absent on all fixtures/existing
      markers today (no migration needed, alphabetical fallback covers it).
- [ ] The view-set generator is a pure, unit-tested function: given markers + profiles +
      settings, returns the exact desired `{name, order, sort, filters}` set — no Obsidian API in
      this function.
- [ ] Sync is idempotent: running it twice in a row with no vault changes produces an empty
      add/update/delete diff (nothing gets rewritten, no spurious `Notice`).
- [ ] A pre-existing view with a managed-pattern name but not yet in the manifest is always shown
      as an explicit adopt/overwrite line in the confirm modal — confirmed against this vault's
      current 9 plain + 18 per-profile hand-authored views (added in tickets 05 and this session)
      as the first real test case.
- [ ] Deleting a profile note or removing a marker's last reference to a concern surfaces the
      resulting orphaned view(s) in the would-delete bucket, never deletes without the confirm
      modal.
- [ ] A view outside the managed naming pattern is byte-identical before/after a sync run.
- [ ] Concurrent-edit safety: simulate the file changing between preview-build and confirm (edit
      it manually mid-flow during live testing); sync aborts with an error `Notice`, writes
      nothing.
- [ ] Verified live against the real vault per the `obsidian-plugin-dev` skill's
      `references/debugging.md` workflow — `.base` files have no fixture/unit-test coverage path,
      this is the only verification that counts for the write mechanics themselves.
- [ ] Typecheck, unit tests, and full suite pass.

## Blocked by

None.

## Resolution

Built per ticket 08's Resolution, all 12 decisions implemented as specified:

- `MarkerNote.baseOrder` (`base_order` frontmatter), optional, parsed in `reader.ts`. Before adding
  it, checked whether the existing `MarkerNote.order` field (already used for dashboard curated-row
  order and visit-editor field order, with its own settings-tab drag-reorder UI) could be reused
  instead -- pulled its real values for this vault's Kidney markers (`uric_acid: 10, creatinine: 20,
  egfr_mdrd: 30, urea: 40`) and confirmed they reflect dashboard *attention priority*, not the
  Base table's lab-report-style column sequence (`creatinine` first there). Reusing it would have
  silently coupled two axes CLAUDE.md already documents as deliberately separate (the `panel`/
  `concern` note makes the same kind of distinction). Ticket 08's new-field decision stood.
- `core/dashboard.ts` gained `resolveConcernViewName` (extracted from `dashboard-view.ts`'s inline
  override-or-label logic) -- now the one place both `openConcernBase` and the generator resolve a
  concern's unsuffixed Base name from, so they can't independently drift.
- `core/base-views.ts` (pure, Obsidian-free, unit-tested): `computeDesiredBaseViews` (the generator),
  `serializeBaseView`, `parseViewBlocks` (text-anchor scanner, not a YAML parse), `diffBaseViews`,
  `applyBaseViewSplice`.
- `vault/base-view-sync.ts` (adapter): `planBaseViewSync` (read + diff) / `applyBaseViewSync`
  (re-read, re-diff, abort-if-changed, splice, write, update `settings.managedBaseViews`). Tested
  against `fake-app.ts`, extended with `vault.read`/`vault.modify` (additive, non-frontmatter file
  content -- existing frontmatter-path tests untouched).
- `base-view-sync-modal.ts` + a "Sync base views" button in the settings tab's vault-paths section:
  one combined add/update/remove/collision preview, single Cancel/Sync.
- `settings.managedBaseViews: string[]` added to `HealthPluginSettings`/`DEFAULT_SETTINGS`; `main.ts`
  gained the same explicit-re-copy-on-load guard `concernViewOverrides`/`concernIcons` already have
  (Object.assign only shallow-copies -- an absent field would otherwise stay reference-shared with
  the `DEFAULT_SETTINGS` module constant across plugin loads).

Verified live against the real vault (this vault's actual `.base` file was never hand-reset after
ticket 05's own test-and-revert, so its 9 plain + 18 per-profile hand-authored views -- the exact
first-run collision case from ticket 08's decision 12 -- were the real test fixture, not a
simulation): opened the settings tab, clicked Sync base views -- modal correctly showed all 27 as
"Adopt / overwrite", nothing in Add/Update/Remove (empty manifest, first run). Confirmed: file
rewritten, `data.json`'s `managedBaseViews` populated with exactly those 27 names. The diff also
surfaced markers that already had a `concern:` entry but were never manually wired into the old
hand-authored `order:` lists (`apob`, `hba1c`, `homocysteine`, `thyroid_panel` under
Cardiometabolic; `afp`, `h_pylori_pepsinogen` under Cancer; `toxoplasma_igm` under Immunity;
`anti_hcv` under Liver) -- the generator picked them up with zero manual Base-file authoring, which
is the acceptance criterion this whole ticket exists to prove.
Column order fell back to alphabetical everywhere (no marker has `base_order` set yet -- expected,
matches decision 6's fallback). `properties:` block above `views:` untouched in the diff, as
decided (out of scope). Re-ran Sync immediately after: modal showed "Already in sync -- nothing to
do." (idempotency, live-confirmed on top of the unit test).

`bun run test` (255 tests, up from 210), `tsc --noEmit`, and `bun run lint` all clean. One
`eslint.config.mjs` change: extended the existing `obsidianmd/no-tfile-tfolder-cast` off-override
(already scoped to `writer.ts`/`writer.test.ts`/`reader.ts` for the documented "obsidian ships no
runtime, breaks vitest" reason) to also cover `base-view-sync.ts`/`base-view-sync.test.ts`, which
duck-type `TFile` the same way for the same reason.

The real vault's `.base` file and `data.json` are left in their post-sync state (git-tracked,
currently uncommitted) -- diff is exactly the adoption/normalization/new-column-pickup described
above, nothing else touched.

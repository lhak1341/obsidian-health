---
id: "08"
title: "Plugin generates and maintains per-profile Base views"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Plugin generates and maintains per-profile Base views

## What to build

Ticket 05 shipped `concernViewNameForProfile` and `openConcernBase`, but deliberately left the
`<Concern> — <person>` views themselves as a manual authoring step in the `.base` file — Obsidian's
native "not found" state was accepted as the safe degrade for an unauthored view (see 05's
Acceptance criteria and Resolution). That manual step doesn't scale: every new profile
(`ProfileNote`) needs one new view per existing concern, and every new concern/metric needs a
column added across every profile's view, by hand, in YAML.

This ticket gives the plugin a write path to `settings.basePath` so those views can be
generated/kept in sync instead of hand-authored:

- On demand (a settings-tab action: "Sync Base views") and/or automatically when a profile or
  marker's `concern` changes, regenerate the per-profile views: one `<Concern> — <person>` view
  per (concern × profile) pair, cloning the base concern view's `order`/`sort` and adding a
  `person == "<person>"` view-level filter — the same shape I hand-authored today.
- Must not clobber hand-edited content in views it doesn't own: only manage views whose name
  matches the `<Concern> — <person>` pattern for a currently-known concern/profile; leave the
  plain (unsuffixed) concern views and any other user-authored views untouched.
- Removing a profile or concern should prompt before deleting its now-orphaned views, not
  silently drop them (data-loss risk, not just a display gap).

## Why this needs care (flag for HITL, not a routine AFK ticket)

- No existing precedent: every write today goes through `vault/writer.ts`'s
  `writeFrontmatter()`, scoped to a note's frontmatter. Writing structured YAML into a `.base`
  file's `views:` list is a new write surface with no shared seam yet — worth a design pass
  before implementation, not just an extension of the existing pattern.
- `.base` files aren't covered by the `metadataCache`-based write-confirmation
  (`obsidian-plugin-dev` skill's `references/debugging.md`) the rest of the plugin relies on to
  know a write landed — needs its own verification approach (read-back and diff, most likely).
- Risk of clobbering hand-authored views if the "do I own this view" match is too loose or too
  strict.

## Acceptance criteria

- [ ] A settings-tab action regenerates all `<Concern> — <person>` views for every current
      profile × concern pair, matching the shape hand-authored in ticket 05 (view-level
      `person == "<person>"` filter, same `order`/`sort` as the base concern view).
- [ ] Re-running the sync is idempotent — no duplicate views, no spurious diff on views that
      already match.
- [ ] Views not matching the managed naming pattern (plain concern views, anything else the user
      authored) are left byte-identical.
- [ ] Deleting a profile or a concern does not silently delete the corresponding views without
      confirmation.
- [ ] Verified live against the real vault per the `obsidian-plugin-dev` skill's debugging
      workflow (this repo's `.base` files have no automated test coverage — Bases aren't
      readable via the vault fixtures used elsewhere).

## Blocked by

None — but read ticket 05's Resolution and `../SPEC.md` ("Per-profile Base-view authoring") for
the naming contract this must reproduce exactly, before designing the write path.

## Resolution

Grilled to a full design (12 rounds, 3 rounds of questions) before any code. Facts gathered first:
Obsidian's typed API (`obsidian.d.ts`) has no read/write method for `.base` files despite typing
their shape (`BasesConfigFile`/`BasesConfigFileView`), but does expose public `parseYaml()`/
`stringifyYaml()` globals; `MarkerNote.name` doesn't match the vault's existing hand-tuned
`displayName` strings (e.g. "Total Cholesterol" vs the Base file's "Cholesterol (Total)"), ruling
out deriving column labels from it; no existing field explains today's hand-picked column order
(Kidney's `order:` list isn't alphabetical and doesn't match the visit-editor's panel-grouping
sort either).

Settled design:

1. **Trigger**: on-demand only — a settings-tab "Sync Base views" button. No auto-fire on
   profile/marker change (a later ticket if wanted).
2. **Rewrite mechanics**: surgical text-splice by string-anchor on the plugin's own view blocks —
   not a full `parseYaml`/`stringifyYaml` regenerate of the whole file, which would risk
   reformatting every hand-authored view it doesn't own.
3. **Ownership**: an explicit manifest in plugin `data.json` (exact view names written last
   sync), not name-pattern inference — makes "what's mine" an exact diff, not a guess.
4. **Concern source**: the live union of every `MarkerNote.concern` value in the vault, not the
   static `CONCERN_CONFIG` registry (which carries alias/fallback ids not meant as real columns).
5. **Deletion**: a confirmation `Modal` listing the exact view names before any delete.
6. **Column order**: new optional `MarkerNote.base_order` field the generator sorts by; falls
   back to alphabetical-by-id when unset.
7. **`properties:` (displayName) block**: out of scope — stays fully manual, since it can't be
   safely derived from `marker.name` (see facts above).
8. **Manual-tweak drift**: silent overwrite on every sync — deterministic regenerate is the
   point (idempotency, criterion below); documented in the settings-tab copy, not detected/warned.
9. **UX shape**: one combined preview (added/updated/would-delete) with a single confirm before
   any write, not silent-apply-plus-confirm-deletes-only.
10. **Scope**: manages *both* the unsuffixed base concern views and the per-profile suffixed
    ones — `base_order` is the single source of truth for both, so a brand-new concern needs zero
    hand-authored Base YAML at all (supersedes this ticket's original "clone the base concern
    view" framing above).
11. **Write safety**: re-read and re-verify anchor blocks immediately before the actual write;
    abort loudly with an error `Notice` if the file changed since the preview was built.
12. **First-run collisions**: every pre-existing same-named-but-unmanaged view (this vault
    currently has 9 plain + 18 per-profile views, none in any manifest yet) is surfaced in the
    confirm-preview as an explicit adopt/overwrite decision — never silently adopted even if
    content already matches.

The original Acceptance criteria above are superseded by this decision set (notably #10 widens
scope beyond "per-profile views only", and #3/#5/#9 specify a manifest-driven, preview-then-confirm
flow the original checklist didn't have) — the build ticket below restates them accurately.

**Spun off:** [Build: plugin generates and maintains Base views](09-build-base-view-sync.md)

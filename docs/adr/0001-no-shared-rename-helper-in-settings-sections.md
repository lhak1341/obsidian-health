# Don't extract a shared renameEntity() helper for the settings-tab rename flows

`ConcernSection.renameConcern` and `ProfileSection.renameProfile` both follow the same shape: call
the vault-writer rename function (`renameConcernInVault` / `renameProfileInVault`), `ctx.save()`,
`Notice`, `ctx.reload()`. An architecture review flagged this as 3-line duplication worth collapsing
into a shared `renameEntity()` on `SettingsSectionContext`, and separately flagged that tracing "how
does a concern get renamed" touches 6 files (`settings-concern-section.ts` → `vault/writer.ts` →
`settings.ts` → `settings-dirty-tracker.ts` → `settings-tab.ts`) as a shallow-module smell.

Decided not to extract a shared helper, and not to collapse the file count. The two callers aren't
duplicating business logic — they're each correctly using the `SettingsSectionContext` interface
(`save`/`reload`/dirty-tracking), and the shapes already diverge: `ProfileSection` wraps its vault
call in `try/catch` because `renameProfileInVault` can throw on a name collision (profiles are unique
files), while `renameConcernInVault` never throws (concerns aren't unique files, no collision case).
This is unlike `saveConcernOrder`/`saveProfileOrder` (a separate, still-open candidate), where the
entire 4-line sparse-order algorithm is byte-identical across both sections — that one is real
duplication; this one isn't. The 6-file trace reflects the intentional layered adapter → vault-write
→ settings-mutation → dirty-tracking → tab-render split this project already commits to (see
CONTEXT.md's Adapter/Domain core split), not a shallow interface. The vault-write/settings-key split
specifically (`renameConcern` in `vault/writer.ts` calling into `renameConcernInSettings` in
`settings.ts`) stays two functions on purpose: one is Obsidian-facing frontmatter writing, the other
is pure settings-object mutation, and a caller only ever needs the vault-writer's single entry point.

Recorded so a future architecture review doesn't re-flag the same file count or "duplication" here.

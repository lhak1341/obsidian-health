# obsidian-health

Obsidian plugin (`health`) — see `docs/PRD.md` and `tickets.md`.

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill —
bun, script contract, `bun test` vs `bun run test`, settings-tab structure, CSS
specificity, `metadataCache` write-lag, live debugging. Only repo-specific facts are below.

Real vault data lives under `09 about-me/{markers,profiles,health/labs/<person>}`. Before
editing it directly (not through the app), read the `obsidian-plugin-dev` skill's
`references/debugging.md` for the vault path first — do not `find`/guess; decoy copies of the
vault exist on disk.

A new marker needs a marker note and a value in the visit note. Its `03 base/Health.base` view
`order:` list is derived, not hand-maintained — `vault/base-view-sync.ts` computes the desired
views from vault state and the settings tab applies them behind a diff-preview confirm.

`bun install` points `core.hooksPath` at `.githooks/` (package.json's `prepare` script), so
`typecheck`/`lint`/`test` run on every commit. Nothing here needs remembering; `--no-verify`
is the only bypass.

After finishing a ticket, check off its boxes in `tickets.md` and commit separately
(`docs: check off ticket N`).

Architecture decisions live in `docs/adr/` (`0001-*.md`, `0002-*.md`, ...) — check there
before redesigning something that already has a record; write one when a decision is hard to
reverse, non-obvious without context, and a real trade-off.

Domain-model conventions live in `src/core/CLAUDE.md`, vault read/write conventions in
`src/vault/CLAUDE.md`, view/UI/settings conventions in `src/CLAUDE.md`, and render-layer
conventions in `src/render/CLAUDE.md`.

## Agent skills

Local issue tracker under `.scratch/<feature-slug>/` (`MAP.md` + `tickets/`) — see
`docs/agents/issue-tracker.md`.

Domain docs (`CONTEXT.md` + `docs/adr/`) — see `docs/agents/domain.md`.

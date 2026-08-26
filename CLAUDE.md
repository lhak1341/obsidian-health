# obsidian-health

Obsidian plugin (`health`) — see `docs/PRD.md` and `tickets.md`.

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill —
bun, script contract, `bun test` vs `bun run test`, settings-tab structure, CSS
specificity, `metadataCache` write-lag, live debugging. Only repo-specific facts are below.

Real vault data lives under `09 about-me/{markers,profiles,health/labs/<person>}`. Before
editing it directly (not through the app), read the `obsidian-plugin-dev` skill's
`references/debugging.md` for the vault path first — do not `find`/guess; decoy copies of the
vault exist on disk.

A new marker needs wiring in 3 places to be fully visible: the marker note, the visit note's
value, and `03 base/Health.base`'s matching view's `order:` list (keyed by the marker's
`concern`) — the in-plugin dashboard works without step 3, so it's easy to forget.

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

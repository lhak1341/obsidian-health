# obsidian-health

Obsidian plugin (`health`, see `docs/PRD.md` and `tickets.md`).

## Verifying changes live in Obsidian

Dev loop: `bun run deploy` (builds + copies `manifest.json`/`main.js`/`styles.css` into the real vault's plugin folder) then `obsidian-cli plugin:reload id=health`.

`obsidian-cli` (at `/Applications/Obsidian.app/Contents/MacOS/obsidian-cli`) drives the running app — `eval code=<js>` runs JS with `app` in scope, `plugin:reload id=<id>` hot-reloads a plugin, `plugin id=<id>` shows enabled state.

To call plugin internals from `obsidian-cli eval`, expose them on the plugin instance (`app.plugins.plugins.health.foo(...)`) — `require()`-ing the built `main.js` directly fails, Obsidian's plugin loader isn't in Node's `require.cache`.

Real vault (for live checks): `/Users/lhak/Library/Mobile Documents/iCloud~md~obsidian/Documents/lhakZettel`, health notes under `09 about-me/{markers,profiles,health/labs/<person>}`.

## Data authoring gotcha

Quote frontmatter values starting with `%`, `@`, `|`, `>`, etc. — unquoted, Obsidian's parser silently drops the WHOLE note's frontmatter, no error surfaced anywhere.

## Ticket tracking

After finishing a ticket, check off its boxes in `tickets.md` and commit separately (`docs: check off ticket N`).

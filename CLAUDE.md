# obsidian-health

Obsidian plugin (`health`, see `docs/PRD.md` and `tickets.md`).

## Verifying changes live in Obsidian

Dev loop: `bun run deploy` (builds + copies `manifest.json`/`main.js`/`styles.css` into the real vault's plugin folder) then `obsidian-cli plugin:reload id=health`.

`obsidian-cli` (at `/Applications/Obsidian.app/Contents/MacOS/obsidian-cli`) drives the running app — `eval code=<js>` runs JS with `app` in scope, `plugin:reload id=<id>` hot-reloads a plugin, `plugin id=<id>` shows enabled state.

`dev:screenshot path=<file>` captures the window; `dev:errors` shows captured console errors (`clear` to reset); `dev:console` shows captured console messages (filter by `level=`). Use these instead of eyeballing.

A click that triggers a CSS transition (e.g. an accordion) can screenshot mid-animation if you shoot immediately after an `eval`-driven `.click()` — check `classList`/computed style first, or screenshot again, before trusting what you see.

`plugin:reload` does not close open Modals — a modal left open across a reload stacks a stale instance under the fresh one; `document.querySelectorAll(".modal").length` should read 1 before you script it, and `document.querySelectorAll(".modal-bg").forEach(b=>b.click())` clears strays. Commands that open a modal after an async step (e.g. a vault scan) also return before the modal exists — a bare `eval` right after `executeCommandById` can see 0 modals; add a brief pause.

`plugin:reload`/`disablePlugin`+`enablePlugin` alone don't guarantee an already-open leaf picks up new code — force it: `app.workspace.getLeavesOfType(id).forEach(l=>l.detach())` then reopen, before trusting any live check.

Reloading `health` does NOT refresh an already-mounted widget living inside another plugin's view (e.g. the `lhak-dashboard` widget) — that DOM instance was built by the old code and stays stale. Detach+reopen the HOST's leaf (`app.workspace.getLeavesOfType('lhak-dashboard').forEach(l=>l.detach())` then re-execute its open command), not just `health`.

After a multi-site `replace_all` edit, grep the deployed bundle for the exact expected pattern near each call site — `replace_all` matches by exact indentation and silently skips occurrences that don't match, with no error.

To verify a spacing/alignment fix, measure the actual glyph (`Range.selectNodeContents(el).getBoundingClientRect()`), not the container's box — box edges can shift via margin while right-aligned/flex-end content stays pinned to the track boundary and never visibly moves.

Confirm the active leaf/tab title (visible in the screenshot itself) before trusting `dev:screenshot` — this vault has dozens of unrelated tabs open, and it captures whatever's frontmost, not necessarily `health`.

A leaf not currently visible is lazy-loaded (`leaf.isDeferred`) — `leaf.view` is a stub placeholder until revealed, so `app.workspace.getLeavesOfType(...)[0].view.refresh()` fails with a misleading `refresh is not a function`. Force-load it first (`plugin.activateView()` / `workspace.revealLeaf(leaf)`), then `.view.refresh()` works.

When scripting form fields via `eval`, scope the query to the specific control (e.g. its `.setting-item` by label text), not a bare `.value ===` match across the whole modal — duplicate values across fields make a broad match silently edit the wrong one.

To call plugin internals from `obsidian-cli eval`, expose them on the plugin instance (`app.plugins.plugins.health.foo(...)`) — `require()`-ing the built `main.js` directly fails, Obsidian's plugin loader isn't in Node's `require.cache`.

Don't try to force dark mode by mutating `document.body.classList` in `eval` — the vault's Minimal theme keys its variables off its own settings toggle, not just Obsidian's core class. Theme-awareness should come from using Obsidian's semantic CSS vars, not from visually toggling and eyeballing.

Real vault (for live checks): `/Users/lhak/Library/Mobile Documents/iCloud~md~obsidian/Documents/lhakZettel`, health notes under `09 about-me/{markers,profiles,health/labs/<person>}`.

The vault is itself a git repo — after manually testing a feature that writes to it, `git status`/`git diff` there catches any accidental drift from test writes, and `git checkout -- <file>` reverts it cleanly.

Plugin settings (`data.json`) can end up persisted mid-test even without an explicit `saveSettings()` call in your own script (some other code path autosaves) — after live-testing a settings toggle, diff/inspect `data.json` directly rather than trusting an in-memory revert; fix by editing the file (or re-saving) if it stuck.

Testing a feature by writing new files directly into the vault (not through Obsidian's own write path) won't show up in an already-open view — opening the dashboard via command just reveals the existing leaf, it doesn't rescan. Force it with `leaf.view.refresh()` via `eval` (`app.workspace.getLeavesOfType("health-dashboard")[0].view.refresh()`). New files created this way are untracked, so clean up with `rm`, not `git checkout --`.

`app.setting.open()`/`openTabById(id)` throw a "circular structure" JSON error in `eval`'s return-value serialization — the action still succeeds; ignore the error and check the resulting screenshot/DOM instead.

To script the settings tab: `app.setting.open(); app.setting.openTabById('health')`, then scroll `.vertical-tab-content` or find a section via `[...document.querySelectorAll('.setting-item-heading')].find(h=>h.textContent==='X').scrollIntoView()`.

To test drag-and-drop via `eval`: dispatch real events sharing one `DataTransfer` — `const dt=new DataTransfer(); src.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt})); tgt.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}))`. `.click()` won't trigger drop handlers.

## Obsidian view rendering gotcha

Never put layout padding directly on an `ItemView`'s `contentEl` — it already carries Obsidian's `view-content` class, and themes often force `div.view-content { padding: 0 !important }` there, beating any rule regardless of specificity. Nest a child div for padding/layout; keep only sizing/CSS-variable-token declarations on `contentEl` itself.

## Obsidian settings tab gotcha

Build a `PluginSettingTab` section as `new Setting(containerEl).setName("X").setHeading()` followed by `containerEl.createDiv("setting-group").createDiv("setting-items")` — not a bare `createEl("h3")` + `Setting(containerEl)`. Obsidian's own 20px row padding is scoped by descendant selector to `.setting-items .setting-item`; skip the wrapper and every row's text sits flush against the box edge (reference: `obsidian-lhak-dashboard`/`obsidian-linear-calendar` `src/settings.ts`). A custom element (e.g. a `<details>` accordion) placed inside still needs its own padding by hand — the selector reaches nested `Setting()` rows fine, but not the element's own header line.

`Setting`'s text `onChange` fires on every keystroke ('input' event); rebuilding the tab's DOM there fights typing. Defer expensive side effects (e.g. re-scanning the vault after a folder-path edit) to the input's native `blur` event instead.

## Obsidian widget/embed mounting gotcha

The `--hlth-*` custom CSS tokens (`.health-dashboard-outer` block in `styles.css`) are scoped to the dashboard view — a widget mounted elsewhere (e.g. into a host plugin's container) can't see them. Use raw Obsidian vars directly (`--text-normal`, `--color-red`, etc.), not `var(--hlth-*)`, in anything mounted outside the dashboard view.

The CSS `zoom` property (e.g. `.hlth-widget { zoom: 0.9 }` to scale a whole card) is safe and intentional here, not an oversight to "fix" — Obsidian only runs on Electron/Chromium, so `zoom`'s lack of Firefox/Safari support doesn't matter.

A `mountX(container, opts) → handle{ destroy }` entry point that does async setup (e.g. scanning the vault) must guard each `await` with a destroyed-check before touching `root` — the host can call `destroy()` before the promise resolves.

Reference for `mountX(container, ...) → handle{ destroy }` host-handshake APIs: `obsidian-linear-calendar/src/main.ts` (`mountMonthStrip`, plugin side) + `obsidian-lhak-dashboard/src/panels/CalendarPanel.ts` (host side — looks the plugin up via `app.plugins.plugins[id]`, owns placement, destroys the handle on close). Second example of the same handshake: `main.ts`'s `mountHealthWidget` (plugin side) + `obsidian-lhak-dashboard/src/panels/HealthPanel.ts` (host side).

Font/color mapping for anything mounted into a host (e.g. `lhak-dashboard`) belongs in the HOST's own stylesheet, reaching into the guest's class names — never in the guest plugin's own CSS. The guest may mount elsewhere someday (or have its own standalone view, like linear-calendar does) where the host's tokens wouldn't exist.

`IconSuggest` (`AbstractInputSuggest` over Obsidian's `getIconIds()`, with a live preview) already exists at `src/render/icon-suggest.ts`, ported from `obsidian-linear-calendar/src/IconSuggest.ts` — reuse it for any future Lucide-icon-name text field rather than a plain text input.

## Obsidian button styling gotcha

Obsidian's theme ships a default `<button>` skin (solid `--interactive-normal` fill) that beats a bare single-class selector like `.my-btn` on specificity, silently overriding `background: transparent` and border-color with no visible error. Source CSS looking correct doesn't mean it's applying — verify with `getComputedStyle(el).backgroundColor` via `eval`. Fix by scoping the selector under a parent class (e.g. `.hlth-dash .my-btn`) for two-class specificity.

Same specificity mechanism bites icons: `svg.hlth-ic`'s base rule (`display: block`, set by `iconFor()`) has an element+class selector, so a class-only override (`.my-icon-class { display: inline-block }`) loses and block still wins — forces an unwanted line break when the icon sits inline in text. Match the `svg.` qualifier in the override selector to actually beat it.

## Obsidian vault ordering gotcha

`app.vault.getMarkdownFiles()` returns files in arbitrary cache/filesystem order, NOT alphabetical — never rely on it for display order; sort explicitly (by name, a frontmatter `order` field, etc.).

## Data authoring gotcha

Quote frontmatter values starting with `%`, `@`, `|`, `>`, etc. — unquoted, Obsidian's parser silently drops the WHOLE note's frontmatter, no error surfaced anywhere.

When writing frontmatter from plugin code, use `app.fileManager.processFrontMatter(file, fn)` rather than hand-built YAML — it applies Obsidian's own serializer and quoting, sidestepping the above by construction.

New marker notes default to `curated: false` (hidden until "Show all") and no `direction` (trend arrow stays neutral gray) unless set explicitly — easy to forget both when authoring a new marker.

Marker `panel` (drives the Add Visit form's grouping, mirrors the physical lab report's sections) and `concern` (drives dashboard column grouping, clinical/thematic) are intentionally separate axes over the same markers — don't collapse them.

## Ticket tracking

After finishing a ticket, check off its boxes in `tickets.md` and commit separately (`docs: check off ticket N`).

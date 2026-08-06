# Health

Frontmatter-first Health Dashboard for Obsidian. Derives flags, trend arrows, and history charts
from per-visit lab notes stored as plain markdown with YAML frontmatter.

## What it does

- Scans four configurable vault folders (markers, profiles, plans, lab visits) and renders a
  dashboard, a planner view, and an optional compact widget from what it finds.
- Writes back to those same notes' frontmatter when you add a lab visit, add/rename a marker or
  profile, or reorder rows from the settings tab.
- Can open a `.base` file's per-concern view when you click a dashboard column header, if a Base
  file path is configured in settings.

## Disclosures

- **Network use:** none. This plugin makes no network requests.
- **File access:** reads and writes markdown notes only inside the folders you configure in
  settings (default: `09 about-me/markers`, `.../profiles`, `.../health/plans`, `.../health/labs`)
  and, optionally, the single `.base` file path you set. It does not touch any other part of the
  vault.
- **Accounts:** none required.
- **Telemetry:** none. No analytics, no usage tracking, no error reporting sent anywhere.
- **Ads:** none.
- **Third-party services:** none.

## Development

See `docs/PRD.md` and `tickets.md` for scope and status. `bun run deploy` builds and copies the
plugin into a local vault for manual testing; `bun run test` runs the vitest suite.

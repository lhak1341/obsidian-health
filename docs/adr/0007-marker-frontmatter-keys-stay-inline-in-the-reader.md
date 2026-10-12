# Marker frontmatter keys stay inline in the reader, not in a field table

An architecture review (`/improve-codebase-architecture`, 2026-10-12, candidate 3) proposed one
table of marker fields (`{ key: "alt_unit", field: "altUnit", parse }`) to drive
`parseMarkerNote` (`vault/reader.ts`), the writer's key names, and an unknown-key check, on the
claim that the snake_case <-> camelCase mapping is hand-written in both the reader and the writer.

Rejected after grilling. The writer shares none of the snake_case keys: it only ever writes
`name`/`type`/`unit`/`panel`/`concern`/`curated`/`order` (`saveNewMarkerNote`, `saveMarkerOrder`,
`toggleMarkerCurated`), so every snake_case key (`alt_unit`, `alt_factor`, `optimal_low`/`_high`,
`base_order`, `source_url`, `year_planned`) is already written exactly once, in
`parseMarkerNote`. A table would restate that one mapping in a different shape -- the deletion test
says it moves complexity, it doesn't concentrate it. The real vault backed this up: all 89 marker
notes used only known keys (21 distinct, no typos, no extras), and `ranges` entries only
`sex`/`low`/`high`.

The silent-failure class `src/vault/CLAUDE.md` records (a mistyped key parses as `undefined`) is
real but is a diagnostics question, not a module-shape one -- and a bad *value*
(`direction: lower-better`) or a dropped note (missing `name`, invalid `type`) fails just as
silently today. Surfacing those would be a product feature: the reader returning a parsed note plus
a list of issues, shown somewhere in the plugin.

Revisit when a hand-authored marker typo (key or value) actually costs debugging time -- then build
the diagnostics feature, which may justify a table as its implementation. Not before.

---
id: "09"
title: "Design the plugin settings"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: ["02", "04"]
---
# Design the plugin settings

## Question

The vision (ticket 04) leans on user-configurable behaviour. Decide what's configurable and how the
settings are modelled/stored (Obsidian plugin settings tab + `saveData`/`loadData`, or per-vault notes):

- **Curated set** — which markers show by default vs behind "Show all"; ordering; per-concern grouping.
- **Personal targets** — the two-tier thresholds (ALT ≤ 30, TG:HDL < 1.0, LDL goal, etc.) per marker.
- **Profiles** — the list of people (self, spouse, children) and each one's static facts (blood type,
  allergies) and — if family profiles are in scope (ticket 10) — their sex/age for range selection.
- **Concern → Base view mapping** — which Base view each concern header opens.
- **Sensible defaults** — the plugin must be usable before any configuration (curated set ships preset).

Use `/grilling`. Output: the settings schema + where it's stored, referenced by the PRD.

## Resolution

**Boundary principle (the load-bearing decision):** a marker's or person's *meaning* lives in its **note**
(source of truth, Bases-consumable); plugin **`saveData`** holds only app-level UX prefs + pointers. This keeps
the single-source-of-truth the data model (ticket 02) was built around — no config duplicated across notes and
settings.

- **Stays in notes (NOT settings):** per-marker ranges, two-tier personal targets (`optimal_*`), `direction`,
  `panel`/`concern`, qualitative `normal:`, and **curated-set membership** — a per-marker **`curated: true`**
  frontmatter flag ("Show all" reveals the rest). **Ordering is auto** (attention-rank within concern per
  ticket 11; concern order = priority, not a manual pin — vision 04), so there is *nothing to configure* for
  curated set or sort. Per-person sex/dob/static facts live in `profiles/<person>.md`.

**Storage + surface:** standard Obsidian **`saveData`/`loadData`** → single JSON blob at
`.obsidian/plugins/health/data.json`, surfaced through a **`PluginSettingTab`** (same as lhak-dashboard). Not
per-vault notes — app prefs don't belong in Bases.

**Settings schema (`data.json`):**
```jsonc
{
  "version": 1,
  "paths": { "labs": "health/labs", "markers": "markers", "profiles": "profiles", "bases": "health/bases" },
  "arrowDeadbandPct": 3,                 // ticket 11's tunable ±3% flat-deadband
  "widget": { "tier": "list", "maxRows": 3, "showSparkline": true },  // ticket 08 (tier: "chip" | "list")
  "showAllByDefault": false,             // curated set shown first; toggle reveals all
  "concernBaseOverrides": {},            // optional: concern -> custom .base path; empty = convention
  "defaultProfile": "<person-id>"        // depth depends on ticket 10 (family profiles)
}
```

**Concern → Base view mapping:** **convention + optional override.** Default resolves
`health/bases/<concern>.base` by concern id (zero-config; drop a matching `.base` to add one).
`concernBaseOverrides` repoints a concern at a custom path. Missing `.base` → concern header just expands
in-plugin, no external open (graceful). Chosen over a pure hand-entered map (breaks "usable before config")
and over programmatic ephemeral-view construction (unverified in research 01 — not safe to hard-depend on).

**Sensible defaults (usable before any config):** paths preset, deadband 3%, widget = List/3-rows/sparkline-on,
show-all off, no overrides, defaultProfile = the single migrated profile. Curated flags ship on the preset
markers created during migration (ticket 12).

**Dependency:** `defaultProfile` is a pointer only; the multi-profile UI depth (switcher, per-person ranges)
is settled by [Decide family profiles — in scope now, or v2](10-family-profiles-scope.md), not here.

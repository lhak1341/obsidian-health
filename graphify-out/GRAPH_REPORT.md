# Graph Report - obsidian-health  (2026-08-21)

## Corpus Check
- 55 files · ~34,546 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 639 nodes · 1340 edges · 110 communities (21 shown, 89 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5bc32109`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Chart Rendering
- reader.ts
- Visit Entry Validation
- Concern Grouping & Registry
- Bases View & Dashboard Model
- Health Widget (main.ts side)
- Package Dependencies
- TypeScript Config
- Issue tracker: Local Markdown
- Frontmatter & Cache Write-Lag Gotchas
- Concern/Panel Axes & Multi-Profile
- Domain Core & Test Fixtures
- lhak-dashboard Widget Host Integration
- Marker/Visit Note Schema
- Plugin Manifest
- Settings Tab Architecture
- Icon Suggest Component
- Planner/Bases View Build Order
- Settings Section Pattern & Drag-Drop Testing
- CSS Specificity Gotchas
- Real Vault Drift Checks
- Accordion Scoping Gotcha
- Active Leaf/Tab Gotcha
- Architecture Review Reports
- Test Runner Scoping Gotcha
- CSS Transition Screenshot Gotcha
- Dark Mode Theming Gotcha
- Dev Loop
- Dev Screenshot/Console Tools
- Form Field Scoping Gotcha
- Glyph Measurement Gotcha
- Lazy-Loaded Leaf Gotcha
- Leaf Reload Gotcha
- Modal Reload Gotcha
- Obsidian CLI Tooling
- Plugin Internals via Eval
- replace_all Edit Gotcha
- Ticket Tracking Convention
- tsc Version Mismatch Gotcha
- Vault Write Refresh Gotcha
- PRD Out of Scope
- PRD Prior Art
- 0002-defer-typed-interface-for-dashboardviewstate.md
- PRD Wayfinder Map
- Health
- 0001-no-shared-rename-helper-in-settings-sections.md
- fake-app.ts In-Memory Obsidian App Test Fixture
- Host-Owns-Styling Rule for Mounted Widgets
- Frontmatter Special-Character Quoting Gotcha
- --hlth-* CSS Token Scoping Gotcha
- IconSuggest Component (src/render/icon-suggest.ts)
- ItemView contentEl Padding Override Gotcha
- lhak-dashboard Widget Stale DOM Instance Gotcha
- metadataCache Write-Lag After processFrontMatter Gotcha
- mountX(container, opts) -> handle{destroy} Host Handshake Pattern
- Panel vs Concern Independent Axes Note
- PluginSettingTab setting-group/setting-items Structure Pattern
- processFrontMatter Full Block Reserialization Behavior
- real-vault.ts Fixture Limitation (Blood Count Bug)
- Setting onChange/blur Deferral Pattern
- app.setting.open() Circular JSON Serialization Error
- Scripting the Settings Tab via eval
- SettingsDirtyTracker Class (settings-dirty-tracker.ts)
- SettingsSectionContext + Stateful Section-Class Pattern
- SVG Icon Specificity Gotcha (iconFor)
- Vault Git Drift Check After Live Testing Gotcha
- getMarkdownFiles() Arbitrary Order Gotcha
- Adapter (glossary term)
- Concern (glossary term)
- Concern Registry (glossary term)
- Domain Core (glossary term)
- Marker (glossary term)
- Panel (glossary term)
- Profile (glossary term)
- Visit (glossary term)
- Build Follow-ups From Migration (data hand-refinement)
- computeDashboardModel Domain Core Function
- Add Lab Visit Data Entry Pipeline
- Design Assets / Mockups (visual source of truth)
- Flagging & Arrows Logic (status precedence, deadband)
- lhak-dashboard Widget (Chip/List Tiers)
- Marker Note (schema)
- Historical Migration (Done & Verified Against Obsidian's Parser)
- mountHealthWidget Entry Point
- Multi-Profile Support (self + spouse)
- Note Kinds Schema (frontmatter-first)
- Overall Architecture: Domain Core + Thin Adapters
- Plan Note (schema)
- Planner Surface (candidate markers backlog)
- Profile Note (schema)
- Settings Boundary Decision (app prefs vs note meaning)
- Suggested Build Order
- Visit Note (schema)
- Ticket: Add Lab Visit Modal (Create-or-Edit)
- Ticket: Dashboard ItemView (Read-Only Render)
- Ticket: Domain Core - Flags, Arrows, Ranking, Grouping
- Ticket: Migration Data Hand-Refinement (In Progress)
- Ticket: Planner Surface + Bases View
- Ticket: Scaffold Plugin + Core Test Runner
- Ticket: Settings Tab + Profile Add/Edit
- dashboard.ts
- deploy.mjs
- writer.ts
- IconSuggest
- 0003-curated-view-layout-is-a-generic-weight-based-packer.md
- 0004-defer-grouping-dashboardrenderoptions-callbacks.md
- Domain Docs

## God Nodes (most connected - your core abstractions)
1. `MarkerNote` - 26 edges
2. `HealthPlugin` - 24 edges
3. `VaultSnapshot` - 23 edges
4. `ProfileNote` - 20 edges
5. `HealthView` - 19 edges
6. `iconFor()` - 18 edges
7. `HealthSettingTab` - 18 edges
8. `HealthVisitEditorView` - 17 edges
9. `computeDashboardModel()` - 15 edges
10. `ProfileSection` - 14 edges

## Surprising Connections (you probably didn't know these)
- `computeDesiredBaseViews()` --indirect_call--> `normalizeConcernKey()`  [INFERRED]
  src/core/base-views.ts → src/core/dashboard.ts
- `PanelGroup` --references--> `MarkerNote`  [EXTRACTED]
  src/core/entry.ts → src/core/types.ts
- `MarkerRow` --references--> `MarkerNote`  [EXTRACTED]
  src/core/entry.ts → src/core/types.ts
- `columnOrder()` --calls--> `normalizeConcernKey()`  [EXTRACTED]
  src/core/base-views.ts → src/core/dashboard.ts
- `resolveConcernViewName()` --calls--> `labelForConcern()`  [EXTRACTED]
  src/core/dashboard.ts → src/render/concern-registry.ts

## Import Cycles
- 3-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-context.ts -> src/main.ts`
- 4-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-concern-section.ts -> src/settings-context.ts -> src/main.ts`
- 4-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-profile-section.ts -> src/settings-context.ts -> src/main.ts`

## Hyperedges (group relationships)
- **Four Frontmatter-First Note Kinds Forming the Vault Schema** — docs_prd_note_kinds, docs_prd_visit_note, docs_prd_marker_note, docs_prd_profile_note, docs_prd_plan_note [EXTRACTED 1.00]
- **mountX Host-Handshake Pattern and Its Health-Plugin Instantiations** — claude_mountx_handshake_pattern, docs_prd_mounthealthwidget, docs_prd_lhak_dashboard_widget, claude_lhak_dashboard_widget_stale_gotcha [INFERRED 0.85]
- **PRD Suggested Build Order Realized as the Ticket Dependency Chain** — docs_prd_suggested_build_order, tickets_scaffold_plugin, tickets_domain_types_vault_reader, tickets_domain_core, tickets_dashboard_itemview [EXTRACTED 1.00]

## Communities (110 total, 89 thin omitted)

### Community 0 - "Chart Rendering"
Cohesion: 0.05
Nodes (90): convertRange(), isToggleable(), toDisplay(), pairByPartner(), ConcernGroup, buildBandRect(), buildHistoryChart(), buildSecondaryPath() (+82 more)

### Community 1 - "reader.ts"
Cohesion: 0.08
Nodes (24): BaseViewSyncModal, notifySyncAborted(), notifySyncResult(), applyBaseViewSplice(), blockText(), columnOrder(), computeDesiredBaseViews(), DesiredBaseView (+16 more)

### Community 2 - "Visit Entry Validation"
Cohesion: 0.06
Nodes (54): convert(), convertTo(), isSoftWarn(), buildPreSaveSummary(), buildVisitValues(), checkDuplicateMarkerId(), evaluateNumericField(), evaluateQualitativeField() (+46 more)

### Community 3 - "Concern Grouping & Registry"
Cohesion: 0.08
Nodes (38): groupByConcern(), normalizeConcernKey(), buildVisitFrontmatter(), parseAllergies(), validateProfileInput(), MarkerKind, PersonSex, labelForConcern() (+30 more)

### Community 4 - "Bases View & Dashboard Model"
Cohesion: 0.22
Nodes (3): ProfileNote, HealthView, DashboardViewState

### Community 5 - "Health Widget (main.ts side)"
Cohesion: 0.10
Nodes (37): computePlannerBacklog(), latestPlanNote(), PRIORITY_RANK, priorityRank(), CandidateStatus, Direction, MarkerRange, PlanNote (+29 more)

### Community 7 - "Package Dependencies"
Cohesion: 0.06
Nodes (32): esbuild, eslint, @eslint/js, eslint-plugin-obsidianmd, obsidian, description, devDependencies, esbuild (+24 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): DOM, ES2020, ES2022.Array, node, src/**/*.ts, compilerOptions, esModuleInterop, isolatedModules (+11 more)

### Community 9 - "Issue tracker: Local Markdown"
Cohesion: 0.25
Nodes (7): Conventions, Issue tracker: Local Markdown, Map frontmatter, Ticket frontmatter, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 11 - "Concern/Panel Axes & Multi-Profile"
Cohesion: 0.17
Nodes (11): Add lab visit modal (create-or-edit), Dashboard ItemView (read-only render), Domain core — flags, arrows, ranking, grouping, Domain types + vault reader, lhak-dashboard widget, Migration data hand-refinement, Multi-profile switcher, Planner surface + Bases view (+3 more)

### Community 12 - "Domain Core & Test Fixtures"
Cohesion: 0.22
Nodes (8): Further Notes, Health Dashboard — Obsidian plugin, Implementation Decisions, Out of Scope, Problem Statement, Solution, Testing Decisions, User Stories

### Community 15 - "Plugin Manifest"
Cohesion: 0.25
Nodes (7): author, description, id, isDesktopOnly, minAppVersion, name, version

### Community 17 - "Icon Suggest Component"
Cohesion: 0.40
Nodes (4): Development, Disclosures, Health, What it does

### Community 41 - "PRD Out of Scope"
Cohesion: 0.20
Nodes (9): Agent skills, Domain, Domain docs, Issue tracker, obsidian-health, Process, Structure, Testing (+1 more)

### Community 104 - "dashboard.ts"
Cohesion: 0.10
Nodes (11): HealthBasesView, resolveDefaultProfile(), HealthPlugin, HealthWidgetHandle, HealthWidgetOptions, HealthPlannerView, buildRow(), renderBasesMarkers() (+3 more)

### Community 105 - "deploy.mjs"
Cohesion: 0.40
Nodes (3): OPTIONAL, REQUIRED, targets

### Community 106 - "writer.ts"
Cohesion: 0.13
Nodes (26): ageAt(), arrowTone(), buildConcernGroups(), buildSeries(), computeDashboardModel(), deriveArrow(), deriveStatus(), rangeScore() (+18 more)

### Community 110 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

## Knowledge Gaps
- **150 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **89 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MarkerNote` connect `writer.ts` to `Chart Rendering`, `reader.ts`, `Visit Entry Validation`, `Concern Grouping & Registry`, `Health Widget (main.ts side)`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `VaultSnapshot` connect `Concern Grouping & Registry` to `reader.ts`, `Visit Entry Validation`, `Bases View & Dashboard Model`, `Health Widget (main.ts side)`, `dashboard.ts`, `writer.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `ProfileNote` connect `Bases View & Dashboard Model` to `Chart Rendering`, `reader.ts`, `Visit Entry Validation`, `Concern Grouping & Registry`, `Health Widget (main.ts side)`, `writer.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chart Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._
- **Should `reader.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08200290275761973 - nodes in this community are weakly interconnected._
- **Should `Visit Entry Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.05859969558599695 - nodes in this community are weakly interconnected._
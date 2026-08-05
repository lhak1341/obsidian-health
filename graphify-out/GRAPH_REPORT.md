# Graph Report - obsidian-health  (2026-08-05)

## Corpus Check
- 41 files · ~22,746 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 501 nodes · 1014 edges · 103 communities (18 shown, 85 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74559141`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Chart Rendering
- Planner Backlog Logic
- Visit Entry Validation
- Concern Grouping & Registry
- Bases View & Dashboard Model
- Health Widget (main.ts side)
- Plugin Lifecycle & Views
- Package Dependencies
- TypeScript Config
- Vault Reader/Writer
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
- PRD Problem Statement
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

## God Nodes (most connected - your core abstractions)
1. `MarkerNote` - 24 edges
2. `AddVisitModal` - 22 edges
3. `HealthPlugin` - 21 edges
4. `VaultSnapshot` - 21 edges
5. `HealthSettingTab` - 16 edges
6. `computeDashboardModel()` - 14 edges
7. `ProfileSection` - 14 edges
8. `compilerOptions` - 14 edges
9. `ProfileNote` - 13 edges
10. `buildHistoryChart()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `ProfileInput` --references--> `PersonSex`  [EXTRACTED]
  src/vault/writer.ts → src/core/types.ts
- `resolveBandForEntry()` --calls--> `resolve()`  [EXTRACTED]
  src/core/entry.ts → src/core/dashboard.ts
- `writeFrontmatter()` --calls--> `resolve()`  [EXTRACTED]
  src/vault/writer.ts → src/core/dashboard.ts
- `PanelGroup` --references--> `MarkerNote`  [EXTRACTED]
  src/core/entry.ts → src/core/types.ts
- `MarkerRow` --references--> `MarkerNote`  [EXTRACTED]
  src/core/entry.ts → src/core/types.ts

## Import Cycles
- 3-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-context.ts -> src/main.ts`
- 4-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-concern-section.ts -> src/settings-context.ts -> src/main.ts`
- 4-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-profile-section.ts -> src/settings-context.ts -> src/main.ts`

## Hyperedges (group relationships)
- **Four Frontmatter-First Note Kinds Forming the Vault Schema** — docs_prd_note_kinds, docs_prd_visit_note, docs_prd_marker_note, docs_prd_profile_note, docs_prd_plan_note [EXTRACTED 1.00]
- **mountX Host-Handshake Pattern and Its Health-Plugin Instantiations** — claude_mountx_handshake_pattern, docs_prd_mounthealthwidget, docs_prd_lhak_dashboard_widget, claude_lhak_dashboard_widget_stale_gotcha [INFERRED 0.85]
- **PRD Suggested Build Order Realized as the Ticket Dependency Chain** — docs_prd_suggested_build_order, tickets_scaffold_plugin, tickets_domain_types_vault_reader, tickets_domain_core, tickets_dashboard_itemview [EXTRACTED 1.00]

## Communities (103 total, 85 thin omitted)

### Community 0 - "Chart Rendering"
Cohesion: 0.10
Nodes (48): pairByPartner(), MarkerStatusInfo, columnForConcern(), CONCERN_CONFIG, ConcernConfig, iconNameForConcern(), labelForConcern(), attentionReason() (+40 more)

### Community 1 - "Planner Backlog Logic"
Cohesion: 0.14
Nodes (28): PRIORITY_RANK, CandidateStatus, Direction, MarkerRange, PersonSex, PlanNote, Priority, ProfileNote (+20 more)

### Community 2 - "Visit Entry Validation"
Cohesion: 0.11
Nodes (26): convert(), isSoftWarn(), buildPreSaveSummary(), buildVisitValues(), checkDuplicateMarkerId(), evaluateNumericField(), evaluateQualitativeField(), evaluateVisitFields() (+18 more)

### Community 3 - "Concern Grouping & Registry"
Cohesion: 0.08
Nodes (11): parseAllergies(), validateProfileInput(), renderDragReorderList(), IconSuggest, stripLucidePrefix(), ConcernSection, saveOrder(), SettingsSectionContext (+3 more)

### Community 4 - "Bases View & Dashboard Model"
Cohesion: 0.12
Nodes (24): HealthBasesView, ageAt(), arrowTone(), buildConcernGroups(), buildSeries(), computeDashboardModel(), deriveArrow(), deriveStatus() (+16 more)

### Community 5 - "Health Widget (main.ts side)"
Cohesion: 0.28
Nodes (13): HealthWidgetHandle, HealthWidgetOptions, buildChip(), buildHeader(), buildHeart(), buildInlineIcon(), buildList(), buildListRow() (+5 more)

### Community 6 - "Plugin Lifecycle & Views"
Cohesion: 0.12
Nodes (3): HealthView, HealthPlugin, HealthSettingTab

### Community 7 - "Package Dependencies"
Cohesion: 0.08
Nodes (24): builtin-modules, esbuild, obsidian, description, devDependencies, builtin-modules, esbuild, obsidian (+16 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): DOM, ES2020, node, src/**/*.ts, compilerOptions, baseUrl, esModuleInterop, isolatedModules (+11 more)

### Community 9 - "Vault Reader/Writer"
Cohesion: 0.15
Nodes (26): normalizeConcernKey(), buildVisitFrontmatter(), MarkerKind, DEFAULT_SETTINGS, HealthPluginSettings, renameConcernInSettings(), DEFAULT_VAULT_PATHS, filesUnder() (+18 more)

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
Cohesion: 0.16
Nodes (11): computePlannerBacklog(), latestPlanNote(), priorityRank(), HealthPlannerView, buildBacklog(), buildBacklogRow(), buildHeader(), buildPlanSection() (+3 more)

### Community 41 - "PRD Out of Scope"
Cohesion: 0.15
Nodes (12): Architecture reviews, Data authoring gotcha, Obsidian button styling gotcha, obsidian-health, Obsidian metadataCache write-lag gotcha, Obsidian settings tab gotcha, Obsidian vault ordering gotcha, Obsidian view rendering gotcha (+4 more)

### Community 43 - "PRD Problem Statement"
Cohesion: 0.44
Nodes (11): ResolvedRange, buildBandRect(), buildHistoryChart(), buildSecondaryPath(), buildSparkline(), HistoryChartOptions, numericPoints(), paddedDomain() (+3 more)

## Knowledge Gaps
- **122 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **85 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MarkerNote` connect `Visit Entry Validation` to `Chart Rendering`, `Planner Backlog Logic`, `Concern Grouping & Registry`, `Bases View & Dashboard Model`, `Vault Reader/Writer`, `Icon Suggest Component`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `VaultSnapshot` connect `Concern Grouping & Registry` to `Planner Backlog Logic`, `Visit Entry Validation`, `Health Widget (main.ts side)`, `Plugin Lifecycle & Views`, `Vault Reader/Writer`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `HealthPlugin` connect `Plugin Lifecycle & Views` to `Chart Rendering`, `Concern Grouping & Registry`, `Bases View & Dashboard Model`, `Health Widget (main.ts side)`, `Vault Reader/Writer`, `Icon Suggest Component`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chart Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.09545454545454546 - nodes in this community are weakly interconnected._
- **Should `Planner Backlog Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.1350806451612903 - nodes in this community are weakly interconnected._
- **Should `Visit Entry Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.1072463768115942 - nodes in this community are weakly interconnected._
# Graph Report - .  (2026-08-05)

## Corpus Check
- Corpus is ~22,284 words - fits in a single context window. You may not need a graph.

## Summary
- 467 nodes · 1038 edges · 47 communities (21 shown, 26 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.82)
- Token cost: 0 input · 103,203 output

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
- `processFrontMatter Full Block Reserialization Behavior` --semantically_similar_to--> `Historical Migration (Done & Verified Against Obsidian's Parser)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/PRD.md
- `metadataCache Write-Lag After processFrontMatter Gotcha` --semantically_similar_to--> `Historical Migration (Done & Verified Against Obsidian's Parser)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/PRD.md
- `fake-app.ts In-Memory Obsidian App Test Fixture` --conceptually_related_to--> `Ticket: Domain Types + Vault Reader`  [INFERRED]
  CLAUDE.md → tickets.md
- `lhak-dashboard Widget Stale DOM Instance Gotcha` --conceptually_related_to--> `lhak-dashboard Widget (Chip/List Tiers)`  [INFERRED]
  CLAUDE.md → docs/PRD.md
- `data.json Mid-Test Autosave Gotcha` --conceptually_related_to--> `Settings Boundary Decision (app prefs vs note meaning)`  [INFERRED]
  CLAUDE.md → docs/PRD.md

## Import Cycles
- 3-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-context.ts -> src/main.ts`
- 4-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-concern-section.ts -> src/settings-context.ts -> src/main.ts`
- 4-file cycle: `src/main.ts -> src/settings-tab.ts -> src/settings-profile-section.ts -> src/settings-context.ts -> src/main.ts`

## Hyperedges (group relationships)
- **Four Frontmatter-First Note Kinds Forming the Vault Schema** — docs_prd_note_kinds, docs_prd_visit_note, docs_prd_marker_note, docs_prd_profile_note, docs_prd_plan_note [EXTRACTED 1.00]
- **mountX Host-Handshake Pattern and Its Health-Plugin Instantiations** — claude_mountx_handshake_pattern, docs_prd_mounthealthwidget, docs_prd_lhak_dashboard_widget, claude_lhak_dashboard_widget_stale_gotcha [INFERRED 0.85]
- **PRD Suggested Build Order Realized as the Ticket Dependency Chain** — docs_prd_suggested_build_order, tickets_scaffold_plugin, tickets_domain_types_vault_reader, tickets_domain_core, tickets_dashboard_itemview [EXTRACTED 1.00]

## Communities (47 total, 26 thin omitted)

### Community 0 - "Chart Rendering"
Cohesion: 0.10
Nodes (51): pairByPartner(), MarkerStatusInfo, buildBandRect(), buildHistoryChart(), buildSecondaryPath(), buildSparkline(), HistoryChartOptions, numericPoints() (+43 more)

### Community 1 - "Planner Backlog Logic"
Cohesion: 0.08
Nodes (36): computePlannerBacklog(), latestPlanNote(), PRIORITY_RANK, priorityRank(), CandidateStatus, Direction, MarkerRange, PlanNote (+28 more)

### Community 2 - "Visit Entry Validation"
Cohesion: 0.10
Nodes (27): convert(), isSoftWarn(), buildPreSaveSummary(), buildVisitValues(), checkDuplicateMarkerId(), evaluateNumericField(), evaluateQualitativeField(), evaluateVisitFields() (+19 more)

### Community 3 - "Concern Grouping & Registry"
Cohesion: 0.10
Nodes (18): buildConcernGroups(), groupByConcern(), normalizeConcernKey(), parseAllergies(), validateProfileInput(), PersonSex, ProfileNote, CONCERN_CONFIG (+10 more)

### Community 4 - "Bases View & Dashboard Model"
Cohesion: 0.12
Nodes (25): HealthBasesView, ageAt(), arrowTone(), buildSeries(), computeDashboardModel(), deriveArrow(), deriveStatus(), rangeScore() (+17 more)

### Community 5 - "Health Widget (main.ts side)"
Cohesion: 0.12
Nodes (18): HealthWidgetHandle, HealthWidgetOptions, iconFor(), buildChip(), buildHeader(), buildHeart(), buildInlineIcon(), buildList() (+10 more)

### Community 6 - "Plugin Lifecycle & Views"
Cohesion: 0.12
Nodes (3): HealthPlugin, HealthSettingTab, HealthView

### Community 7 - "Package Dependencies"
Cohesion: 0.08
Nodes (24): builtin-modules, esbuild, obsidian, description, devDependencies, builtin-modules, esbuild, obsidian (+16 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): DOM, ES2020, node, src/**/*.ts, compilerOptions, baseUrl, esModuleInterop, isolatedModules (+11 more)

### Community 9 - "Vault Reader/Writer"
Cohesion: 0.19
Nodes (19): buildVisitFrontmatter(), MarkerKind, renameConcernInSettings(), collect(), filesUnder(), ensureFolder(), findMarkerFile(), findProfileFile() (+11 more)

### Community 10 - "Frontmatter & Cache Write-Lag Gotchas"
Cohesion: 0.27
Nodes (10): data.json Mid-Test Autosave Gotcha, Frontmatter Special-Character Quoting Gotcha, metadataCache Write-Lag After processFrontMatter Gotcha, processFrontMatter Full Block Reserialization Behavior, real-vault.ts Fixture Limitation (Blood Count Bug), Concern Registry (glossary term), Build Follow-ups From Migration (data hand-refinement), Historical Migration (Done & Verified Against Obsidian's Parser) (+2 more)

### Community 11 - "Concern/Panel Axes & Multi-Profile"
Cohesion: 0.20
Nodes (10): Panel vs Concern Independent Axes Note, getMarkdownFiles() Arbitrary Order Gotcha, Concern (glossary term), Panel (glossary term), Add Lab Visit Data Entry Pipeline, Flagging & Arrows Logic (status precedence, deadband), Multi-Profile Support (self + spouse), Ticket: Add Lab Visit Modal (Create-or-Edit) (+2 more)

### Community 12 - "Domain Core & Test Fixtures"
Cohesion: 0.22
Nodes (9): fake-app.ts In-Memory Obsidian App Test Fixture, ItemView contentEl Padding Override Gotcha, Adapter (glossary term), Domain Core (glossary term), computeDashboardModel Domain Core Function, Design Assets / Mockups (visual source of truth), Overall Architecture: Domain Core + Thin Adapters, Testing Decisions (domain core external behavior) (+1 more)

### Community 13 - "lhak-dashboard Widget Host Integration"
Cohesion: 0.32
Nodes (8): CSS zoom Property for Widget Scaling, Host-Owns-Styling Rule for Mounted Widgets, --hlth-* CSS Token Scoping Gotcha, lhak-dashboard Widget Stale DOM Instance Gotcha, mountX(container, opts) -> handle{destroy} Host Handshake Pattern, lhak-dashboard Widget (Chip/List Tiers), mountHealthWidget Entry Point, Ticket: lhak-dashboard Widget

### Community 14 - "Marker/Visit Note Schema"
Cohesion: 0.25
Nodes (8): New Marker Note Defaults Gotcha (curated/direction), Marker (glossary term), Visit (glossary term), Marker Note (schema), Note Kinds Schema (frontmatter-first), Plan Note (schema), Visit Note (schema), Ticket: Domain Types + Vault Reader

### Community 15 - "Plugin Manifest"
Cohesion: 0.25
Nodes (7): author, description, id, isDesktopOnly, minAppVersion, name, version

### Community 16 - "Settings Tab Architecture"
Cohesion: 0.29
Nodes (7): obsidian npm Package Types-Only Gotcha, app.setting.open() Circular JSON Serialization Error, Scripting the Settings Tab via eval, SettingsDirtyTracker Class (settings-dirty-tracker.ts), Profile (glossary term), Profile Note (schema), Ticket: Settings Tab + Profile Add/Edit

### Community 18 - "Planner/Bases View Build Order"
Cohesion: 0.33
Nodes (6): health: Command IDs (open-health-dashboard, open-health-planner, add-lab-visit), Planner Surface (candidate markers backlog), Health Dashboard Plugin Solution, Suggested Build Order, Ticket: Planner Surface + Bases View, Ticket: Scaffold Plugin + Core Test Runner

### Community 19 - "Settings Section Pattern & Drag-Drop Testing"
Cohesion: 0.40
Nodes (5): Testing Drag-and-Drop via Real DataTransfer Events, IconSuggest Component (src/render/icon-suggest.ts), PluginSettingTab setting-group/setting-items Structure Pattern, Setting onChange/blur Deferral Pattern, SettingsSectionContext + Stateful Section-Class Pattern

## Knowledge Gaps
- **65 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MarkerNote` connect `Visit Entry Validation` to `Chart Rendering`, `Planner Backlog Logic`, `Concern Grouping & Registry`, `Bases View & Dashboard Model`, `Vault Reader/Writer`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `VaultSnapshot` connect `Concern Grouping & Registry` to `Planner Backlog Logic`, `Visit Entry Validation`, `Health Widget (main.ts side)`, `Plugin Lifecycle & Views`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `HealthSettingTab` connect `Plugin Lifecycle & Views` to `Concern Grouping & Registry`, `Health Widget (main.ts side)`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chart Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.09711779448621553 - nodes in this community are weakly interconnected._
- **Should `Planner Backlog Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.08163265306122448 - nodes in this community are weakly interconnected._
- **Should `Visit Entry Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.10453283996299723 - nodes in this community are weakly interconnected._
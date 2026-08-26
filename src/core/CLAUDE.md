# Domain model conventions (src/core)

- Marker `panel` (drives the Add Visit form's grouping, mirroring the physical lab report's
  sections) and `concern` (drives dashboard column grouping, clinical/thematic) are
  intentionally separate axes over the same markers. Do not collapse them.
- `MarkerNote.baseOrder` (Base-table column sequencing, `base-views.ts`) is a separate axis
  from `MarkerNote.order` (dashboard curated-row + visit-editor field sequencing) — checked
  real vault data before assuming reuse was safe: Kidney's `order` values reflect attention
  priority (`uric_acid` first), not the lab-report column sequence (`creatinine` first).
  Don't collapse them.
- `MarkerNote.sex` (`m`/`f`, optional — unset means everyone) restricts whether a marker shows
  at all, filtered in `computeDashboardModel` and the visit editor's `buildFields`. Separate
  axis from `ranges[].sex`, which only picks which reference band resolves for a marker every
  profile still sees.
- When a marker field gains a per-profile resolved counterpart (global field + `resolve*()` +
  profile override, e.g. `optimalLow`/`optimalHigh` → `resolveTarget`/`ProfileNote.targets`),
  grep every reader of the old field before shipping — TypeScript won't catch one still
  reading `marker.optimalHigh` directly, since both are same-shaped numbers. Missed this in
  `format.ts`'s `formatTargetText`; code review caught it, not tsc or tests. A marker's
  body/blurb (tooltip prose) is a separate read path from the resolved target — it can keep a
  stale hardcoded number even after every code reader of the old field is fixed, since it's
  prose, not a TS reader `grep` would catch.
- New marker notes default to `curated: false` (hidden until "Show all") and no `direction`
  (neutral gray trend arrow) unless set explicitly — easy to forget both when authoring.
- A marker's `type:` (numeric vs qualitative) must match how the source lab actually reports
  it, not just the assay's nominal capability — `uro_ubg` was scaffolded `numeric` but this
  user's lab (dipstick, not quantitative) always reports it as text ("Normal"), which
  hard-blocked saving until retyped `qualitative`. Check real recorded values before trusting
  a newly-scaffolded marker's `type:`.
- A lab report's own red/"out of range" flagging doesn't always mean "needs attention" here —
  for a `higher_better` marker with only a floor (`ranges[].low`, e.g. an antibody titer like
  `hbsab`), the reference interval's low bound is often the *protective* threshold, so
  clearing it is the good outcome even though the report flags it red for being "outside the
  interval." Don't mirror the report's literal flagging without checking which direction is
  actually clinically better.
- Visit values are stored raw-as-reported (not canonical) with unit noted in a `<id>_unit`
  sibling key on `VisitNote.values`; conversion to canonical happens read-time in
  `dashboard.ts`'s `buildSeries`/`toCanonicalReading`. Don't reintroduce write-time conversion.
- A paired marker's `pair:` frontmatter is a shared group key (e.g. both twins carry
  `pair: bp`), not the partner's `id` — `pairByPartner` (`entry.ts`) matches on equal `pair`
  values, not an id-to-pair-id lookup. Get this backwards in a test fixture and the pair
  silently splits into two solo rows instead of failing loudly.
- `fixtures/real-vault.ts` is a small anonymized sample, **not** the full vault. Before
  hardcoding a lookup keyed on frontmatter values (e.g. `concern` ids), enumerate the real
  values from `09 about-me/markers/*.md` — the fixture alone missed the literal `Blood Count`
  concern and broke column placement for that whole group.

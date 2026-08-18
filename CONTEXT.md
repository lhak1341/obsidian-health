# Health

Obsidian plugin that derives a lab-result dashboard, entry form, and glance widget from
frontmatter-first notes. Notes are the single source of truth; everything else is computed on read.

## Language

**Marker**:
A trackable health metric (e.g. ALT, LDL, systolic BP), stored as its own note. Carries two
independent grouping axes: panel and concern.

**Visit**:
One lab report for one person on one date. Holds raw values only — arrows, flags, and status are
never stored, always derived.

**Profile**:
A tracked person (sex, date of birth, blood type, allergies). Reference ranges resolve against the
active profile's sex.

**Concern**:
The clinical grouping axis (e.g. liver, lipids, cbc) that drives dashboard column grouping and a
group's worst-member status dot.
_Avoid_: category, tag (for marker.concern)

**Panel**:
The grouping axis that mirrors the physical lab report's sections, driving the entry form's layout.
Distinct from concern — same marker, two independent groupings for two different surfaces.

**Domain core**:
The pure, Obsidian-free derivation layer (`computeDashboardModel` and its helpers) that turns
markers, visits, and a profile into statuses, arrows, and concern groups. The single seam this
project unit-tests.
_Avoid_: business logic, service layer

**Adapter**:
A thin Obsidian-facing wrapper around the domain core — vault scanning, `ItemView` rendering, the
visit editor view, the registered Bases view, the widget mount point. Intentionally not unit-tested;
correctness comes from keeping logic out of adapters and in the domain core.

**Concern registry**:
The static, Obsidian-free config mapping each known concern to its default icon and dashboard
column. The one inventory of known concerns — column placement is a deliberately-stable editorial
pin, not derived from health data, so it lives beside the icon lookup rather than in the domain core.

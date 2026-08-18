# Curated view's lane layout is a generic weight-based packer, not the pinned-column system

`concern-registry.ts` documents column placement as "a deliberately-stable pin, not derived data"
(vitals/cardiometabolic/cancer/immunity always left, CBC/blood always center, everything else
right), and `tier-lanes.ts`'s `WIDE_LANES`/`MEDIUM_LANES`/`NARROW_LANES` hand-tune each tier's lane
composition around that pin (e.g. Medium gives CBC/Blood its own lane specifically because it's
"by far the longest single group"). That assumption breaks once Curated view can legitimately hide
an entire pinned column's worth of groups (a user who curates nothing under CBC/Blood): the earlier
`curatedWideLanes` patch relocated individually-empty groups out of their pinned column, but left
the vacated lane rendering as genuine dead space when *every* group pinned to it was empty.

Decided to replace the pinned-column system with a single generic packer for Curated view only,
reused across all three tiers (wide = 3 lanes, medium = 2, narrow = 1): partition concern groups
into non-empty (has a visible row) and empty (fully hidden, header-only), each kept in
attention-rank order. The non-empty partition is greedy-assigned, one group at a time, to whichever
lane currently holds the least total weight (weight = 1 header unit + visible-row count), ties
going to the lowest lane index for determinism. The empty partition skips that balance entirely --
every empty group always lands in the last lane, appended after whatever non-empty content the
balance pass put there, so "nothing curated here" groups collect in one place (the rightmost lane)
instead of scattering wherever the weight balance happens to have room. Show all keeps
`WIDE_LANES`/`MEDIUM_LANES`/`NARROW_LANES` and the pinned-column identity exactly as before -- that
view never hides anything, so the imbalance this ADR fixes doesn't occur there, and the pin's
spatial-memory value (vitals is always top-left) still holds when everything's visible.

**Consequence:** greedy-by-attention-rank is not optimal bin-packing (true LPT scheduling would
sort by weight descending for the tightest balance guarantee); attention-rank was kept as the sort
key anyway so "most urgent surfaces first" stays consistent with the rest of the dashboard (the
attention bar, group ordering elsewhere). Slightly uneven lane heights are an accepted trade-off
for that consistency.

**Amendment 1 -- pre-charge the last lane before balancing.** The first cut balanced the non-empty
partition across all lanes with each lane starting at weight 0, *then* appended the whole empty
partition to the last lane afterward. That let the balance loop route non-empty groups onto the
last lane as if it were staying just as light as the others, when it was always going to receive
the entire empty partition on top -- observed in practice as one 5-marker group, one 1-marker group,
and one 4-marker group plus 5 empty groups landing in 3 lanes weighted 6/2/10. Fixed by pre-charging
the last lane's weight with the empty partition's total *before* the non-empty balance loop runs, so
the loop already accounts for the load it's guaranteed to carry.

**Amendment 2 -- pin Vitals to lane 0.** Even with weight balanced, Vitals could land in any lane
depending on where the balance put it, losing the "Vitals is always top-left" spatial memory Show
all still has via the pinned-column system. `packLanes` takes an optional `pinFirst` concern id;
when given, that concern is seated first in lane 0 unconditionally (winning even if it's the empty
one), and the remaining non-empty/empty partitions balance around it. Only Vitals uses this today
(wired from `dashboard-view.ts`'s three curated `packLanes` calls) -- not a mechanism for pinning
multiple concerns.

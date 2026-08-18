import type { ConcernGroup } from "../core/model";
import { columnForConcern, mediumLaneGroupForConcern, orderForConcern } from "./concern-registry";

export interface Segment {
	include: (concern: string) => boolean;
	fixedOrder: boolean;
}

/** A concern group's attention rank -- the best (lowest) rank among its markers, so an urgent
 *  marker pulls its whole group up. Feeds the `sorted` input every lane table (WIDE_LANES,
 *  MEDIUM_LANES, NARROW_LANES, packLanes) expects. */
export function groupRank(group: ConcernGroup, rankIndex: Map<string, number>): number {
	return Math.min(...group.markers.map((info) => rankIndex.get(info.marker.id) ?? Number.POSITIVE_INFINITY));
}

const isCol = (column: 0 | 1 | 2) => (concern: string) => columnForConcern(concern) === column;
const isCol0 = isCol(0);
const isCol1 = isCol(1);
const isCol2 = isCol(2);
const isMediumLaneGroup = (group: 0 | 1) => (concern: string) => mediumLaneGroupForConcern(concern) === group;

/** Resolves one lane's ordered concern-group list. Each segment filters `sorted` by `include`,
 *  then either sorts by the concern registry's `order` (a fixed editorial sequence -- an urgent
 *  Cancer marker shouldn't reorder Vitals/Cardiometabolic/Cancer/Immunity relative to each other)
 *  or keeps `sorted`'s incoming attention-rank order as-is. A lane's segments concatenate in
 *  sequence, so one lane can mix a fixed-order block with a rank-ordered one (see MEDIUM_LANES). */
export function resolveLane(sorted: ConcernGroup[], segments: Segment[]): ConcernGroup[] {
	return segments.flatMap((segment) => {
		const matches = sorted.filter((group) => segment.include(group.concern));
		return segment.fixedOrder ? matches.sort((a, b) => orderForConcern(a.concern) - orderForConcern(b.concern)) : matches;
	});
}

/** Wide tier: 3 lanes, the CLAUDE.md-pinned left/center/right split. Center/right stay in
 *  attention-rank order; only the left lane (Vitals/Cardiometabolic/Cancer/Immunity) has a fixed
 *  sequence. */
export const WIDE_LANES: Segment[][] = [
	[{ include: isCol0, fixedOrder: true }],
	[{ include: isCol1, fixedOrder: false }],
	[{ include: isCol2, fixedOrder: false }],
];

/** Curated view's lane assignment for all 3 tiers -- see docs/adr/0003. Replaces the pinned-column
 *  system entirely (Show all keeps WIDE_LANES/MEDIUM_LANES/NARROW_LANES): `sorted` is already
 *  attention-rank ordered, so partitioning it into non-empty/empty by a simple filter (rather than
 *  re-sorting) preserves that rank order within each partition for free.
 *
 *  `pinFirst`, when given, always seats that one concern (Vitals, from the caller) first in lane 0 --
 *  win or lose the weight balance below, and even if it happens to be empty itself (the pin beats
 *  the "empties go last" rule, not the other way round).
 *
 *  The last lane is pre-charged with the empty partition's total weight *before* the balance loop
 *  runs, even though the empty groups themselves aren't appended until the very end. Without this,
 *  the loop treats the last lane as if it'll stay as light as the others while it's actually
 *  guaranteed to receive the entire empty partition on top afterwards -- so it keeps routing
 *  non-empty groups there too, and the lane ends up carrying both a full non-empty share *and* the
 *  whole empty pile. Pre-charging makes the loop already "see" that future load and route non-empty
 *  groups to the other lanes instead.
 *
 *  Everything else (pin aside) is greedy-assigned to whichever lane currently holds the least total
 *  weight (1 header unit + visible-row count), ties going to the lowest lane index. Not true LPT
 *  bin-packing (that sorts by weight descending for the tightest balance guarantee) -- attention-rank
 *  order was kept instead so "most urgent first" stays consistent with the rest of the dashboard; see
 *  the ADR's documented trade-off. */
export function packLanes(sorted: ConcernGroup[], visibleRows: ReadonlyMap<string, number>, laneCount: number, pinFirst?: string): ConcernGroup[][] {
	const weightOf = (concern: string) => 1 + (visibleRows.get(concern) ?? 0);
	const rest = pinFirst ? sorted.filter((g) => g.concern !== pinFirst) : sorted;
	const nonEmpty = rest.filter((g) => (visibleRows.get(g.concern) ?? 0) > 0);
	const empty = rest.filter((g) => (visibleRows.get(g.concern) ?? 0) === 0);

	const laneWeights = new Array<number>(laneCount).fill(0);
	const lanes: ConcernGroup[][] = Array.from({ length: laneCount }, () => []);

	const pinned = pinFirst ? sorted.find((g) => g.concern === pinFirst) : undefined;
	if (pinned) {
		lanes[0].push(pinned);
		laneWeights[0] += weightOf(pinned.concern);
	}

	laneWeights[laneCount - 1] += empty.reduce((sum, g) => sum + weightOf(g.concern), 0);

	for (const group of nonEmpty) {
		let lightest = 0;
		for (let i = 1; i < laneCount; i++) if (laneWeights[i] < laneWeights[lightest]) lightest = i;
		lanes[lightest].push(group);
		laneWeights[lightest] += weightOf(group.concern);
	}
	lanes[laneCount - 1].push(...empty);
	return lanes;
}

/** Medium tier: CBC/Blood keeps its own lane (by far the longest single group), joined there by
 *  Cancer/Immunity in fixed order after it -- leaves the other lane as just Vitals/Cardiometabolic
 *  (also fixed order) above Everything Else (attention-rank), instead of one lane carrying 4 groups
 *  against the other's 1. */
export const MEDIUM_LANES: Segment[][] = [
	[
		{ include: (c) => isCol0(c) && isMediumLaneGroup(0)(c), fixedOrder: true },
		{ include: isCol2, fixedOrder: false },
	],
	[
		{ include: isCol1, fixedOrder: false },
		{ include: (c) => isCol0(c) && isMediumLaneGroup(1)(c), fixedOrder: true },
	],
];

/** Narrow tier is one lane, but must still read as 3 stacked pinned blocks (left, then center,
 *  then right), not flat attention-rank order across every group, which would interleave the 3
 *  pinned columns together. The first block uses the same fixed sequence as the other two tiers. */
export const NARROW_LANES: Segment[][] = [
	[
		{ include: isCol0, fixedOrder: true },
		{ include: isCol1, fixedOrder: false },
		{ include: isCol2, fixedOrder: false },
	],
];

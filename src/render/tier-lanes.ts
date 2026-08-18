import type { ConcernGroup } from "../core/model";
import { columnForConcern, orderForConcern } from "./concern-registry";

export interface Segment {
	include: (concern: string) => boolean;
	fixedOrder: boolean;
}

const isCol = (column: 0 | 1 | 2) => (concern: string) => columnForConcern(concern) === column;
const isCol0 = isCol(0);
const isCol1 = isCol(1);
const isCol2 = isCol(2);
const isCancerOrImmunity = (concern: string) => concern === "cancer" || concern === "immunity";

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

/** Medium tier: CBC/Blood keeps its own lane (by far the longest single group), joined there by
 *  Cancer/Immunity in fixed order after it -- leaves the other lane as just Vitals/Cardiometabolic
 *  (also fixed order) above Everything Else (attention-rank), instead of one lane carrying 4 groups
 *  against the other's 1. */
export const MEDIUM_LANES: Segment[][] = [
	[
		{ include: (c) => isCol0(c) && !isCancerOrImmunity(c), fixedOrder: true },
		{ include: isCol2, fixedOrder: false },
	],
	[
		{ include: isCol1, fixedOrder: false },
		{ include: (c) => isCol0(c) && isCancerOrImmunity(c), fixedOrder: true },
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

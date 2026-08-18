import { describe, expect, it } from "vitest";
import type { ConcernGroup } from "../core/model";
import { MEDIUM_LANES, NARROW_LANES, packLanes, resolveLane, WIDE_LANES } from "./tier-lanes";

function group(concern: string): ConcernGroup {
	return { concern, status: "good", markers: [] };
}

// Deliberately scrambled -- not alphabetical, not column order -- to stand in for buildGroups'
// real attention-rank input and prove fixed-order lanes ignore it while rank-order lanes don't.
const sorted: ConcernGroup[] = ["kidney", "immunity", "blood", "cardiometabolic", "liver", "cancer", "vitals", "cbc"].map(group);

function concerns(groups: ConcernGroup[]): string[] {
	return groups.map((g) => g.concern);
}

describe("resolveLane / WIDE_LANES", () => {
	it("left lane: col-0 concerns in the registry's fixed order, ignoring attention-rank input order", () => {
		expect(concerns(resolveLane(sorted, WIDE_LANES[0]))).toEqual(["vitals", "cardiometabolic", "cancer", "immunity"]);
	});

	it("center lane: col-1 concerns kept in attention-rank (input) order", () => {
		expect(concerns(resolveLane(sorted, WIDE_LANES[1]))).toEqual(["blood", "cbc"]);
	});

	it("right lane: col-2 concerns kept in attention-rank (input) order", () => {
		expect(concerns(resolveLane(sorted, WIDE_LANES[2]))).toEqual(["kidney", "liver"]);
	});
});

describe("packLanes", () => {
	function rows(counts: Record<string, number>): Map<string, number> {
		return new Map(Object.entries(counts));
	}

	it("never lets an empty group (0 visible rows) land above a non-empty one, even when the empty group outranks it", () => {
		// "cancer" (empty) outranks "cbc" (non-empty) in `sorted`'s attention-rank order -- the
		// non-empty/empty partition must still win over that rank for a single lane.
		const counts = rows({ kidney: 0, immunity: 0, blood: 0, cardiometabolic: 0, liver: 0, cancer: 0, vitals: 0, cbc: 3 });
		expect(concerns(packLanes(sorted, counts, 1)[0])).toEqual([
			"cbc",
			"kidney",
			"immunity",
			"blood",
			"cardiometabolic",
			"liver",
			"cancer",
			"vitals",
		]);
	});

	it("greedy-balances the non-empty partition by weight (1 header unit + visible rows) across lanes, pre-charging the last lane with the empty total first", () => {
		// weights: kidney=6, immunity=2, blood=2, cardiometabolic=2; 4 empty groups (weight 1 each,
		// total 4) pre-charge lane 1 before the loop runs. Without that pre-charge the loop would put
		// kidney alone in lane 0 (weight 6) and everything else in lane 1, which then also receives
		// the empty total on top -- 6 vs. 10, exactly the imbalance this pre-charge fixes. With it,
		// both lanes land at weight 8.
		const counts = rows({ kidney: 5, immunity: 1, blood: 1, cardiometabolic: 1 });
		const lanes = packLanes(sorted, counts, 2);
		expect(concerns(lanes[0])).toEqual(["kidney", "blood"]);
		expect(concerns(lanes[1])).toEqual(["immunity", "cardiometabolic", "liver", "cancer", "vitals", "cbc"]);
	});

	it("breaks non-empty weight ties by lowest lane index, so assignment is deterministic", () => {
		const counts = rows({ kidney: 1, immunity: 1, blood: 1, cardiometabolic: 1 });
		const lanes = packLanes(sorted, counts, 2);
		expect(concerns(lanes[0])).toEqual(["kidney", "immunity", "blood"]);
		expect(concerns(lanes[1])).toEqual(["cardiometabolic", "liver", "cancer", "vitals", "cbc"]);
	});

	it("with laneCount 1, still just partitions non-empty-before-empty and keeps rank order within each", () => {
		const counts = rows({ kidney: 1, blood: 1 });
		expect(concerns(packLanes(sorted, counts, 1)[0])).toEqual(["kidney", "blood", "immunity", "cardiometabolic", "liver", "cancer", "vitals", "cbc"]);
	});

	it("3 lanes: a non-empty group can still land in the last lane when the balance calls for it, with the (pre-charged) empty partition appended after it, never before", () => {
		const counts = rows({ kidney: 1, immunity: 1, blood: 1, cardiometabolic: 1, liver: 1, cancer: 1, vitals: 1 });
		const lanes = packLanes(sorted, counts, 3);
		expect(concerns(lanes[0])).toEqual(["kidney", "cardiometabolic", "vitals"]);
		expect(concerns(lanes[1])).toEqual(["immunity", "liver"]);
		expect(concerns(lanes[2])).toEqual(["blood", "cancer", "cbc"]);
	});

	it("pinFirst seats that concern first in lane 0 unconditionally, and the rest balances around it -- the reported real-world case", () => {
		// Cardiometabolic (5 curated -> weight 6, ranked ahead of Kidney) then Kidney (1 -> weight 2),
		// then Vitals (4 -> weight 5, pinned to lane 0 regardless of rank), plus 5 empty groups.
		// Without a pin, greedy balance alone puts Cardiometabolic/Kidney/Vitals one per lane (6/2/5)
		// and then dumps all 5 empties on Vitals' lane -- 6/2/10, the reported bug. Pinning Vitals to
		// lane 0 and balancing Cardiometabolic + Kidney around it instead lands on 7/6/5.
		const realWorld: ConcernGroup[] = ["cardiometabolic", "kidney", "vitals", "e1", "e2", "e3", "e4", "e5"].map(group);
		const counts = rows({ cardiometabolic: 5, kidney: 1, vitals: 4 });
		const lanes = packLanes(realWorld, counts, 3, "vitals");
		expect(concerns(lanes[0])).toEqual(["vitals", "kidney"]);
		expect(concerns(lanes[1])).toEqual(["cardiometabolic"]);
		expect(concerns(lanes[2])).toEqual(["e1", "e2", "e3", "e4", "e5"]);
	});

	it("pinFirst wins over the empty partition -- an empty pinned concern still seats top of lane 0, not in the empty pile", () => {
		const counts = rows({ kidney: 1 });
		const lanes = packLanes(sorted, counts, 3, "vitals");
		expect(concerns(lanes[0])).toEqual(["vitals"]);
		expect(concerns(lanes[1])).toEqual(["kidney"]);
		expect(concerns(lanes[2])).toEqual(["immunity", "blood", "cardiometabolic", "liver", "cancer", "cbc"]);
	});
});

describe("resolveLane / MEDIUM_LANES", () => {
	it("left lane: Vitals/Cardiometabolic fixed-order, then col-2 in rank order", () => {
		expect(concerns(resolveLane(sorted, MEDIUM_LANES[0]))).toEqual(["vitals", "cardiometabolic", "kidney", "liver"]);
	});

	it("right lane: col-1 in rank order, then Cancer/Immunity fixed-order", () => {
		expect(concerns(resolveLane(sorted, MEDIUM_LANES[1]))).toEqual(["blood", "cbc", "cancer", "immunity"]);
	});
});

describe("resolveLane / NARROW_LANES", () => {
	it("single lane: col-0 fixed-order, then col-1 rank-order, then col-2 rank-order, stacked", () => {
		expect(concerns(resolveLane(sorted, NARROW_LANES[0]))).toEqual([
			"vitals",
			"cardiometabolic",
			"cancer",
			"immunity",
			"blood",
			"cbc",
			"kidney",
			"liver",
		]);
	});
});

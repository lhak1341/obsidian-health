import { describe, expect, it } from "vitest";
import type { ConcernGroup } from "../core/model";
import { MEDIUM_LANES, NARROW_LANES, resolveLane, WIDE_LANES } from "./tier-lanes";

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

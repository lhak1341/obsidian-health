import { describe, expect, it } from "vitest";
import { isNormalValue, markerAppliesToSex, normalValues } from "./marker";
import type { MarkerNote } from "./types";

function marker(overrides: Partial<MarkerNote> = {}): MarkerNote {
	return {
		id: "m",
		name: "M",
		aliases: [],
		type: "qualitative",
		panel: "urine",
		concern: [],
		curated: false,
		blurb: "",
		...overrides,
	};
}

describe("normalValues", () => {
	it("wraps a single string in a list", () => {
		expect(normalValues(marker({ normal: "Negative" }))).toEqual(["Negative"]);
	});

	it("returns a list as-is", () => {
		expect(normalValues(marker({ normal: ["Normal", "Trace"] }))).toEqual(["Normal", "Trace"]);
	});

	it("returns an empty list when unset", () => {
		expect(normalValues(marker())).toEqual([]);
	});

	it("returns an empty list for an empty list", () => {
		expect(normalValues(marker({ normal: [] }))).toEqual([]);
	});
});

describe("isNormalValue", () => {
	it("is true for a listed value", () => {
		expect(isNormalValue(marker({ normal: ["Normal", "Trace"] }), "Trace")).toBe(true);
	});

	it("is false for an unlisted value", () => {
		expect(isNormalValue(marker({ normal: "Negative" }), "2+")).toBe(false);
	});

	it("compares a numeric reading as its string form", () => {
		expect(isNormalValue(marker({ normal: ["0"] }), 0)).toBe(true);
	});

	it("is false for everything when no normal values are set", () => {
		expect(isNormalValue(marker(), "Negative")).toBe(false);
	});
});

describe("markerAppliesToSex", () => {
	it("applies to everyone when the marker has no sex", () => {
		expect(markerAppliesToSex(marker(), "m")).toBe(true);
		expect(markerAppliesToSex(marker(), undefined)).toBe(true);
	});

	it("applies when the marker's sex matches", () => {
		expect(markerAppliesToSex(marker({ sex: "f" }), "f")).toBe(true);
	});

	it("does not apply when the marker's sex differs", () => {
		expect(markerAppliesToSex(marker({ sex: "f" }), "m")).toBe(false);
	});

	it("does not apply a sex-restricted marker when there is no profile sex", () => {
		expect(markerAppliesToSex(marker({ sex: "f" }), undefined)).toBe(false);
	});
});

import { describe, expect, it } from "vitest";
import { bandInUnit, convert, convertTo, isToggleable, switchUnit, unitChoices } from "./units";
import type { MarkerNote } from "./types";

function marker(overrides: Partial<MarkerNote> = {}): MarkerNote {
	return {
		id: "test-marker",
		name: "Test Marker",
		aliases: [],
		type: "numeric",
		panel: "biochemical",
		concern: [],
		curated: false,
		blurb: "",
		...overrides,
	};
}

const dualUnit = marker({ unit: "mmol/L", altUnit: "mg/dL", altFactor: 0.0555 });
// `alt_unit` set but `alt_factor` missing -- hand-authored notes can end up like this.
const altWithoutFactor = marker({ unit: "mmol/L", altUnit: "mg/dL" });

describe("convert", () => {
	it("passes the value through unchanged when already in the canonical unit", () => {
		const m = marker({ unit: "U/L" });

		expect(convert(10, "U/L", m)).toBe(10);
	});

	it("converts an alt-unit value to canonical via alt_factor", () => {
		expect(convert(100, "mg/dL", dualUnit)).toBeCloseTo(5.55);
	});

	it("throws for a unit the marker doesn't know", () => {
		const m = marker({ unit: "mmol/L" });

		expect(() => convert(100, "furlongs", m)).toThrow();
	});
});

describe("convertTo", () => {
	it("passes the value through unchanged when targeting the canonical unit", () => {
		const m = marker({ unit: "U/L" });

		expect(convertTo(10, "U/L", m)).toBe(10);
	});

	it("converts a canonical value to the alt unit -- inverse of convert", () => {
		expect(convertTo(5.55, "mg/dL", dualUnit)).toBeCloseTo(100);
		expect(convertTo(convert(100, "mg/dL", dualUnit), "mg/dL", dualUnit)).toBeCloseTo(100);
	});

	it("throws for a unit the marker doesn't know", () => {
		const m = marker({ unit: "mmol/L" });

		expect(() => convertTo(100, "furlongs", m)).toThrow();
	});
});

describe("isToggleable", () => {
	it("is true when both alt_unit and alt_factor are set", () => {
		expect(isToggleable(dualUnit)).toBe(true);
	});

	it("is false when either is missing", () => {
		expect(isToggleable(marker())).toBe(false);
		expect(isToggleable(altWithoutFactor)).toBe(false);
	});
});

describe("unitChoices", () => {
	it("offers only the canonical unit for a single-unit marker", () => {
		expect(unitChoices(marker({ unit: "U/L" }))).toEqual(["U/L"]);
	});

	it("offers canonical first, then the alt unit, for a dual-unit marker", () => {
		expect(unitChoices(dualUnit)).toEqual(["mmol/L", "mg/dL"]);
	});

	it("never offers an alt unit that has no alt_factor to convert with", () => {
		expect(unitChoices(altWithoutFactor)).toEqual(["mmol/L"]);
	});

	it("offers nothing for a unitless marker", () => {
		expect(unitChoices(marker())).toEqual([]);
	});
});

describe("switchUnit", () => {
	it("re-expresses a typed value in the target unit, rounded to three decimals", () => {
		expect(switchUnit("100", "mg/dL", "mmol/L", dualUnit)).toBe("5.55");
		expect(switchUnit("5.55", "mmol/L", "mg/dL", dualUnit)).toBe("100");
	});

	it("leaves blank and non-numeric input unchanged", () => {
		expect(switchUnit("", "mg/dL", "mmol/L", dualUnit)).toBe("");
		expect(switchUnit("  ", "mg/dL", "mmol/L", dualUnit)).toBe("  ");
		expect(switchUnit("high", "mg/dL", "mmol/L", dualUnit)).toBe("high");
	});

	it("leaves the value unchanged instead of throwing when the from unit can't convert", () => {
		// A stale stored `<id>_unit` on a marker whose alt_factor was later removed.
		expect(switchUnit("100", "mg/dL", "mmol/L", altWithoutFactor)).toBe("100");
	});
});

describe("bandInUnit", () => {
	it("returns the band rounded but unconverted in the canonical unit", () => {
		expect(bandInUnit({ low: 3.6, high: 5.18 }, "mmol/L", dualUnit)).toEqual({ low: 3.6, high: 5.18 });
	});

	it("converts each present bound into the alt unit", () => {
		expect(bandInUnit({ low: 5.55 }, "mg/dL", dualUnit)).toEqual({ low: 100, high: undefined });
	});

	it("yields no band instead of throwing when the unit can't convert", () => {
		expect(bandInUnit({ low: 3.6, high: 5.18 }, "mg/dL", altWithoutFactor)).toEqual({});
	});
});

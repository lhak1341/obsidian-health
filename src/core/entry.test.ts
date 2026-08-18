import { describe, expect, it } from "vitest";
import {
	buildPreSaveSummary,
	buildVisitFrontmatter,
	buildVisitValues,
	checkDuplicateMarkerId,
	evaluateNumericField,
	evaluateQualitativeField,
	evaluateVisitFields,
	findVisit,
	groupMarkersByPanel,
	pairMarkerNotes,
	parseAllergies,
	unitOptions,
	validateDate,
	validateProfileInput,
	type FieldState,
} from "./entry";
import type { MarkerNote, ProfileNote, VisitNote } from "./types";

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

function visit(date: string, values: VisitNote["values"], person = "self"): VisitNote {
	return { person, date, values };
}

function profile(overrides: Partial<ProfileNote> = {}): ProfileNote {
	return { person: "self", sex: "m", ...overrides };
}

describe("groupMarkersByPanel", () => {
	it("groups markers under their panel, panels sorted alphabetically", () => {
		const groups = groupMarkersByPanel([
			marker({ id: "b", name: "B", panel: "urine" }),
			marker({ id: "a", name: "A", panel: "blood" }),
		]);

		expect(groups.map((g) => g.panel)).toEqual(["blood", "urine"]);
	});

	it("sorts markers within a panel by name", () => {
		const groups = groupMarkersByPanel([
			marker({ id: "z", name: "Zeta", panel: "blood" }),
			marker({ id: "a", name: "Alpha", panel: "blood" }),
		]);

		expect(groups[0].markers.map((m) => m.id)).toEqual(["a", "z"]);
	});
});

describe("pairMarkerNotes", () => {
	it("pairs two markers sharing a pair id, ordered by `order`", () => {
		const systolic = marker({ id: "bp_sys", name: "Systolic", pair: "bp", order: 0 });
		const diastolic = marker({ id: "bp_dia", name: "Diastolic", pair: "bp", order: 1 });

		const rows = pairMarkerNotes([diastolic, systolic]);

		expect(rows).toHaveLength(1);
		expect(rows[0].primary.id).toBe("bp_sys");
		expect(rows[0].secondary?.id).toBe("bp_dia");
	});

	it("leaves an unpaired marker as its own row", () => {
		const rows = pairMarkerNotes([marker({ id: "alt" })]);

		expect(rows).toEqual([{ primary: expect.objectContaining({ id: "alt" }) }]);
	});

	it("falls back to a solo row for a 3rd marker sharing the same pair id, instead of duplicating an already-paired one", () => {
		const a = marker({ id: "a", pair: "p" });
		const b = marker({ id: "b", pair: "p" });
		const c = marker({ id: "c", pair: "p" });

		const rows = pairMarkerNotes([a, b, c]);

		expect(rows).toHaveLength(2);
		expect(rows[0].primary.id).toBe("a");
		expect(rows[0].secondary?.id).toBe("b");
		expect(rows[1]).toEqual({ primary: expect.objectContaining({ id: "c" }) });
	});
});

describe("findVisit", () => {
	it("finds the visit matching person and date", () => {
		const visits = [visit("2024-01-01", {}), visit("2025-01-01", {})];

		expect(findVisit(visits, "self", "2025-01-01")).toBe(visits[1]);
	});

	it("returns undefined when no visit matches", () => {
		expect(findVisit([visit("2024-01-01", {})], "self", "2025-01-01")).toBeUndefined();
	});
});

describe("validateDate", () => {
	it("hard-blocks a missing date", () => {
		expect(validateDate("")).toBeDefined();
	});

	it("hard-blocks a malformed date", () => {
		expect(validateDate("not-a-date")).toBeDefined();
	});

	it("accepts a well-formed date", () => {
		expect(validateDate("2025-07-23")).toBeUndefined();
	});
});

describe("checkDuplicateMarkerId", () => {
	it("flags an id that already exists", () => {
		expect(checkDuplicateMarkerId("alt", ["alt", "ast"])).toBe(true);
	});

	it("allows an id that doesn't exist yet", () => {
		expect(checkDuplicateMarkerId("new-marker", ["alt", "ast"])).toBe(false);
	});
});

describe("evaluateNumericField", () => {
	it("omits a blank field", () => {
		const m = marker({ unit: "U/L" });
		expect(evaluateNumericField("", "U/L", m, {})).toEqual({ kind: "omitted" });
	});

	it("hard-blocks non-numeric input", () => {
		const m = marker({ unit: "U/L" });
		const result = evaluateNumericField("abc", "U/L", m, {});
		expect(result.kind).toBe("blocked");
	});

	it("keeps the raw entered value (in its entered unit), not a canonical conversion", () => {
		const m = marker({ unit: "mmol/L", altUnit: "mg/dL", altFactor: 0.0555 });
		const result = evaluateNumericField("100", "mg/dL", m, { low: 3.6, high: 5.18 });
		expect(result).toEqual({ kind: "ok", value: 100, softWarn: false });
	});

	it("still soft-warns off the canonical-converted magnitude even though the stored value stays raw", () => {
		const m = marker({ unit: "mmol/L", altUnit: "mg/dL", altFactor: 0.0555 });
		// 1000 mg/dL converts to 55.5 mmol/L, wildly outside a 3.6-5.18 band -- the raw 1000 alone
		// wouldn't trip isSoftWarn's threshold at all, so this only passes if the softWarn check
		// still converts internally despite `value` no longer doing so.
		const result = evaluateNumericField("1000", "mg/dL", m, { low: 3.6, high: 5.18 });
		expect(result).toEqual({ kind: "ok", value: 1000, softWarn: true });
	});

	it("soft-warns when the canonical value lands wildly outside the band", () => {
		const m = marker({ unit: "mmol/L" });
		const result = evaluateNumericField("300", "mmol/L", m, { low: 10, high: 50 });
		expect(result).toEqual({ kind: "ok", value: 300, softWarn: true });
	});

	it("never soft-warns on a value that is merely out of range", () => {
		const m = marker({ unit: "mmol/L" });
		const result = evaluateNumericField("55", "mmol/L", m, { low: 10, high: 50 });
		expect(result).toEqual({ kind: "ok", value: 55, softWarn: false });
	});

	it("accepts a unitless marker (e.g. pH) with an empty unit, no conversion", () => {
		const m = marker({ unit: undefined });
		const result = evaluateNumericField("7", "", m, { low: 5, high: 7.5 });
		expect(result).toEqual({ kind: "ok", value: 7, softWarn: false });
	});

	it("hard-blocks an unknown unit", () => {
		const m = marker({ unit: "mmol/L" });
		const result = evaluateNumericField("10", "furlongs", m, {});
		expect(result.kind).toBe("blocked");
	});
});

describe("evaluateQualitativeField", () => {
	it("omits a blank field", () => {
		expect(evaluateQualitativeField("  ")).toEqual({ kind: "omitted" });
	});

	it("keeps a non-blank reading", () => {
		expect(evaluateQualitativeField("Negative")).toEqual({ kind: "ok", value: "Negative", softWarn: false });
	});
});

describe("evaluateVisitFields", () => {
	function fields(entries: Record<string, FieldState>): Map<string, FieldState> {
		return new Map(Object.entries(entries));
	}

	it("skips a derived marker even when a field is present for it", () => {
		const derived = marker({ id: "bmi", type: "derived" });
		const { entries, errors } = evaluateVisitFields([derived], fields({ bmi: { raw: "22", unit: "" } }), undefined, "2025-01-01");
		expect(entries).toEqual([]);
		expect(errors).toEqual([]);
	});

	it("skips a marker with no field state entered", () => {
		const alt = marker({ id: "alt", unit: "U/L" });
		const { entries } = evaluateVisitFields([alt], fields({}), undefined, "2025-01-01");
		expect(entries).toEqual([]);
	});

	it("passes an empty band (no soft-warn) when no profile is resolved, but the profile's band when one is", () => {
		const uric = marker({ id: "uric", unit: "umol/L", ranges: [{ sex: "any", low: 1, high: 2 }] });
		const state = fields({ uric: { raw: "20", unit: "umol/L" } });

		const withoutProfile = evaluateVisitFields([uric], state, undefined, "2025-01-01");
		expect(withoutProfile.entries[0].outcome).toMatchObject({ kind: "ok", softWarn: false });

		const withProfile = evaluateVisitFields([uric], state, profile(), "2025-01-01");
		expect(withProfile.entries[0].outcome).toMatchObject({ kind: "ok", softWarn: true });
	});

	it("carries the marker's id and reason on a blocked field, alongside the date's own validation", () => {
		const alt = marker({ id: "alt", name: "ALT", unit: "U/L" });
		const { entries, errors } = evaluateVisitFields([alt], fields({ alt: { raw: "not-a-number", unit: "U/L" } }), undefined, "");

		expect(errors).toEqual([
			{ markerId: "", reason: "Date is required." },
			{ markerId: "alt", reason: '"not-a-number" is not a number.' },
		]);
		expect(entries[0].outcome).toEqual({ kind: "blocked", reason: '"not-a-number" is not a number.' });
	});
});

describe("buildVisitValues", () => {
	it("keeps only ok entries, dropping omitted and blocked ones", () => {
		const values = buildVisitValues(
			[
				{ markerId: "alt", outcome: { kind: "ok", value: 20, softWarn: false } },
				{ markerId: "ast", outcome: { kind: "omitted" } },
				{ markerId: "bad", outcome: { kind: "blocked", reason: "nope" } },
			],
			new Map(),
		);

		expect(values).toEqual({ alt: 20 });
	});

	it("writes a `<id>_unit` sibling key when the entered unit differs from the marker's canonical unit", () => {
		const uric = marker({ id: "uric_acid", unit: "umol/L", altUnit: "mg/dL", altFactor: 59.48 });
		const values = buildVisitValues(
			[{ markerId: "uric_acid", outcome: { kind: "ok", value: 345.2, softWarn: false }, unit: "mg/dL" }],
			new Map([["uric_acid", uric]]),
		);

		expect(values).toEqual({ uric_acid: 345.2, uric_acid_unit: "mg/dL" });
	});

	it("omits the `<id>_unit` sibling key when the entered unit matches the canonical unit", () => {
		const uric = marker({ id: "uric_acid", unit: "umol/L", altUnit: "mg/dL", altFactor: 59.48 });
		const values = buildVisitValues(
			[{ markerId: "uric_acid", outcome: { kind: "ok", value: 345.2, softWarn: false }, unit: "umol/L" }],
			new Map([["uric_acid", uric]]),
		);

		expect(values).toEqual({ uric_acid: 345.2 });
	});
});

describe("buildVisitFrontmatter", () => {
	it("shapes the frontmatter with type, person, date, and flat values", () => {
		expect(buildVisitFrontmatter("self", "2025-07-23", { alt: 20 })).toEqual({
			type: "lab-visit",
			person: "self",
			date: "2025-07-23",
			alt: 20,
		});
	});
});

describe("buildPreSaveSummary", () => {
	it("lists only fields that will be written, with raw text and parsed value", () => {
		const alt = marker({ id: "alt", name: "ALT", unit: "U/L" });
		const markersById = new Map([["alt", alt]]);

		const summary = buildPreSaveSummary(markersById, [
			{ markerId: "alt", raw: "20", outcome: { kind: "ok", value: 20, softWarn: false }, unit: "U/L" },
			{ markerId: "ast", raw: "", outcome: { kind: "omitted" } },
		]);

		expect(summary).toEqual([{ markerId: "alt", label: "ALT", raw: "20", value: 20, unit: "U/L", softWarn: false }]);
	});
});

describe("validateProfileInput", () => {
	it("hard-blocks a missing person id", () => {
		expect(validateProfileInput("", "m")).toBeDefined();
	});

	it("hard-blocks a sex outside m/f", () => {
		expect(validateProfileInput("self", "other")).toBeDefined();
	});

	it("accepts a well-formed profile", () => {
		expect(validateProfileInput("self", "m")).toBeUndefined();
	});
});

describe("parseAllergies", () => {
	it("splits and trims a comma-separated list", () => {
		expect(parseAllergies("penicillin, shellfish ,  dust")).toEqual(["penicillin", "shellfish", "dust"]);
	});

	it("drops empty entries from stray commas", () => {
		expect(parseAllergies("penicillin,, shellfish,")).toEqual(["penicillin", "shellfish"]);
	});

	it("returns an empty array for a blank string", () => {
		expect(parseAllergies("")).toEqual([]);
	});
});

describe("unitOptions", () => {
	it("offers only the canonical unit for a single-unit marker", () => {
		const m = marker({ unit: "U/L" });
		expect(unitOptions(m)).toEqual([{ value: "U/L", label: "U/L" }]);
	});

	it("offers both units for a dual-unit marker", () => {
		const m = marker({ unit: "mmol/L", altUnit: "mg/dL", altFactor: 0.0555 });
		expect(unitOptions(m)).toEqual([
			{ value: "mmol/L", label: "mmol/L" },
			{ value: "mg/dL", label: "mg/dL" },
		]);
	});
});

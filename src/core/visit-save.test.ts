import { describe, expect, it } from "vitest";
import type { FieldState } from "./entry";
import type { MarkerNote, ProfileNote } from "./types";
import { isVisitFormMarker, planVisitSave, type VisitForm } from "./visit-save";

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

function profile(overrides: Partial<ProfileNote> = {}): ProfileNote {
	return { person: "self", sex: "m", ...overrides };
}

function form(fields: Record<string, FieldState>, overrides: Partial<VisitForm> = {}): VisitForm {
	return { person: "self", date: "2025-01-01", facility: "", fields: new Map(Object.entries(fields)), ...overrides };
}

const alt = marker({ id: "alt", name: "ALT", unit: "U/L" });
const uric = marker({ id: "uric_acid", name: "Uric Acid", unit: "umol/L", altUnit: "mg/dL", altFactor: 59.48 });

describe("isVisitFormMarker", () => {
	it("excludes derived markers", () => {
		expect(isVisitFormMarker(marker({ type: "derived" }), profile())).toBe(false);
	});

	it("excludes a marker restricted to the other sex, and every sex-restricted one without a profile", () => {
		expect(isVisitFormMarker(marker({ sex: "f" }), profile({ sex: "m" }))).toBe(false);
		expect(isVisitFormMarker(marker({ sex: "f" }), profile({ sex: "f" }))).toBe(true);
		expect(isVisitFormMarker(marker({ sex: "f" }), undefined)).toBe(false);
	});
});

describe("planVisitSave", () => {
	it("sets type, person, date, facility and the entered values", () => {
		const plan = planVisitSave(form({ alt: { raw: "20", unit: "U/L" } }, { facility: "  Lab  " }), [alt], profile());

		expect(plan).toMatchObject({ ok: true, patch: { set: { type: "lab-visit", person: "self", date: "2025-01-01", facility: "Lab", alt: 20 } } });
	});

	it("removes every owned key the form leaves blank -- value, _unit sibling, facility", () => {
		const ast = marker({ id: "ast", name: "AST", unit: "U/L" });
		const plan = planVisitSave(form({ alt: { raw: "20", unit: "U/L" }, ast: { raw: "  ", unit: "U/L" } }), [alt, ast, uric], profile());

		expect(plan.ok && plan.patch.remove.sort()).toEqual(["alt_unit", "ast", "ast_unit", "facility", "uric_acid", "uric_acid_unit"]);
	});

	it("treats a marker with no field state as blank", () => {
		const plan = planVisitSave(form({}), [alt], profile());

		expect(plan).toMatchObject({ ok: true, patch: { remove: expect.arrayContaining(["alt"]) } });
		expect(plan.ok && "alt" in plan.patch.set).toBe(false);
	});

	it("never sets or removes a key for a marker the form doesn't show", () => {
		const bmi = marker({ id: "bmi", type: "derived" });
		const fsh = marker({ id: "fsh", name: "FSH", unit: "IU/L", sex: "f" });
		const plan = planVisitSave(form({ bmi: { raw: "22", unit: "" }, fsh: { raw: "5", unit: "IU/L" } }), [bmi, fsh], profile({ sex: "m" }));

		if (!plan.ok) throw new Error("expected ok");
		for (const key of ["bmi", "bmi_unit", "fsh", "fsh_unit"]) {
			expect(key in plan.patch.set).toBe(false);
			expect(plan.patch.remove).not.toContain(key);
		}
	});

	it("writes a `<id>_unit` sibling only when the entered unit differs from the canonical one", () => {
		const inAlt = planVisitSave(form({ uric_acid: { raw: "5.8", unit: "mg/dL" } }), [uric], profile());
		const inCanonical = planVisitSave(form({ uric_acid: { raw: "345.2", unit: "umol/L" } }), [uric], profile());

		expect(inAlt).toMatchObject({ ok: true, patch: { set: { uric_acid: 5.8, uric_acid_unit: "mg/dL" } } });
		expect(inCanonical.ok && inCanonical.patch.set).not.toHaveProperty("uric_acid_unit");
		expect(inCanonical.ok && inCanonical.patch.remove).toContain("uric_acid_unit");
	});

	it("blocks with the date error and each blocked field's error, named by marker", () => {
		const plan = planVisitSave(form({ alt: { raw: "not-a-number", unit: "U/L" } }, { date: "" }), [alt], profile());

		expect(plan).toEqual({ ok: false, errors: ["Date is required.", 'ALT: "not-a-number" is not a number.'] });
	});

	it("soft-warns against the profile's band, and not without a profile", () => {
		const banded = marker({ id: "uric", name: "Uric", unit: "umol/L", ranges: [{ sex: "any", low: 1, high: 2 }] });
		const fields = { uric: { raw: "20", unit: "umol/L" } };

		expect(planVisitSave(form(fields), [banded], profile())).toMatchObject({ ok: true, softWarnLabels: ["Uric"] });
		expect(planVisitSave(form(fields), [banded], undefined)).toMatchObject({ ok: true, softWarnLabels: [] });
	});

	it("writes a qualitative value trimmed, as text", () => {
		const ubg = marker({ id: "uro_ubg", name: "UBG", type: "qualitative" });

		expect(planVisitSave(form({ uro_ubg: { raw: " Normal ", unit: "" } }), [ubg], profile())).toMatchObject({ ok: true, patch: { set: { uro_ubg: "Normal" } } });
	});
});

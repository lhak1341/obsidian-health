import { describe, expect, it } from "vitest";
import { concernViewNameForProfile, groupByConcern, normalizeConcernKey, resolveConcernViewName } from "./concern";

describe("normalizeConcernKey", () => {
	it("folds casing and surrounding whitespace into one identity key", () => {
		expect(normalizeConcernKey("  Liver ")).toBe("liver");
		expect(normalizeConcernKey("LIVER")).toBe(normalizeConcernKey("liver"));
	});
});

describe("groupByConcern", () => {
	it("puts an item in every concern group it carries", () => {
		const groups = groupByConcern([{ id: "a", c: ["x", "y"] }, { id: "b", c: ["x"] }], (item) => item.c);

		expect(groups.get("x")?.map((i) => i.id)).toEqual(["a", "b"]);
		expect(groups.get("y")?.map((i) => i.id)).toEqual(["a"]);
	});
});

describe("resolveConcernViewName", () => {
	it("uses a concernViewOverrides entry when set", () => {
		expect(resolveConcernViewName("liver", { liver: "Liver Panel" })).toBe("Liver Panel");
	});

	it("trims the override", () => {
		expect(resolveConcernViewName("liver", { liver: "  Liver Panel  " })).toBe("Liver Panel");
	});

	it("falls back to the registry label when the override is blank", () => {
		expect(resolveConcernViewName("liver", { liver: "   " })).toBe("Liver");
	});

	it("falls back to the registry label when there is no override", () => {
		expect(resolveConcernViewName("cbc", {})).toBe("CBC");
	});

	it("falls back to the key itself for an unregistered concern", () => {
		expect(resolveConcernViewName("zzz-unknown", {})).toBe("zzz-unknown");
	});
});

describe("concernViewNameForProfile", () => {
	it("appends the person to a plain label", () => {
		expect(concernViewNameForProfile("Vitals", "Khoa")).toBe("Vitals — Khoa");
	});

	it("appends the person to a concernViewOverrides-resolved name the same way", () => {
		expect(concernViewNameForProfile("Liver Panel", "Maru")).toBe("Liver Panel — Maru");
	});
});

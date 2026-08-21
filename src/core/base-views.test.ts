import { describe, expect, it } from "vitest";
import { applyBaseViewSplice, computeDesiredBaseViews, diffBaseViews, parseViewBlocks, serializeBaseView } from "./base-views";
import type { MarkerNote, ProfileNote } from "./types";

function marker(overrides: Partial<MarkerNote> = {}): MarkerNote {
	return { id: "test-marker", name: "Test Marker", aliases: [], type: "numeric", panel: "biochemical", concern: [], curated: false, blurb: "", ...overrides };
}

function profile(overrides: Partial<ProfileNote> = {}): ProfileNote {
	return { person: "self", sex: "m", ...overrides };
}

describe("computeDesiredBaseViews", () => {
	it("produces one base view and one per-profile view per concern key", () => {
		const markers = [marker({ id: "a", concern: ["Vitals"] }), marker({ id: "b", concern: ["Vitals"] })];
		const profiles = [profile({ person: "Khoa" }), profile({ person: "Maru" })];

		const views = computeDesiredBaseViews(markers, profiles, {});

		expect(views.map((v) => v.name)).toEqual(["Vitals", "Vitals — Khoa", "Vitals — Maru"]);
	});

	it("sorts concerns alphabetically by key and derives multiple concerns from live marker data", () => {
		const markers = [marker({ id: "a", concern: ["Zeta"] }), marker({ id: "b", concern: ["Alpha"] })];

		const views = computeDesiredBaseViews(markers, [], {});

		// Unregistered concerns fall back to the lowercase key as their label (labelForConcern).
		expect(views.map((v) => v.name)).toEqual(["alpha", "zeta"]);
	});

	it("respects concernViewOverrides for the base name, then suffixes per profile", () => {
		const markers = [marker({ id: "a", concern: ["liver"] })];
		const views = computeDesiredBaseViews(markers, [profile({ person: "Khoa" })], { liver: "Liver Panel" });

		expect(views.map((v) => v.name)).toEqual(["Liver Panel", "Liver Panel — Khoa"]);
	});

	it("puts date first, then markers sorted by baseOrder, unset markers last alphabetically by id", () => {
		const markers = [
			marker({ id: "zzz", concern: ["kidney"] }),
			marker({ id: "creatinine", concern: ["kidney"], baseOrder: 10 }),
			marker({ id: "egfr", concern: ["kidney"], baseOrder: 20 }),
			marker({ id: "aaa", concern: ["kidney"] }),
		];

		const [view] = computeDesiredBaseViews(markers, [], {});

		expect(view.order).toEqual(["date", "creatinine", "egfr", "aaa", "zzz"]);
	});

	it("scopes column order to markers in that concern, ignoring markers from other concerns", () => {
		const markers = [marker({ id: "vit-a", concern: ["Vitals"] }), marker({ id: "kid-a", concern: ["Kidney"] })];

		const views = computeDesiredBaseViews(markers, [], {});

		expect(views.find((v) => v.name === "Vitals")?.order).toEqual(["date", "vit-a"]);
		expect(views.find((v) => v.name === "Kidney")?.order).toEqual(["date", "kid-a"]);
	});

	it("gives a per-profile view a person filter and no filter on the base view", () => {
		const markers = [marker({ id: "a", concern: ["Vitals"] })];
		const views = computeDesiredBaseViews(markers, [profile({ person: "Khoa" })], {});

		expect(views.find((v) => v.name === "Vitals")?.personFilter).toBeUndefined();
		expect(views.find((v) => v.name === "Vitals — Khoa")?.personFilter).toBe('person == "Khoa"');
	});
});

describe("serializeBaseView", () => {
	it("renders a base view with no filters block", () => {
		const text = serializeBaseView({ name: "Vitals", order: ["date", "weight"] });
		expect(text).toBe(['  - type: table', '    name: "Vitals"', "    order:", "      - date", "      - weight", "    sort:", "      - property: date", "        direction: DESC"].join("\n"));
	});

	it("renders a per-profile view with a filters block", () => {
		const text = serializeBaseView({ name: "Vitals — Khoa", order: ["date"], personFilter: 'person == "Khoa"' });
		expect(text).toContain('    filters:\n      and:\n        - person == "Khoa"');
	});

	it("escapes an embedded double quote in the name", () => {
		const text = serializeBaseView({ name: 'Weird "Name"', order: ["date"] });
		expect(text).toContain('name: "Weird \\"Name\\""');
	});
});

describe("parseViewBlocks", () => {
	const sample = [
		"filters:",
		'  and:',
		'    - type == "lab-visit"',
		"views:",
		"  - type: table",
		"    name: Vitals",
		"    order:",
		"      - date",
		"      - weight",
		"    sort:",
		"      - property: date",
		'  - type: table',
		'    name: "Vitals — Khoa"',
		"    filters:",
		"      and:",
		'        - person == "Khoa"',
		"    order:",
		"      - date",
	].join("\n");

	it("finds both views with correct names and line ranges", () => {
		const blocks = parseViewBlocks(sample);
		expect(blocks.map((b) => b.name)).toEqual(["Vitals", "Vitals — Khoa"]);
		expect(blocks[0]).toEqual({ name: "Vitals", startLine: 4, endLine: 11 });
		expect(blocks[1]).toEqual({ name: "Vitals — Khoa", startLine: 11, endLine: 18 });
	});

	it("returns an empty array when there's no views: key", () => {
		expect(parseViewBlocks("filters:\n  and: []\n")).toEqual([]);
	});
});

describe("diffBaseViews", () => {
	const fileText = ["views:", "  - type: table", "    name: Vitals", "    order:", "      - date"].join("\n");

	it("is idempotent: re-diffing the desired output of a fresh add produces no further changes", () => {
		const desired = [{ name: "Vitals", order: ["date"] }];
		const rewritten = applyBaseViewSplice(fileText, desired, []);

		const diff = diffBaseViews(desired, rewritten, ["Vitals"]);

		expect(diff).toEqual({ toAdd: [], toUpdate: [], toRemove: [], collisions: [] });
	});

	it("puts a desired view with no existing block in toAdd", () => {
		const diff = diffBaseViews([{ name: "Kidney", order: ["date"] }], fileText, []);
		expect(diff.toAdd.map((v) => v.name)).toEqual(["Kidney"]);
	});

	it("puts a changed, already-managed view in toUpdate", () => {
		const diff = diffBaseViews([{ name: "Vitals", order: ["date", "weight"] }], fileText, ["Vitals"]);
		expect(diff.toUpdate.map((v) => v.name)).toEqual(["Vitals"]);
	});

	it("puts a managed name no longer desired in toRemove", () => {
		const diff = diffBaseViews([], fileText, ["Vitals"]);
		expect(diff.toRemove).toEqual(["Vitals"]);
	});

	it("puts a same-named view that exists but isn't in the manifest in collisions, never toUpdate", () => {
		const diff = diffBaseViews([{ name: "Vitals", order: ["date", "weight"] }], fileText, []);
		expect(diff.toUpdate).toEqual([]);
		expect(diff.collisions.map((v) => v.name)).toEqual(["Vitals"]);
	});
});

describe("applyBaseViewSplice", () => {
	it("replaces an existing block in place", () => {
		const fileText = ["views:", "  - type: table", "    name: Vitals", "    order:", "      - date"].join("\n");
		const result = applyBaseViewSplice(fileText, [{ name: "Vitals", order: ["date", "weight"] }], []);
		expect(result).toBe(["views:", '  - type: table', '    name: "Vitals"', "    order:", "      - date", "      - weight", "    sort:", "      - property: date", "        direction: DESC"].join("\n"));
	});

	it("appends a new view at the end, preserving a trailing newline", () => {
		const fileText = "views:\n  - type: table\n    name: Vitals\n    order:\n      - date\n";
		const result = applyBaseViewSplice(fileText, [{ name: "Kidney", order: ["date"] }], []);
		expect(result.endsWith("\n")).toBe(true);
		expect(result).toContain('    name: "Kidney"');
		expect(parseViewBlocks(result).map((b) => b.name)).toEqual(["Vitals", "Kidney"]);
	});

	it("removes a block by name", () => {
		const fileText = ["views:", "  - type: table", "    name: Vitals", "    order:", "      - date", "  - type: table", "    name: Kidney", "    order:", "      - date"].join("\n");
		const result = applyBaseViewSplice(fileText, [], ["Vitals"]);
		expect(parseViewBlocks(result).map((b) => b.name)).toEqual(["Kidney"]);
	});

	it("leaves an untouched view byte-identical", () => {
		const fileText = ["views:", "  - type: table", "    name: Vitals", "    order:", "      - date", "  - type: table", "    name: Kidney", "    order:", "      - date"].join("\n");
		const result = applyBaseViewSplice(fileText, [{ name: "Vitals", order: ["date", "weight"] }], []);
		const kidneyBlock = parseViewBlocks(result).find((b) => b.name === "Kidney")!;
		expect(result.split("\n").slice(kidneyBlock.startLine, kidneyBlock.endLine).join("\n")).toBe(["  - type: table", "    name: Kidney", "    order:", "      - date"].join("\n"));
	});

	it("leaves a name in both toWrite and toRemoveNames written, not removed", () => {
		const fileText = ["views:", "  - type: table", "    name: Vitals", "    order:", "      - date"].join("\n");
		const result = applyBaseViewSplice(fileText, [{ name: "Vitals", order: ["date", "weight"] }], ["Vitals"]);
		expect(parseViewBlocks(result).map((b) => b.name)).toEqual(["Vitals"]);
		expect(result).toContain("weight");
	});
});

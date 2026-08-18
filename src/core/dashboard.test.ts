import { describe, expect, it } from "vitest";
import { computeDashboardModel, convert, convertTo, isSoftWarn, resolve } from "./dashboard";
import { realVaultFixture } from "./fixtures/real-vault";
import type { DashboardSettings } from "./model";
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

function profile(overrides: Partial<ProfileNote> = {}): ProfileNote {
	return { person: "self", sex: "m", ...overrides };
}

function visit(date: string, values: VisitNote["values"], person = "self", units?: VisitNote["units"]): VisitNote {
	return { person, date, values, ...(units ? { units } : {}) };
}

const settings: DashboardSettings = { deadbandPct: 0.03 };

describe("resolve", () => {
	it("picks the sex-specific band over an 'any' band", () => {
		const m = marker({
			ranges: [
				{ sex: "any", low: 0, high: 100 },
				{ sex: "m", low: 10, high: 90 },
			],
		});

		const band = resolve(m, profile({ sex: "m" }), "2025-01-01");

		expect(band).toEqual({ low: 10, high: 90 });
	});

	it("picks the age-banded range over an ageless range when age matches", () => {
		const m = marker({
			ranges: [
				{ sex: "any", low: 0, high: 100 },
				{ sex: "any", age: [0, 17], low: 5, high: 50 },
			],
		});

		const band = resolve(m, profile({ dob: "2015-01-01" }), "2025-01-01");

		expect(band).toEqual({ low: 5, high: 50 });
	});

	it("resolves a different band for a different profile sex", () => {
		const m = marker({ ranges: [{ sex: "m", low: 13, high: 17 }, { sex: "f", low: 12, high: 16.5 }] });

		expect(resolve(m, profile({ sex: "m" }), "2025-01-01")).toEqual({ low: 13, high: 17 });
		expect(resolve(m, profile({ sex: "f" }), "2025-01-01")).toEqual({ low: 12, high: 16.5 });
	});

	it("returns an empty band when no range matches the profile's sex", () => {
		const m = marker({ ranges: [{ sex: "f", low: 10, high: 90 }] });

		const band = resolve(m, profile({ sex: "m" }), "2025-01-01");

		expect(band).toEqual({});
	});
});

describe("convert", () => {
	it("passes the value through unchanged when already in the canonical unit", () => {
		const m = marker({ unit: "U/L" });

		expect(convert(10, "U/L", m)).toBe(10);
	});

	it("converts an alt-unit value to canonical via alt_factor", () => {
		const m = marker({ unit: "mmol/L", altUnit: "mg/dL", altFactor: 0.0555 });

		expect(convert(100, "mg/dL", m)).toBeCloseTo(5.55);
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
		const m = marker({ unit: "mmol/L", altUnit: "mg/dL", altFactor: 0.0555 });

		expect(convertTo(5.55, "mg/dL", m)).toBeCloseTo(100);
		expect(convertTo(convert(100, "mg/dL", m), "mg/dL", m)).toBeCloseTo(100);
	});

	it("throws for a unit the marker doesn't know", () => {
		const m = marker({ unit: "mmol/L" });

		expect(() => convertTo(100, "furlongs", m)).toThrow();
	});
});

describe("isSoftWarn", () => {
	it("flags a converted value more than 5x the ceiling", () => {
		expect(isSoftWarn(300, { low: 10, high: 50 })).toBe(true);
	});

	it("flags a converted value under a fifth of the floor", () => {
		expect(isSoftWarn(1, { low: 10, high: 50 })).toBe(true);
	});

	it("does not flag a value within the wild-outlier threshold", () => {
		expect(isSoftWarn(30, { low: 10, high: 50 })).toBe(false);
	});

	it("flags a converted alt-unit value that lands wildly outside the band", () => {
		// 1000 mg/dL entered where mmol/L was meant -- a classic unit-slip typo.
		const m = marker({ unit: "mmol/L", altUnit: "mg/dL", altFactor: 0.0555 });
		const canonical = convert(1000, "mg/dL", m);

		expect(isSoftWarn(canonical, { low: 3.6, high: 5.18 })).toBe(true);
	});
});

describe("computeDashboardModel — numeric status", () => {
	it("is good when the latest value is within the lab range", () => {
		const m = marker({ id: "alt", ranges: [{ sex: "any", low: 0, high: 41 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { alt: 20 })], profile(), settings);

		expect(model.markers[0].status).toBe("good");
	});

	it("treats the upper bound as inclusive (good, not high)", () => {
		const m = marker({ id: "alt", ranges: [{ sex: "any", low: 0, high: 41 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { alt: 41 })], profile(), settings);

		expect(model.markers[0].status).toBe("good");
	});

	it("treats the lower bound as inclusive (good, not low)", () => {
		const m = marker({ id: "alt", ranges: [{ sex: "any", low: 0, high: 41 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { alt: 0 })], profile(), settings);

		expect(model.markers[0].status).toBe("good");
	});

	it("is high (red) just past the upper bound", () => {
		const m = marker({ id: "alt", ranges: [{ sex: "any", low: 0, high: 41 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { alt: 41.01 })], profile(), settings);

		expect(model.markers[0].status).toBe("high");
	});

	it("is low (blue) just under the lower bound", () => {
		const m = marker({ id: "alt", ranges: [{ sex: "any", low: 10, high: 41 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { alt: 9.99 })], profile(), settings);

		expect(model.markers[0].status).toBe("low");
	});

	it("is watch (tier-2) when past the personal target but still in lab range", () => {
		const m = marker({
			id: "ldl",
			direction: "lower_better",
			ranges: [{ sex: "any", low: 0, high: 5 }],
			optimalHigh: 3,
		});
		const model = computeDashboardModel([m], [visit("2025-01-01", { ldl: 4 })], profile(), settings);

		expect(model.markers[0].status).toBe("watch");
	});

	it("prefers tier-1 high over tier-2 watch when both would apply", () => {
		const m = marker({
			id: "ldl",
			direction: "lower_better",
			ranges: [{ sex: "any", low: 0, high: 5 }],
			optimalHigh: 3,
		});
		const model = computeDashboardModel([m], [visit("2025-01-01", { ldl: 6 })], profile(), settings);

		expect(model.markers[0].status).toBe("high");
	});
});

describe("computeDashboardModel — qualitative status", () => {
	it("is good when the reading matches the normal value", () => {
		const m = marker({ id: "hbsag", type: "qualitative", normal: "Negative" });
		const model = computeDashboardModel([m], [visit("2025-01-01", { hbsag: "Negative" })], profile(), settings);

		expect(model.markers[0].status).toBe("good");
	});

	it("is high (red) when the reading is not in the normal set", () => {
		const m = marker({ id: "hbsag", type: "qualitative", normal: "Negative" });
		const model = computeDashboardModel([m], [visit("2025-01-01", { hbsag: "Positive" })], profile(), settings);

		expect(model.markers[0].status).toBe("high");
	});

	it("matches against a list of normal values", () => {
		const m = marker({ id: "glu", type: "qualitative", normal: ["Normal", "Trace"] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { glu: "Trace" })], profile(), settings);

		expect(model.markers[0].status).toBe("good");
	});
});

describe("computeDashboardModel — candidate markers", () => {
	it("omits a candidate marker with zero readings", () => {
		const m = marker({ id: "candidate-test", status: "candidate" });
		const model = computeDashboardModel([m], [], profile(), settings);

		expect(model.markers).toEqual([]);
	});

	it("auto-graduates a candidate onto the dashboard once it has a reading", () => {
		const m = marker({ id: "candidate-test", status: "candidate" });
		const model = computeDashboardModel([m], [visit("2025-01-01", { "candidate-test": 5 })], profile(), settings);

		expect(model.markers.map((info) => info.marker.id)).toEqual(["candidate-test"]);
	});
});

describe("computeDashboardModel — arrow", () => {
	it("has no arrow with only one reading", () => {
		const m = marker({ id: "alt" });
		const model = computeDashboardModel([m], [visit("2025-01-01", { alt: 20 })], profile(), settings);

		expect(model.markers[0].arrow).toBeUndefined();
	});

	it("is flat just inside the deadband (exactly 3%)", () => {
		const m = marker({ id: "alt" });
		const visits = [visit("2024-01-01", { alt: 100 }), visit("2025-01-01", { alt: 103 })];
		const model = computeDashboardModel([m], visits, profile(), settings);

		expect(model.markers[0].arrow?.direction).toBe("flat");
	});

	it("is up just outside the deadband", () => {
		const m = marker({ id: "alt" });
		const visits = [visit("2024-01-01", { alt: 100 }), visit("2025-01-01", { alt: 103.01 })];
		const model = computeDashboardModel([m], visits, profile(), settings);

		expect(model.markers[0].arrow?.direction).toBe("up");
	});

	it("tones a lower_better marker rising as bad", () => {
		const m = marker({ id: "ldl", direction: "lower_better" });
		const visits = [visit("2024-01-01", { ldl: 100 }), visit("2025-01-01", { ldl: 110 })];
		const model = computeDashboardModel([m], visits, profile(), settings);

		expect(model.markers[0].arrow?.tone).toBe("bad");
	});

	it("tones a lower_better marker falling as good", () => {
		const m = marker({ id: "ldl", direction: "lower_better" });
		const visits = [visit("2024-01-01", { ldl: 100 }), visit("2025-01-01", { ldl: 90 })];
		const model = computeDashboardModel([m], visits, profile(), settings);

		expect(model.markers[0].arrow?.tone).toBe("good");
	});

	it("tones a higher_better marker rising as good", () => {
		const m = marker({ id: "hdl", direction: "higher_better" });
		const visits = [visit("2024-01-01", { hdl: 100 }), visit("2025-01-01", { hdl: 110 })];
		const model = computeDashboardModel([m], visits, profile(), settings);

		expect(model.markers[0].arrow?.tone).toBe("good");
	});
});

describe("computeDashboardModel — series", () => {
	it("skips visits where the marker key is omitted, cleanly (no gap entries)", () => {
		const m = marker({ id: "alt" });
		const visits = [
			visit("2023-01-01", { alt: 20 }),
			visit("2024-01-01", { ast: 15 }),
			visit("2025-01-01", { alt: 25 }),
		];
		const model = computeDashboardModel([m], visits, profile(), settings);

		expect(model.markers[0].series).toEqual([
			{ date: "2023-01-01", value: 20 },
			{ date: "2025-01-01", value: 25 },
		]);
	});

	it("excludes another profile's visits, even when dates and marker ids collide", () => {
		const m = marker({ id: "alt" });
		const visits = [visit("2025-01-01", { alt: 20 }, "self"), visit("2025-01-01", { alt: 999 }, "spouse")];
		const model = computeDashboardModel([m], visits, profile({ person: "self" }), settings);

		expect(model.markers[0].series).toEqual([{ date: "2025-01-01", value: 20 }]);
	});

	it("drops a marker entirely when no visit ever recorded it", () => {
		const m = marker({ id: "never-measured" });
		const model = computeDashboardModel([m], [visit("2025-01-01", { alt: 20 })], profile(), settings);

		expect(model.markers).toHaveLength(0);
	});
});

describe("computeDashboardModel — mixed-unit visits", () => {
	it("converts a visit's raw value into the marker's canonical unit using its `units` sibling entry", () => {
		const m = marker({ id: "uric_acid", unit: "umol/L", altUnit: "mg/dL", altFactor: 59.48 });
		const visits = [
			visit("2019-01-01", { uric_acid: 7.3 }, "self", { uric_acid: "mg/dL" }),
			visit("2024-01-01", { uric_acid: 434.2 }, "self"),
		];
		const model = computeDashboardModel([m], visits, profile(), settings);

		expect(model.markers[0].series[0].value).toBeCloseTo(7.3 * 59.48);
		expect(model.markers[0].series[1].value).toBe(434.2);
	});

	it("falls back to the raw number when `units` names a unit the marker doesn't recognize", () => {
		const m = marker({ id: "alt", unit: "U/L" });
		const model = computeDashboardModel([m], [visit("2024-01-01", { alt: 20 }, "self", { alt: "furlongs" })], profile(), settings);

		expect(model.markers[0].series[0].value).toBe(20);
	});
});

describe("computeDashboardModel — attention rank", () => {
	it("ranks tier-1 (high/low) before tier-2 (watch) before good", () => {
		const high = marker({ id: "high-marker", ranges: [{ sex: "any", low: 0, high: 10 }] });
		const watchM = marker({ id: "watch-marker", direction: "lower_better", ranges: [{ sex: "any", low: 0, high: 10 }], optimalHigh: 5 });
		const good = marker({ id: "good-marker", ranges: [{ sex: "any", low: 0, high: 10 }] });

		const model = computeDashboardModel(
			[good, watchM, high],
			[visit("2025-01-01", { "high-marker": 20, "watch-marker": 7, "good-marker": 2 })],
			profile(),
			settings,
		);

		expect(model.attentionOrder).toEqual(["high-marker", "watch-marker", "good-marker"]);
	});

	it("ranks larger normalized magnitude first within the same tier", () => {
		const small = marker({ id: "small-excess", ranges: [{ sex: "any", low: 0, high: 10 }] });
		const big = marker({ id: "big-excess", ranges: [{ sex: "any", low: 0, high: 10 }] });

		const model = computeDashboardModel(
			[small, big],
			[visit("2025-01-01", { "small-excess": 11, "big-excess": 50 })],
			profile(),
			settings,
		);

		expect(model.attentionOrder).toEqual(["big-excess", "small-excess"]);
	});

	it("sorts qualitative-abnormal to the top of tier 1, ahead of numeric high/low", () => {
		const numericHigh = marker({ id: "numeric-high", ranges: [{ sex: "any", low: 0, high: 10 }] });
		const qualBad = marker({ id: "qual-bad", type: "qualitative", normal: "Negative" });

		const model = computeDashboardModel(
			[numericHigh, qualBad],
			[visit("2025-01-01", { "numeric-high": 1000, "qual-bad": "Positive" })],
			profile(),
			settings,
		);

		expect(model.attentionOrder).toEqual(["qual-bad", "numeric-high"]);
	});

	it("breaks a magnitude tie in favour of the worsening trend", () => {
		const worsening = marker({ id: "worsening", direction: "lower_better", ranges: [{ sex: "any", low: 0, high: 10 }] });
		const improving = marker({ id: "improving", direction: "lower_better", ranges: [{ sex: "any", low: 0, high: 10 }] });

		const model = computeDashboardModel(
			[improving, worsening],
			[
				visit("2024-01-01", { worsening: 14, improving: 16 }),
				visit("2025-01-01", { worsening: 15, improving: 15 }),
			],
			profile(),
			settings,
		);

		expect(model.attentionOrder).toEqual(["worsening", "improving"]);
	});
});

describe("computeDashboardModel — concern groups", () => {
	it("groups markers by concern, dot = worst member's status", () => {
		const flagged = marker({ id: "ldl", concern: ["lipids"], ranges: [{ sex: "any", low: 0, high: 10 }] });
		const ok = marker({ id: "hdl", concern: ["lipids"], ranges: [{ sex: "any", low: 0, high: 10 }] });

		const model = computeDashboardModel(
			[flagged, ok],
			[visit("2025-01-01", { ldl: 20, hdl: 5 })],
			profile(),
			settings,
		);

		const lipids = model.concernGroups.find((g) => g.concern === "lipids");
		expect(lipids?.status).toBe("high");
		expect(lipids?.markers.map((m) => m.marker.id).sort()).toEqual(["hdl", "ldl"]);
	});

	it("prefers high over low for the worst-member dot when a group has both", () => {
		const lowMarker = marker({ id: "low-one", concern: ["panel"], ranges: [{ sex: "any", low: 10, high: 20 }] });
		const highMarker = marker({ id: "high-one", concern: ["panel"], ranges: [{ sex: "any", low: 10, high: 20 }] });

		const model = computeDashboardModel(
			[lowMarker, highMarker],
			[visit("2025-01-01", { "low-one": 5, "high-one": 25 })],
			profile(),
			settings,
		);

		const panel = model.concernGroups.find((g) => g.concern === "panel");
		expect(panel?.status).toBe("high");
	});

	it("puts a marker in every concern group it belongs to", () => {
		const m = marker({ id: "shared", concern: ["liver", "metabolic"], ranges: [{ sex: "any", low: 0, high: 10 }] });

		const model = computeDashboardModel([m], [visit("2025-01-01", { shared: 5 })], profile(), settings);

		expect(model.concernGroups.map((g) => g.concern).sort()).toEqual(["liver", "metabolic"]);
	});

	it("folds mismatched concern casing into one group instead of splitting it", () => {
		const titleCased = marker({ id: "alt", concern: ["Liver"], ranges: [{ sex: "any", low: 0, high: 10 }] });
		const lowerCased = marker({ id: "ast", concern: ["liver"], ranges: [{ sex: "any", low: 0, high: 10 }] });

		const model = computeDashboardModel(
			[titleCased, lowerCased],
			[visit("2025-01-01", { alt: 5, ast: 5 })],
			profile(),
			settings,
		);

		expect(model.concernGroups.map((g) => g.concern)).toEqual(["liver"]);
		expect(model.concernGroups[0].markers.map((m) => m.marker.id).sort()).toEqual(["alt", "ast"]);
	});
});

describe("computeDashboardModel — curated selection", () => {
	it("includes a curated marker even when good", () => {
		const m = marker({ id: "curated-good", curated: true, ranges: [{ sex: "any", low: 0, high: 10 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { "curated-good": 5 })], profile(), settings);

		expect(model.curated).toContain("curated-good");
	});

	it("includes a flagged marker even when not curated", () => {
		const m = marker({ id: "flagged-uncurated", curated: false, ranges: [{ sex: "any", low: 0, high: 10 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { "flagged-uncurated": 99 })], profile(), settings);

		expect(model.curated).toContain("flagged-uncurated");
	});

	it("excludes a good, non-curated marker", () => {
		const m = marker({ id: "plain-good", curated: false, ranges: [{ sex: "any", low: 0, high: 10 }] });
		const model = computeDashboardModel([m], [visit("2025-01-01", { "plain-good": 5 })], profile(), settings);

		expect(model.curated).not.toContain("plain-good");
	});
});

describe("computeDashboardModel — real migrated vault fixture", () => {
	const [realProfile] = realVaultFixture.profiles;

	it("runs clean over the real fixture and returns a well-formed model", () => {
		const model = computeDashboardModel(realVaultFixture.markers, realVaultFixture.visits, realProfile, settings);

		expect(model.markers.length).toBeGreaterThan(0);
		expect(model.markers.length).toBeLessThanOrEqual(realVaultFixture.markers.length);
		for (const info of model.markers) {
			expect(["high", "low", "watch", "good"]).toContain(info.status);
			expect(info.series.length).toBeGreaterThan(0);
		}

		expect(model.attentionOrder.sort()).toEqual(model.markers.map((m) => m.marker.id).sort());

		for (const group of model.concernGroups) {
			const worstTier = Math.min(...group.markers.map((m) => "high low watch good".split(" ").indexOf(m.status)));
			expect("high low watch good".split(" ").indexOf(group.status)).toBe(worstTier);
		}
	});

	it("matches the known-good real ALT reading (31.31, m range 0-41)", () => {
		const model = computeDashboardModel(realVaultFixture.markers, realVaultFixture.visits, realProfile, settings);

		const alt = model.markers.find((m) => m.marker.id === "alt");
		expect(alt?.latest).toEqual({ date: "2025-07-23", value: 31.31 });
		expect(alt?.status).toBe("good");
	});

	it("matches the known-good real HCT reading (47.1, any range 34-51)", () => {
		const model = computeDashboardModel(realVaultFixture.markers, realVaultFixture.visits, realProfile, settings);

		const hct = model.markers.find((m) => m.marker.id === "hct");
		expect(hct?.latest).toEqual({ date: "2025-07-23", value: 47.1 });
		expect(hct?.status).toBe("good");
	});
});

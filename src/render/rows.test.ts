import { describe, expect, it } from "vitest";
import type { DashboardModel, MarkerStatusInfo } from "../core/model";
import type { MarkerNote } from "../core/types";
import { flaggedRows, formatRowValue, indexPairs } from "./rows";

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

function info(markerOverrides: Partial<MarkerNote> = {}, extra: Partial<Omit<MarkerStatusInfo, "marker">> = {}): MarkerStatusInfo {
	return { marker: marker(markerOverrides), status: "good", band: {}, series: [], ...extra };
}

function model(markers: MarkerStatusInfo[], attentionOrder: string[]): DashboardModel {
	return { markers, attentionOrder, concernGroups: [], curated: [] };
}

describe("indexPairs", () => {
	it("indexes an unpaired marker under its own id", () => {
		const a = info({ id: "a" });
		const index = indexPairs([a]);
		expect(index.get("a")).toEqual({ primary: a });
	});

	it("indexes both twins of a paired marker under the same row", () => {
		const primary = info({ id: "sbp", pair: "bp", order: 0 });
		const secondary = info({ id: "dbp", pair: "bp", order: 1 });
		const index = indexPairs([primary, secondary]);

		const row = index.get("sbp");
		expect(row).toBe(index.get("dbp"));
		expect(row).toEqual({ primary, secondary });
	});
});

describe("flaggedRows", () => {
	it("excludes good-status markers", () => {
		const a = info({ id: "a" }, { status: "good" });
		const flagged = flaggedRows(model([a], ["a"]));
		expect(flagged).toEqual([]);
	});

	it("returns flagged rows in attentionOrder sequence, not marker declaration order", () => {
		const a = info({ id: "a" }, { status: "low" });
		const b = info({ id: "b" }, { status: "high" });
		// Declared b-then-a, but attentionOrder ranks a first.
		const flagged = flaggedRows(model([b, a], ["a", "b"]));
		expect(flagged.map((row) => row.primary.marker.id)).toEqual(["a", "b"]);
	});

	it("dedupes a paired row that appears twice in attentionOrder (once per twin)", () => {
		const primary = info({ id: "sbp", pair: "bp", order: 0 }, { status: "high" });
		const secondary = info({ id: "dbp", pair: "bp", order: 1 }, { status: "high" });
		const flagged = flaggedRows(model([primary, secondary], ["sbp", "dbp"]));

		expect(flagged).toHaveLength(1);
		expect(flagged[0]).toEqual({ primary, secondary });
	});

	// Statuses are derived independently per marker (core/dashboard.ts's deriveStatus runs once per
	// MarkerNote, no pairing/unification) -- a pair can genuinely have one twin "good" and the other
	// not. The row must still surface, keyed by its fixed primary, whichever twin is the one flagged.
	it("flags a row when only the secondary twin is out of range, even though the primary is good", () => {
		const primary = info({ id: "sbp", pair: "bp", order: 0 }, { status: "good" });
		const secondary = info({ id: "dbp", pair: "bp", order: 1 }, { status: "high" });
		const flagged = flaggedRows(model([primary, secondary], ["dbp"]));

		expect(flagged).toEqual([{ primary, secondary }]);
	});
});

describe("formatRowValue", () => {
	it("returns an em dash when there's no latest reading", () => {
		expect(formatRowValue(info())).toBe("—");
	});

	it("formats a single value", () => {
		const primary = info({}, { latest: { date: "2025-01-01", value: 5.2 } });
		expect(formatRowValue(primary)).toBe("5.2");
	});

	it("formats a paired value as primary/secondary", () => {
		const primary = info({ id: "sbp" }, { latest: { date: "2025-01-01", value: 120 } });
		const secondary = info({ id: "dbp" }, { latest: { date: "2025-01-01", value: 80 } });
		expect(formatRowValue(primary, secondary)).toBe("120/80");
	});
});

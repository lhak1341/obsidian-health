import { describe, expect, it } from "vitest";
import type { MarkerStatusInfo } from "../core/model";
import type { MarkerNote } from "../core/types";
import { formatRowValue } from "./rows";

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
	return { marker: marker(markerOverrides), status: "good", band: {}, target: {}, series: [], ...extra };
}

describe("formatRowValue", () => {
	it("returns an em dash when there's no primary value", () => {
		expect(formatRowValue(undefined)).toBe("—");
	});

	it("formats a single value", () => {
		expect(formatRowValue(5.2)).toBe("5.2");
	});

	it("formats a paired value as primary/secondary, secondary read from its own latest reading", () => {
		const secondary = info({ id: "dbp" }, { latest: { date: "2025-01-01", value: 80 } });
		expect(formatRowValue(120, secondary)).toBe("120/80");
	});

	it("accepts a display value distinct from the primary's raw latest reading (unit-toggle case)", () => {
		const secondary = info({ id: "dbp" }, { latest: { date: "2025-01-01", value: 80 } });
		expect(formatRowValue("Normal", secondary)).toBe("Normal/80");
	});
});

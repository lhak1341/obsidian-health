// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { buildSparkline } from "./charts";

const STATUS = "var(--color-red, #e93147)";
const series = [
	{ date: "2024-01-01", value: 4 },
	{ date: "2025-01-01", value: 6 },
	{ date: "2026-01-01", value: 5 },
];

/** The sparkline's colours come from styles.src.css's neutral ramp (src/styles.test.ts pins it), so
 *  each painted part carries its class and no colour attribute of its own, which would read the
 *  theme's raw variables instead. */
function colourAttributes(el: Element): string[] {
	return ["stroke", "fill"].filter((name) => el.hasAttribute(name) && el.getAttribute(name) !== "none");
}

describe("buildSparkline", () => {
	it("paints the line, the earlier series and the reference band through their ramp classes", () => {
		const svg = buildSparkline(series, { low: 3, high: 7 }, STATUS, [
			{ date: "2024-01-01", value: 3 },
			{ date: "2025-01-01", value: 4 },
		]);
		for (const cls of ["hlth-spk-line", "hlth-spk-secondary", "hlth-spk-band"]) {
			const part = svg.querySelector(`.${cls}`);
			expect(part, cls).not.toBeNull();
			expect(colourAttributes(part!), cls).toEqual([]);
		}
	});

	it("paints the no-reading dash through its ramp class", () => {
		const svg = buildSparkline([{ date: "2026-01-01", value: "Negative" }], {}, STATUS);
		const dash = svg.querySelector(".hlth-spk-empty");
		expect(dash).not.toBeNull();
		expect(colourAttributes(dash!)).toEqual([]);
	});

	it("keeps the status colour on the last reading's dot only", () => {
		const svg = buildSparkline(series, { low: 3, high: 7 }, STATUS);
		const dots = svg.querySelectorAll("circle");
		expect(dots).toHaveLength(1);
		expect(dots[0]?.getAttribute("fill")).toBe(STATUS);
	});
});

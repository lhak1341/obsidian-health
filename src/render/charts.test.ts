import { describe, expect, it } from "vitest";
import { paddedDomain, scaleX, scaleY } from "./charts";

describe("paddedDomain", () => {
	it("pads proportionally to the range", () => {
		const [min, max] = paddedDomain([0, 10], 0.1);
		expect(min).toBeCloseTo(-1);
		expect(max).toBeCloseTo(11);
	});

	it("falls back to a fixed pad of 1 when min === max", () => {
		const [min, max] = paddedDomain([5, 5], 0.1);
		expect(min).toBe(4);
		expect(max).toBe(6);
	});

	it("handles a single value the same as a flat range", () => {
		const [min, max] = paddedDomain([7], 0.2);
		expect(min).toBe(6);
		expect(max).toBe(8);
	});
});

describe("scaleX", () => {
	it("distributes indices evenly across the track for count > 1", () => {
		const x = scaleX(3, 0, 100);
		expect(x(0)).toBe(0);
		expect(x(1)).toBe(50);
		expect(x(2)).toBe(100);
	});

	it("does not divide by zero when count === 1 (Math.max(1, count-1) guard)", () => {
		const x = scaleX(1, 0, 100);
		expect(x(0)).toBe(0);
		expect(Number.isFinite(x(0))).toBe(true);
	});

	it("does not divide by zero when count === 0", () => {
		const x = scaleX(0, 0, 100);
		expect(Number.isFinite(x(0))).toBe(true);
	});
});

describe("scaleY", () => {
	it("maps min/max onto bottom/top", () => {
		const y = scaleY(0, 10, 100, 0);
		expect(y(0)).toBe(100);
		expect(y(10)).toBe(0);
		expect(y(5)).toBe(50);
	});

	it("falls back to a span of 1 when min === max, without dividing by zero", () => {
		const y = scaleY(5, 5, 100, 0);
		expect(Number.isFinite(y(5))).toBe(true);
	});
});

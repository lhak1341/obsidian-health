import { describe, expect, it } from "vitest";
import { columnForConcern, orderForConcern } from "./concern-registry";

describe("orderForConcern", () => {
	it("returns each column-0 concern's fixed lane position", () => {
		expect(orderForConcern("vitals")).toBe(0);
		expect(orderForConcern("cardiometabolic")).toBe(1);
		expect(orderForConcern("cancer")).toBe(2);
		expect(orderForConcern("immunity")).toBe(3);
	});

	it("sorts last (Infinity) for a concern with no registered order", () => {
		expect(orderForConcern("cbc")).toBe(Number.POSITIVE_INFINITY);
		expect(orderForConcern("unregistered")).toBe(Number.POSITIVE_INFINITY);
	});
});

describe("columnForConcern / orderForConcern together", () => {
	it("every column-0 registry entry has an explicit order, so none silently sorts last", () => {
		const col0Keys = ["vitals", "cardiometabolic", "cancer", "immunity"];
		for (const key of col0Keys) {
			expect(columnForConcern(key)).toBe(0);
			expect(orderForConcern(key)).not.toBe(Number.POSITIVE_INFINITY);
		}
	});

	it("a hypothetical new column-0 concern with no order still renders, just unordered", () => {
		// Guards the exact bug this candidate fixes: registering column:0 without also updating a
		// second hand-synced list used to mean silent drop. Now it's "renders last", never "never renders".
		expect(columnForConcern("liver")).toBe(2);
		expect(orderForConcern("liver")).toBe(Number.POSITIVE_INFINITY);
	});
});

import { describe, expect, it } from "vitest";
import { computePlannerBacklog, latestPlanNote } from "./planner";
import type { MarkerNote, PlanNote, VisitNote } from "./types";

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

describe("computePlannerBacklog", () => {
	it("includes only candidate markers", () => {
		const markers = [marker({ id: "a", status: "candidate" }), marker({ id: "b" })];

		const backlog = computePlannerBacklog(markers, []);

		expect(backlog.map((m) => m.id)).toEqual(["a"]);
	});

	it("excludes a candidate that already has a reading from any visit", () => {
		const markers = [marker({ id: "a", status: "candidate" })];
		const visits = [visit("2025-01-01", { a: 5 })];

		const backlog = computePlannerBacklog(markers, visits);

		expect(backlog).toEqual([]);
	});

	it("still counts a reading recorded for a different person", () => {
		const markers = [marker({ id: "a", status: "candidate" })];
		const visits = [visit("2025-01-01", { a: 5 }, "spouse")];

		const backlog = computePlannerBacklog(markers, visits);

		expect(backlog).toEqual([]);
	});

	it("sorts by priority (essential, lifestyle, secondary) then by cost ascending", () => {
		const markers = [
			marker({ id: "cheap-secondary", status: "candidate", priority: "secondary", cost: 20 }),
			marker({ id: "essential-pricey", status: "candidate", priority: "essential", cost: 200 }),
			marker({ id: "essential-cheap", status: "candidate", priority: "essential", cost: 50 }),
			marker({ id: "lifestyle", status: "candidate", priority: "lifestyle", cost: 10 }),
		];

		const backlog = computePlannerBacklog(markers, []);

		expect(backlog.map((m) => m.id)).toEqual(["essential-cheap", "essential-pricey", "lifestyle", "cheap-secondary"]);
	});

	it("sinks a candidate with no priority below ranked ones", () => {
		const markers = [marker({ id: "unranked", status: "candidate" }), marker({ id: "secondary", status: "candidate", priority: "secondary" })];

		const backlog = computePlannerBacklog(markers, []);

		expect(backlog.map((m) => m.id)).toEqual(["secondary", "unranked"]);
	});

	it("treats a missing cost as sinking to the end within its priority tier", () => {
		const markers = [
			marker({ id: "no-cost", status: "candidate", priority: "essential" }),
			marker({ id: "priced", status: "candidate", priority: "essential", cost: 100 }),
		];

		const backlog = computePlannerBacklog(markers, []);

		expect(backlog.map((m) => m.id)).toEqual(["priced", "no-cost"]);
	});
});

describe("latestPlanNote", () => {
	function plan(person: string, year: number, body = ""): PlanNote {
		return { person, year, body, path: `${person}-${year}.md` };
	}

	it("picks the most recent year for the given person", () => {
		const plans = [plan("self", 2023), plan("self", 2025), plan("self", 2024)];

		expect(latestPlanNote(plans, "self")).toEqual(plan("self", 2025));
	});

	it("ignores plans for other people", () => {
		const plans = [plan("spouse", 2025), plan("self", 2024)];

		expect(latestPlanNote(plans, "self")).toEqual(plan("self", 2024));
	});

	it("returns undefined when the person has no plan notes", () => {
		expect(latestPlanNote([], "self")).toBeUndefined();
	});
});

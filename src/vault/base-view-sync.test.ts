import type { App, TFile } from "obsidian";
import { describe, expect, it } from "vitest";
import type { MarkerNote, ProfileNote } from "../core/types";
import { DEFAULT_SETTINGS, type HealthPluginSettings } from "../settings";
import { applyBaseViewSync, planBaseViewSync } from "./base-view-sync";
import { createFakeApp } from "./fixtures/fake-app";

function marker(overrides: Partial<MarkerNote> = {}): MarkerNote {
	return { id: "test", name: "Test", aliases: [], type: "numeric", panel: "biochemical", concern: [], curated: false, blurb: "", ...overrides };
}

function profile(overrides: Partial<ProfileNote> = {}): ProfileNote {
	return { person: "self", sex: "m", ...overrides };
}

function settings(overrides: Partial<HealthPluginSettings> = {}): HealthPluginSettings {
	return { ...DEFAULT_SETTINGS, basePath: "base.base", ...overrides };
}

/** The fake's files are `TFile`-shaped but typed loosely so the fixture stays Obsidian-free; assert it back for callers that need the real type. */
function file(app: App, path: string): TFile {
	return app.vault.getAbstractFileByPath(path) as TFile;
}

const EMPTY_BASE = "views:\n";

describe("planBaseViewSync", () => {
	it("returns undefined when the Base file doesn't exist", async () => {
		const app = createFakeApp([]);
		const plan = await planBaseViewSync(app, settings(), [], []);
		expect(plan).toBeUndefined();
	});

	it("diffs the file's current content against the desired set", async () => {
		const app = createFakeApp([{ path: "base.base", frontmatter: {}, body: EMPTY_BASE }]);
		const markers = [marker({ id: "weight", concern: ["Vitals"] })];

		const plan = await planBaseViewSync(app, settings(), markers, [profile({ person: "Khoa" })]);

		expect(plan?.diff.toAdd.map((v) => v.name)).toEqual(["Vitals", "Vitals — Khoa"]);
	});
});

describe("applyBaseViewSync", () => {
	it("writes the planned views and records them in the manifest", async () => {
		const app = createFakeApp([{ path: "base.base", frontmatter: {}, body: EMPTY_BASE }]);
		const markers = [marker({ id: "weight", concern: ["Vitals"] })];
		const s = settings();

		const plan = await planBaseViewSync(app, s, markers, [profile({ person: "Khoa" })]);
		const ok = await applyBaseViewSync(app, s, plan!, []);

		expect(ok).toBe(true);
		expect(s.managedBaseViews.sort()).toEqual(["Vitals", "Vitals — Khoa"]);
		const written = await app.vault.read(file(app, "base.base"));
		expect(written).toContain('name: "Vitals"');
		expect(written).toContain('name: "Vitals — Khoa"');
	});

	it("re-running the plan+apply on its own output is a no-op (idempotent)", async () => {
		const app = createFakeApp([{ path: "base.base", frontmatter: {}, body: EMPTY_BASE }]);
		const markers = [marker({ id: "weight", concern: ["Vitals"] })];
		const s = settings();

		const plan1 = await planBaseViewSync(app, s, markers, []);
		await applyBaseViewSync(app, s, plan1!, []);

		const plan2 = await planBaseViewSync(app, s, markers, []);
		expect(plan2?.diff).toEqual({ toAdd: [], toUpdate: [], toRemove: [], collisions: [] });
	});

	it("aborts without writing when the file changed since the plan was built", async () => {
		const app = createFakeApp([{ path: "base.base", frontmatter: {}, body: EMPTY_BASE }]);
		const markers = [marker({ id: "weight", concern: ["Vitals"] })];
		const s = settings();

		const plan = await planBaseViewSync(app, s, markers, []);
		// Simulate an external edit landing between the preview and the confirm click.
		await app.vault.modify(file(app, "base.base"), "views:\n  - type: table\n    name: Vitals\n    order:\n      - date\n");

		const ok = await applyBaseViewSync(app, s, plan!, []);

		expect(ok).toBe(false);
		expect(s.managedBaseViews).toEqual([]);
	});

	it("writes an approved collision and adopts it into the manifest", async () => {
		const app = createFakeApp([{ path: "base.base", frontmatter: {}, body: "views:\n  - type: table\n    name: Vitals\n    order:\n      - date\n" }]);
		const markers = [marker({ id: "weight", concern: ["Vitals"] })];
		const s = settings();

		const plan = await planBaseViewSync(app, s, markers, []);
		expect(plan?.diff.collisions.map((v) => v.name)).toEqual(["Vitals"]);

		const ok = await applyBaseViewSync(app, s, plan!, plan!.diff.collisions);

		expect(ok).toBe(true);
		expect(s.managedBaseViews).toEqual(["Vitals"]);
		const written = await app.vault.read(file(app, "base.base"));
		expect(written).toContain('name: "Vitals"');
		expect(written).toContain("weight");
	});

	it("removes orphaned managed views no longer desired", async () => {
		const app = createFakeApp([{ path: "base.base", frontmatter: {}, body: EMPTY_BASE }]);
		const s = settings();

		const plan1 = await planBaseViewSync(app, s, [marker({ id: "weight", concern: ["Vitals"] })], []);
		await applyBaseViewSync(app, s, plan1!, []);

		// The marker no longer references "Vitals" -- its Base view is now orphaned.
		const plan2 = await planBaseViewSync(app, s, [], []);
		expect(plan2?.diff.toRemove).toEqual(["Vitals"]);

		await applyBaseViewSync(app, s, plan2!, []);
		expect(s.managedBaseViews).toEqual([]);
		const written = await app.vault.read(file(app, "base.base"));
		expect(written).not.toContain("Vitals");
	});
});

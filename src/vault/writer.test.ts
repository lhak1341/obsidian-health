import type { App, TFile } from "obsidian";
import { describe, expect, it } from "vitest";
import { createFakeApp } from "./fixtures/fake-app";
import type { MarkerNote } from "../core/types";
import { DEFAULT_SETTINGS, type HealthPluginSettings } from "../settings";
import {
	findMarkerFile,
	findProfileFile,
	findVisitFile,
	renameConcern,
	renameProfile,
	saveMarkerOrder,
	saveNewMarkerNote,
	saveProfileNote,
	saveProfileOrder,
	saveVisitNote,
	writeFrontmatter,
} from "./writer";

function markerNote(overrides: Partial<MarkerNote> = {}): MarkerNote {
	return { id: "test", name: "Test", aliases: [], type: "numeric", panel: "biochemical", concern: [], curated: false, blurb: "", ...overrides };
}

const paths: HealthPluginSettings = {
	...DEFAULT_SETTINGS,
	markersFolder: "markers",
	profilesFolder: "profiles",
	plansFolder: "plans",
	visitsFolder: "visits",
};

/** The fake's files are `TFile`-shaped but typed loosely so the fixture stays Obsidian-free; assert it back for callers that need the real type. */
function file(app: App, path: string): TFile {
	return app.vault.getAbstractFileByPath(path) as TFile;
}

function aliceVault(extra: Parameters<typeof createFakeApp>[1] = undefined) {
	return createFakeApp(
		[
			{ path: "profiles/alice.md", frontmatter: { sex: "f" } },
			{ path: "visits/alice/2024-01-01.md", frontmatter: { type: "lab-visit", person: "alice", date: "2024-01-01" } },
			{ path: "visits/alice/2024-02-01.md", frontmatter: { type: "lab-visit", person: "alice", date: "2024-02-01" } },
			{ path: "plans/alice-2024.md", frontmatter: { person: "alice", year: 2024 } },
		],
		extra,
	);
}

describe("writeFrontmatter", () => {
	it("doesn't resolve until metadataCache's \"changed\" event fires for the written file", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { name: "ALT" } }], { deferIndexing: true });
		const f = file(app, "markers/alt.md");

		let resolved = false;
		const write = writeFrontmatter(app, f, (frontmatter) => (frontmatter.order = 10)).then(() => (resolved = true));

		// Committed already (processFrontMatter's own promise settles), but the cache hasn't caught up.
		await Promise.resolve();
		await Promise.resolve();
		expect(resolved).toBe(false);
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.order).toBeUndefined();

		app.flushMetadataCache("markers/alt.md");
		await write;

		expect(resolved).toBe(true);
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.order).toBe(10);
	});

	it("resolves without waiting when the cache isn't deferred (default fixture behavior)", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { name: "ALT" } }]);
		const f = file(app, "markers/alt.md");

		await writeFrontmatter(app, f, (frontmatter) => (frontmatter.order = 10));

		expect(app.metadataCache.getFileCache(f)?.frontmatter?.order).toBe(10);
	});

	it("falls back to resolving after the timeout when \"changed\" never fires", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { name: "ALT" } }], { deferIndexing: true });
		const f = file(app, "markers/alt.md");

		await expect(writeFrontmatter(app, f, (frontmatter) => (frontmatter.order = 10), 10)).resolves.toBeUndefined();

		// The write itself committed even though the cache never caught up.
		app.flushMetadataCache("markers/alt.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.order).toBe(10);
	});
});

describe("renameProfile", () => {
	it("renames the profile file, the labs folder, and every visit/plan note's person field", async () => {
		const app = aliceVault();

		await renameProfile(app, paths, "alice", "bob");

		expect(app.vault.getAbstractFileByPath("profiles/bob.md")).not.toBeNull();
		expect(app.vault.getAbstractFileByPath("profiles/alice.md")).toBeNull();

		const visit1 = file(app, "visits/bob/2024-01-01.md");
		const visit2 = file(app, "visits/bob/2024-02-01.md");
		const plan = file(app, "plans/alice-2024.md");
		expect(app.metadataCache.getFileCache(visit1)?.frontmatter?.person).toBe("bob");
		expect(app.metadataCache.getFileCache(visit2)?.frontmatter?.person).toBe("bob");
		expect(app.metadataCache.getFileCache(plan)?.frontmatter?.person).toBe("bob");
	});

	it("updates settings.defaultProfile when it pointed at the renamed person", async () => {
		const app = aliceVault();
		const settings: HealthPluginSettings = { ...paths, defaultProfile: "alice" };

		await renameProfile(app, settings, "alice", "bob");

		expect(settings.defaultProfile).toBe("bob");
	});

	it("leaves settings.defaultProfile untouched when it pointed at someone else", async () => {
		const app = aliceVault();
		const settings: HealthPluginSettings = { ...paths, defaultProfile: "carol" };

		await renameProfile(app, settings, "alice", "bob");

		expect(settings.defaultProfile).toBe("carol");
	});

	it("throws before any writes when newPerson already exists", async () => {
		const app = createFakeApp([
			{ path: "profiles/alice.md", frontmatter: { sex: "f" } },
			{ path: "profiles/bob.md", frontmatter: { sex: "m" } },
		]);

		await expect(renameProfile(app, paths, "alice", "bob")).rejects.toThrow('"bob" already exists.');

		expect(app.vault.getAbstractFileByPath("profiles/alice.md")).not.toBeNull();
	});

	it("a mid-loop throw leaves the vault partially renamed -- earlier visits done, the failed one and later plans left under the old person id", async () => {
		const app = aliceVault({ failOn: (path) => path === "visits/bob/2024-02-01.md" });

		await expect(renameProfile(app, paths, "alice", "bob")).rejects.toThrow("simulated failure");

		// Already renamed by the time the throw happened: profile file, labs folder, first visit.
		expect(app.vault.getAbstractFileByPath("profiles/bob.md")).not.toBeNull();
		const visit1 = file(app, "visits/bob/2024-01-01.md");
		expect(app.metadataCache.getFileCache(visit1)?.frontmatter?.person).toBe("bob");

		// Orphaned: the visit that failed, and the plan note the loop never reached.
		const visit2 = file(app, "visits/bob/2024-02-01.md");
		const plan = file(app, "plans/alice-2024.md");
		expect(app.metadataCache.getFileCache(visit2)?.frontmatter?.person).toBe("alice");
		expect(app.metadataCache.getFileCache(plan)?.frontmatter?.person).toBe("alice");
	});
});

describe("findVisitFile", () => {
	it("finds a visit note by person and date", () => {
		const app = aliceVault();
		expect(findVisitFile(app, paths, "alice", "2024-01-01")?.path).toBe("visits/alice/2024-01-01.md");
	});

	it("returns null when no visit matches", () => {
		const app = aliceVault();
		expect(findVisitFile(app, paths, "alice", "2099-01-01")).toBeNull();
	});

	it("ignores notes that aren't lab-visit type", () => {
		const app = createFakeApp([{ path: "visits/alice/note.md", frontmatter: { type: "plan", person: "alice", date: "2024-01-01" } }]);
		expect(findVisitFile(app, paths, "alice", "2024-01-01")).toBeNull();
	});
});

describe("saveVisitNote", () => {
	it("creates a new visit note with the given values", async () => {
		const app = createFakeApp([]);

		await saveVisitNote(app, paths, "alice", "2024-03-01", { alt: 31.3, ast: "high" });

		const f = file(app, "visits/alice/2024-03-01.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter).toEqual({
			type: "lab-visit",
			person: "alice",
			date: "2024-03-01",
			alt: 31.3,
			ast: "high",
		});
	});

	it("overwrites an existing visit note's frontmatter wholesale, not merging", async () => {
		const app = createFakeApp([
			{ path: "visits/alice/2024-01-01.md", frontmatter: { type: "lab-visit", person: "alice", date: "2024-01-01", oldField: "stale" } },
		]);

		await saveVisitNote(app, paths, "alice", "2024-01-01", { alt: 31.3 });

		const f = file(app, "visits/alice/2024-01-01.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter).toEqual({ type: "lab-visit", person: "alice", date: "2024-01-01", alt: 31.3 });
	});
});

describe("saveNewMarkerNote", () => {
	it("creates a marker note with the given fields", async () => {
		const app = createFakeApp([]);

		await saveNewMarkerNote(app, paths, { id: "alt", name: "ALT", type: "numeric", unit: "U/L", panel: "liver", concern: ["liver"], curated: true });

		const f = file(app, "markers/alt.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter).toEqual({
			name: "ALT",
			type: "numeric",
			unit: "U/L",
			panel: "liver",
			concern: ["liver"],
			curated: true,
		});
	});

	it("omits unit when not provided", async () => {
		const app = createFakeApp([]);

		await saveNewMarkerNote(app, paths, { id: "qual", name: "Qual Marker", type: "qualitative", panel: "urine", concern: [], curated: false });

		const f = file(app, "markers/qual.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.unit).toBeUndefined();
	});
});

describe("findMarkerFile", () => {
	it("finds a marker note by id", () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { name: "ALT" } }]);
		expect(findMarkerFile(app, paths, "alt")?.path).toBe("markers/alt.md");
	});

	it("returns null when no marker matches", () => {
		const app = createFakeApp([]);
		expect(findMarkerFile(app, paths, "missing")).toBeNull();
	});
});

describe("saveMarkerOrder", () => {
	it("sets order: on the marker note", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { name: "ALT" } }]);

		await saveMarkerOrder(app, paths, "alt", 30);

		const f = file(app, "markers/alt.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.order).toBe(30);
	});

	it("is a no-op when the marker file doesn't exist", async () => {
		const app = createFakeApp([]);
		await expect(saveMarkerOrder(app, paths, "missing", 30)).resolves.toBeUndefined();
	});
});

describe("renameConcern", () => {
	it("rewrites concern: on every marker note that references it, case-insensitively", async () => {
		const app = createFakeApp([
			{ path: "markers/alt.md", frontmatter: { concern: ["Liver"] } },
			{ path: "markers/ast.md", frontmatter: { concern: ["liver"] } },
			{ path: "markers/hdl.md", frontmatter: { concern: ["lipids"] } },
		]);
		const markers = [
			markerNote({ id: "alt", concern: ["Liver"] }),
			markerNote({ id: "ast", concern: ["liver"] }),
			markerNote({ id: "hdl", concern: ["lipids"] }),
		];
		const settings: HealthPluginSettings = { ...paths, concernViewOverrides: {}, concernIcons: {} };

		await renameConcern(app, settings, markers, "liver", "Liver Panel");

		expect(app.metadataCache.getFileCache(file(app, "markers/alt.md"))?.frontmatter?.concern).toEqual(["Liver Panel"]);
		expect(app.metadataCache.getFileCache(file(app, "markers/ast.md"))?.frontmatter?.concern).toEqual(["Liver Panel"]);
		expect(app.metadataCache.getFileCache(file(app, "markers/hdl.md"))?.frontmatter?.concern).toEqual(["lipids"]);
	});

	it("de-dupes when a marker already carries the new concern alongside the old one", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { concern: ["liver", "Liver Panel"] } }]);
		const markers = [markerNote({ id: "alt", concern: ["liver", "Liver Panel"] })];
		const settings: HealthPluginSettings = { ...paths, concernViewOverrides: {}, concernIcons: {} };

		await renameConcern(app, settings, markers, "liver", "Liver Panel");

		expect(app.metadataCache.getFileCache(file(app, "markers/alt.md"))?.frontmatter?.concern).toEqual(["Liver Panel"]);
	});

	it("renames the matching key in concernViewOverrides and concernIcons", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { concern: ["liver"] } }]);
		const markers = [markerNote({ id: "alt", concern: ["liver"] })];
		const settings: HealthPluginSettings = {
			...paths,
			concernViewOverrides: { liver: "Bases/Liver.base" },
			concernIcons: { liver: "flask-conical" },
		};

		await renameConcern(app, settings, markers, "liver", "Liver Panel");

		expect(settings.concernViewOverrides).toEqual({ "liver panel": "Bases/Liver.base" });
		expect(settings.concernIcons).toEqual({ "liver panel": "flask-conical" });
	});

	it("leaves markers that don't reference the concern untouched", async () => {
		const app = createFakeApp([{ path: "markers/hdl.md", frontmatter: { concern: ["lipids"] } }]);
		const markers = [markerNote({ id: "hdl", concern: ["lipids"] })];
		const settings: HealthPluginSettings = { ...paths, concernViewOverrides: {}, concernIcons: {} };

		await renameConcern(app, settings, markers, "liver", "Liver Panel");

		expect(app.metadataCache.getFileCache(file(app, "markers/hdl.md"))?.frontmatter?.concern).toEqual(["lipids"]);
	});
});

describe("findProfileFile", () => {
	it("finds a profile note by person", () => {
		const app = aliceVault();
		expect(findProfileFile(app, paths, "alice")?.path).toBe("profiles/alice.md");
	});

	it("returns null when no profile matches", () => {
		const app = createFakeApp([]);
		expect(findProfileFile(app, paths, "missing")).toBeNull();
	});
});

describe("saveProfileNote", () => {
	it("creates a new profile note with the given fields", async () => {
		const app = createFakeApp([]);

		await saveProfileNote(app, paths, "carol", { sex: "f", dob: "1990-01-01", bloodType: "O+", allergies: ["penicillin"] });

		const f = file(app, "profiles/carol.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter).toEqual({
			sex: "f",
			dob: "1990-01-01",
			blood_type: "O+",
			allergies: ["penicillin"],
		});
	});

	it("omits optional fields left blank", async () => {
		const app = createFakeApp([]);

		await saveProfileNote(app, paths, "carol", { sex: "f" });

		const f = file(app, "profiles/carol.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter).toEqual({ sex: "f" });
	});

	it("edits an existing profile note, removing a field that's now blank", async () => {
		const app = createFakeApp([{ path: "profiles/alice.md", frontmatter: { sex: "f", blood_type: "A+" } }]);

		await saveProfileNote(app, paths, "alice", { sex: "f" });

		const f = file(app, "profiles/alice.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.blood_type).toBeUndefined();
	});
});

describe("saveProfileOrder", () => {
	it("sets order: on the profile note", async () => {
		const app = aliceVault();

		await saveProfileOrder(app, paths, "alice", 20);

		const f = file(app, "profiles/alice.md");
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.order).toBe(20);
	});

	it("is a no-op when the profile file doesn't exist", async () => {
		const app = createFakeApp([]);
		await expect(saveProfileOrder(app, paths, "missing", 20)).resolves.toBeUndefined();
	});
});

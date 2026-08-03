import type { App, TFile } from "obsidian";
import { describe, expect, it } from "vitest";
import { createFakeApp } from "./fixtures/fake-app";
import { DEFAULT_SETTINGS, type HealthPluginSettings } from "../settings";
import { renameProfile } from "./writer";

const paths: HealthPluginSettings = {
	...DEFAULT_SETTINGS,
	markersFolder: "markers",
	profilesFolder: "profiles",
	plansFolder: "plans",
	visitsFolder: "visits",
	basesFolder: "bases",
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

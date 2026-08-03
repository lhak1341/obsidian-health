import { describe, expect, it } from "vitest";
import { createFakeApp } from "./fixtures/fake-app";
import { scanVault, type VaultPaths } from "./reader";

const paths: VaultPaths = {
	markersFolder: "markers",
	profilesFolder: "profiles",
	plansFolder: "plans",
	visitsFolder: "visits",
};

describe("scanVault marker parsing", () => {
	it("parses a well-formed marker", async () => {
		const app = createFakeApp([
			{ path: "markers/alt.md", frontmatter: { name: "ALT", type: "numeric", unit: "U/L", panel: "liver", concern: ["Liver"] }, body: "Liver enzyme." },
		]);

		const { markers } = await scanVault(app, paths);

		expect(markers).toHaveLength(1);
		expect(markers[0]).toMatchObject({ id: "alt", name: "ALT", type: "numeric", unit: "U/L", panel: "liver", concern: ["Liver"], blurb: "Liver enzyme." });
	});

	it("silently drops a marker missing `name`", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { type: "numeric" } }]);

		const { markers } = await scanVault(app, paths);

		expect(markers).toEqual([]);
	});

	it("silently drops a marker with an invalid `type`", async () => {
		const app = createFakeApp([{ path: "markers/alt.md", frontmatter: { name: "ALT", type: "bogus" } }]);

		const { markers } = await scanVault(app, paths);

		expect(markers).toEqual([]);
	});

	it("skips a malformed ranges entry but keeps valid ones alongside it", async () => {
		const app = createFakeApp([
			{
				path: "markers/alt.md",
				frontmatter: {
					name: "ALT",
					type: "numeric",
					ranges: [{ sex: "not-a-sex", low: 0, high: 1 }, { sex: "m", low: 7, high: 55 }],
				},
			},
		]);

		const { markers } = await scanVault(app, paths);

		expect(markers[0].ranges).toEqual([{ sex: "m", age: undefined, low: 7, high: 55 }]);
	});

	it("ignores a malformed age band (wrong array length) but keeps the rest of the range", async () => {
		const app = createFakeApp([
			{ path: "markers/alt.md", frontmatter: { name: "ALT", type: "numeric", ranges: [{ sex: "any", age: [10], low: 7, high: 55 }] } },
		]);

		const { markers } = await scanVault(app, paths);

		expect(markers[0].ranges).toEqual([{ sex: "any", age: undefined, low: 7, high: 55 }]);
	});
});

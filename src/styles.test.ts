import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import { stylesOptions } from "../scripts/styles.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

async function buildStyles(): Promise<string> {
	const result = await esbuild.build({ ...stylesOptions, absWorkingDir: root, write: false, logLevel: "silent" });
	const [output] = result.outputFiles ?? [];
	if (!output) throw new Error("esbuild wrote no stylesheet");
	return output.text;
}

/** Each declaration of a vendored @lhak/style sheet, e.g. `--lk-surface: var(--background-primary)`. */
function packageDeclarations(sheet: string): string[] {
	const path = createRequire(join(root, "package.json")).resolve(`@lhak/style/${sheet}`);
	const css = readFileSync(path, "utf8");
	return [...css.matchAll(/([a-z-]+):\s*([^;{}]+);/g)].map(([, name, value]) => `${name}: ${value}`);
}

/** The body of the first rule whose selector list holds `selector` as one whole entry. */
function ruleBody(css: string, selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?:^|[},]\\s*)${escaped}\\s*(?:,[^{}]*)?\\{([^}]*)\\}`, "m").exec(css)?.[1] ?? "";
}

/** The value one property takes in a rule body. */
function value(body: string, property: string): string | undefined {
	return new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`).exec(body)?.[1]?.trim();
}

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".test.ts"))
		.map((e) => join(e.parentPath, e.name));
}

describe("built styles.css", () => {
	it("inlines every declaration of the @lhak/style alias layer", async () => {
		const css = await buildStyles();
		const decls = packageDeclarations("obsidian.css");
		expect(decls.length).toBeGreaterThan(50);
		expect(css).toContain(".lk-root {");
		for (const decl of decls) expect(css).toContain(decl);
	});

	it("uses no retired --hlth- variable", async () => {
		expect(await buildStyles()).not.toMatch(/--hlth-/);
	});

	it("draws no dot grid of its own, on the views or the widget card", async () => {
		const css = await buildStyles();
		expect(css).not.toMatch(/radial-gradient/);
		expect(css).not.toMatch(/background-image:/);
		expect(ruleBody(css, ".hlth-widget")).toMatch(/background:\s*var\(--lk-surface\);/);
	});

	it("draws the sparkline on a neutral lightness ramp, never the accent or a hue", async () => {
		const css = await buildStyles();
		expect(value(ruleBody(css, "svg.hlth-spk .hlth-spk-line"), "stroke")).toBe("var(--lk-text-muted)");
		const ramp = [
			value(ruleBody(css, "svg.hlth-spk .hlth-spk-secondary"), "stroke"),
			value(ruleBody(css, "svg.hlth-spk .hlth-spk-empty"), "stroke"),
			value(ruleBody(css, "svg.hlth-spk .hlth-spk-band"), "fill"),
		];
		for (const step of ramp) {
			expect(step).toMatch(/^color-mix\(in oklab, var\(--lk-text\) \d+%, var\(--lk-surface\)\)$/);
		}
	});

	it("sets the widget's font roles itself: names read body, labels, values and chip counts read heading", async () => {
		const css = await buildStyles();
		expect(value(ruleBody(css, ".hlth-widget-row-name"), "font-family")).toBe("var(--lk-font-interface)");
		for (const selector of [".hlth-widget-lbl", ".hlth-widget-row-value", ".hlth-widget-chip-count"]) {
			expect(value(ruleBody(css, selector), "font-family"), selector).toBe("var(--lk-font-label)");
		}
	});

	it("styles the shared icon picker's suggestion rows", async () => {
		const css = await buildStyles();
		expect(ruleBody(css, ".lk-icon-suggest-item")).toMatch(/display:\s*flex/);
		expect(css).not.toMatch(/hlth-icon-suggest/);
	});
});

describe("plugin source", () => {
	it("passes the @lhak/style adoption check (stylelint)", async () => {
		const { results } = await stylelint.lint({ files: [join(root, "styles.src.css")], cwd: root });
		expect(results.map((r) => Boolean(r.ignored))).toEqual([false]);
		expect(results[0]?.warnings.map((w) => `${w.line}: ${w.text}`)).toEqual([]);
	});

	it("sets no retired --hlth- variable", () => {
		const offenders = sourceFiles(join(root, "src")).filter((f) => /--hlth-/.test(readFileSync(f, "utf8")));
		expect(offenders).toEqual([]);
	});
});

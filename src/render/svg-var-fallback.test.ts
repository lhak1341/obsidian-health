import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Source-scanning guard for the screenshot-export gotcha (see `src/render/CLAUDE.md`):
 *  `html-to-image` bakes only computed `style` properties into its clone, so a `var(--foo)` used
 *  as a raw SVG *attribute* resolves to nothing in the isolated export and renders black. Every
 *  such `var()` needs an explicit fallback. Lines that assign through `.style`/`setProperty` are
 *  exempt -- those are the code path `html-to-image` does carry across. */

const SRC = fileURLToPath(new URL("../", import.meta.url));

/** A `var(--name` not immediately followed by a `,`. */
const NO_FALLBACK = /var\(\s*--[A-Za-z0-9-]+\s*\)/;
const ANY_VAR = /var\(\s*--[A-Za-z0-9-]+/;
const STYLE_PATH = /\.style\b|setProperty\(/;

function tsFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return tsFiles(path);
		if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) return [];
		return [path];
	});
}

interface Occurrence {
	file: string;
	line: number;
	text: string;
}

function scan(): { checked: Occurrence[]; violations: Occurrence[] } {
	const checked: Occurrence[] = [];
	const violations: Occurrence[] = [];
	for (const path of tsFiles(SRC)) {
		const rel = path.slice(SRC.length);
		readFileSync(path, "utf8").split("\n").forEach((text, i) => {
			if (STYLE_PATH.test(text) || !ANY_VAR.test(text)) return;
			const occurrence = { file: rel, line: i + 1, text: text.trim() };
			checked.push(occurrence);
			if (NO_FALLBACK.test(text)) violations.push(occurrence);
		});
	}
	return { checked, violations };
}

describe("SVG-attribute CSS vars carry a fallback", () => {
	const { checked, violations } = scan();

	it("finds attribute-path var() usages to check", () => {
		// Liveness: if the walker breaks or these files move, the suite must fail rather than
		// pass by scanning nothing. Both named files are the ones CLAUDE.md points at.
		expect(checked.length).toBeGreaterThan(0);
		expect(checked.filter((c) => c.file === "render/charts.ts").length).toBeGreaterThan(0);
		expect(checked.filter((c) => c.file === "render/format.ts").length).toBeGreaterThan(0);
	});

	it("has no attribute-path var() without a fallback", () => {
		expect(violations.map((v) => `${v.file}:${v.line}  ${v.text}`)).toEqual([]);
	});
});

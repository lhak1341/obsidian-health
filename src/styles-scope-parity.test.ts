import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** `styles.css` carries two parallel per-view selector lists: the `--hlth-*` token block, scoped
 *  to the `.health-*-outer` view roots, and the interactive-element rules (`.hlth-pill`,
 *  `.hlth-showall-btn`), scoped to the inner `.hlth-*` container classes. Adding a view to one
 *  list and not the other leaves that view's buttons and pills unstyled -- a silent visual break,
 *  not an error. This asserts the two lists stay the same width and that every interactive rule
 *  is scoped to the same view set as every other. */

const CSS = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const INTERACTIVE = /\.hlth-(?:pill|showall-btn)\b/;
const TOKEN_DECLARATION = "--hlth-bg:";

/** Rules in source order as `{ selector, body }`. Handles one level of at-rule nesting
 *  (`@media { .a { } }`): the selector is always the text just before the rule's own opening
 *  brace, and the body is everything after it. */
function rules(): { selector: string; body: string }[] {
	return CSS.split("}")
		.map((chunk) => chunk.split("{"))
		.filter((parts) => parts.length >= 2)
		// `.split(";").pop()` drops the top-of-file `@import` statements that share a chunk with
		// the first rule's selector list.
		.map((parts) => ({ selector: (parts[parts.length - 2].split(";").pop() ?? "").trim(), body: parts[parts.length - 1] }))
		.filter((rule) => rule.selector !== "" && !rule.selector.startsWith("@"));
}

/** The view scopes a comma-separated selector list is keyed on, e.g. `.hlth-dash .hlth-pill,
 *  .hlth-planner .hlth-pill` -> `[".hlth-dash", ".hlth-planner"]`. */
function scopes(selector: string): string[] {
	return selector
		.split(",")
		.map((one) => /^\s*(\.[A-Za-z0-9_-]+)/.exec(one)?.[1] ?? "")
		.filter(Boolean);
}

describe("styles.css per-view selector lists stay in sync", () => {
	const all = rules();
	const tokenList = all.find((rule) => rule.body.includes(TOKEN_DECLARATION))?.selector;
	const interactiveLists = all.filter((rule) => INTERACTIVE.test(rule.selector)).map((rule) => rule.selector);

	it("finds both lists to compare", () => {
		// Liveness: a parser that stops matching must fail here rather than pass by comparing
		// two empty sets.
		expect(tokenList).toBeDefined();
		expect(scopes(tokenList ?? "").length).toBeGreaterThanOrEqual(3);
		expect(interactiveLists.length).toBeGreaterThanOrEqual(6);
	});

	it("scopes every interactive rule to as many views as the token block", () => {
		const width = scopes(tokenList ?? "").length;
		const wrong = interactiveLists.filter((selector) => scopes(selector).length !== width);
		expect(wrong).toEqual([]);
	});

	it("scopes every interactive rule to the same view set", () => {
		const key = (selector: string) => scopes(selector).sort().join(",");
		expect([...new Set(interactiveLists.map(key))]).toHaveLength(1);
	});
});

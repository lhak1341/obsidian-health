import { describe, expect, it } from "vitest";
import { resolveFontVar, resolveFontVars, setFontVar, type FontVarStyle } from "./fonts";
import { DEFAULT_SETTINGS } from "./settings";

describe("resolveFontVar", () => {
	it("resolves the default \"health\" choice to null (theme-following, no override)", () => {
		expect(resolveFontVar("health", "")).toBeNull();
	});

	it("resolves each obsidian-* choice to its Obsidian var", () => {
		expect(resolveFontVar("obsidian-interface", "")).toBe("var(--font-interface, sans-serif)");
		expect(resolveFontVar("obsidian-text", "")).toBe("var(--font-text, sans-serif)");
		expect(resolveFontVar("obsidian-monospace", "")).toBe("var(--font-monospace, monospace)");
	});

	it("resolves \"custom\" to the custom string, or null when it is empty", () => {
		expect(resolveFontVar("custom", "Inter")).toBe("Inter");
		expect(resolveFontVar("custom", "")).toBeNull();
	});
});

describe("resolveFontVars", () => {
	it("resolves the default settings to no overrides", () => {
		expect(resolveFontVars(DEFAULT_SETTINGS)).toEqual({ fh: null, fb: null, fm: null });
	});

	it("resolves each slot from its own choice and custom value", () => {
		const settings = { ...DEFAULT_SETTINGS, fontHeading: "custom" as const, fontHeadingCustom: "Inter", fontMono: "obsidian-monospace" as const };

		expect(resolveFontVars(settings)).toEqual({ fh: "Inter", fb: null, fm: "var(--font-monospace, monospace)" });
	});
});

describe("setFontVar", () => {
	function fakeStyle(): FontVarStyle & { props: Map<string, string> } {
		const props = new Map<string, string>();
		return {
			props,
			setProperty: (prop: string, value: string | null) => void props.set(prop, value ?? ""),
			removeProperty: (prop: string) => {
				const old = props.get(prop) ?? "";
				props.delete(prop);
				return old;
			},
		};
	}

	it("sets a resolved value as the inline property", () => {
		const style = fakeStyle();

		setFontVar(style, "--hlth-fh", "Inter");

		expect(style.props.get("--hlth-fh")).toBe("Inter");
	});

	it("removes the inline property for null, so the theme-following class default shows through", () => {
		const style = fakeStyle();
		setFontVar(style, "--hlth-fh", "Inter");

		setFontVar(style, "--hlth-fh", null);

		expect(style.props.has("--hlth-fh")).toBe(false);
	});
});

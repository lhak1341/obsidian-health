import type { FontChoice, HealthPluginSettings } from "./settings";

// Fallbacks below are belt-and-suspenders only -- Obsidian always defines --font-interface/
// --font-text/--font-monospace in a live vault -- but src/render/svg-var-fallback.test.ts scans
// the whole tree for var() without one, so these carry one like every other var() outside a
// .style/setProperty assignment.
const FONT_VAR_RESOLVERS: Record<FontChoice, (custom: string) => string | null> = {
	"health":             () => null,
	"obsidian-interface": () => "var(--font-interface, sans-serif)",
	"obsidian-text":      () => "var(--font-text, sans-serif)",
	"obsidian-monospace": () => "var(--font-monospace, monospace)",
	"custom":             custom => custom || null,
};

export function resolveFontVar(choice: FontChoice, custom: string): string | null {
	return FONT_VAR_RESOLVERS[choice](custom);
}

/** Resolved values for `--hlth-fh/fb/fm`; null means "follow the theme" (no override). */
export interface FontVars {
	fh: string | null;
	fb: string | null;
	fm: string | null;
}

type FontSettings = Pick<HealthPluginSettings, "fontHeading" | "fontHeadingCustom" | "fontBody" | "fontBodyCustom" | "fontMono" | "fontMonoCustom">;

export function resolveFontVars(settings: FontSettings): FontVars {
	return {
		fh: resolveFontVar(settings.fontHeading, settings.fontHeadingCustom),
		fb: resolveFontVar(settings.fontBody, settings.fontBodyCustom),
		fm: resolveFontVar(settings.fontMono, settings.fontMonoCustom),
	};
}

/** The style surface `setFontVar` touches -- narrowed so a test can pass a plain fake. */
export type FontVarStyle = Pick<CSSStyleDeclaration, "setProperty" | "removeProperty">;

/** Sets a resolved font var as inline style, or removes it for null -- removing (not setting a
 *  default) is what lets the `.health-*-outer` class rule's theme-following value show through. */
export function setFontVar(style: FontVarStyle, prop: string, value: string | null): void {
	if (value) style.setProperty(prop, value);
	else style.removeProperty(prop);
}

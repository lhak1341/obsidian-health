import type { FontChoice } from "./settings";

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

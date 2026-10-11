import { labelForConcern } from "./concern-registry";

/** Composes a concern header's already-resolved Base view name (label, or a `concernViewOverrides`
 *  entry) with the active profile, so a concern click opens a per-profile view instead of the
 *  single shared one. */
export function concernViewNameForProfile(viewName: string, person: string): string {
	return `${viewName} — ${person}`;
}

/** Resolves a normalized concern key to its unsuffixed Base view name -- a `concernViewOverrides`
 *  entry when set, else the concern's display label. The one place this override-or-label logic
 *  lives; both `openConcernBase` (dashboard-view.ts, click-time lookup) and the Base-view generator
 *  (`base-views.ts`, write-time generation) call this so the two can never independently drift. */
export function resolveConcernViewName(key: string, overrides: Record<string, string>): string {
	return overrides[key]?.trim() || labelForConcern(key);
}

/** Folds a raw frontmatter concern string to its identity key -- the single definition of "same
 *  concern" regardless of authored casing/whitespace. Display text is a presentation concern
 *  (concern-registry.ts's labelForConcern), kept separate so this stays Obsidian-free. */
export function normalizeConcernKey(raw: string): string {
	return raw.trim().toLowerCase();
}

/** Groups items by every concern id they carry (multi-membership: an item with 2 concerns lands
 *  in 2 groups) -- shared by the domain core's concern grouping and the settings tab's row-order UI. */
export function groupByConcern<T>(items: T[], getConcern: (item: T) => string[]): Map<string, T[]> {
	const byConcern = new Map<string, T[]>();
	for (const item of items) {
		for (const concern of getConcern(item)) {
			const group = byConcern.get(concern) ?? [];
			group.push(item);
			byConcern.set(concern, group);
		}
	}
	return byConcern;
}

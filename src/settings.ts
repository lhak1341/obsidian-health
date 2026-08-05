import { normalizeConcernKey } from "./core/dashboard";
import { labelForConcern } from "./render/concern-registry";
import { DEFAULT_VAULT_PATHS, type VaultPaths } from "./vault/reader";

export type WidgetTier = "chip" | "list";

export interface HealthPluginSettings extends VaultPaths {
	deadbandPct: number;
	widgetTier: WidgetTier;
	widgetMaxRows: number;
	widgetShowSparkline: boolean;
	showAllDefault: boolean;
	/** Path to the single Base file whose views a concern header click switches between --
	 *  see `openConcernBase` in dashboard-view.ts. */
	basePath: string;
	/** Per-concern override of the Base *view name* to switch to, for when it differs from the
	 *  concern's display label (dashboard-view.ts falls back to the label when no override is set). */
	concernViewOverrides: Record<string, string>;
	/** Icon override per concern id, for concerns not in the hardcoded CONCERN_CONFIG map
	 *  (render/concern-registry.ts) -- e.g. after renaming a concern, or a wholly new one.
	 *  Purely cosmetic, no vault write. */
	concernIcons: Record<string, string>;
	defaultProfile?: string;
}

/** Renames a concern's key in both settings maps -- the settings-side half of a concern rename
 *  (the vault-side half, rewriting marker `concern:` frontmatter, is renameConcern in vault/writer.ts).
 *  `oldConcern` is already a normalized key; `newConcern` is the raw text the user typed, so it's
 *  re-normalized here to keep both maps keyed by identity, not display casing. */
export function renameConcernInSettings(settings: HealthPluginSettings, oldConcern: string, newConcern: string): void {
	const newKey = normalizeConcernKey(newConcern);
	if (settings.concernViewOverrides[oldConcern] !== undefined) {
		settings.concernViewOverrides[newKey] = settings.concernViewOverrides[oldConcern];
		delete settings.concernViewOverrides[oldConcern];
	} else {
		// No override existed, so the concern header was defaulting to its old label as the Base
		// view name. Renaming would otherwise silently break that lookup -- the Base file's view
		// keeps the old name, but the new label is what gets looked up post-rename. Seed an
		// explicit override pointing back at the old (still-correct) view name.
		settings.concernViewOverrides[newKey] = labelForConcern(oldConcern);
	}
	if (settings.concernIcons[oldConcern] !== undefined) {
		settings.concernIcons[newKey] = settings.concernIcons[oldConcern];
		delete settings.concernIcons[oldConcern];
	}
}

export const DEFAULT_SETTINGS: HealthPluginSettings = {
	...DEFAULT_VAULT_PATHS,
	deadbandPct: 0.03,
	widgetTier: "list",
	widgetMaxRows: 5,
	widgetShowSparkline: true,
	showAllDefault: false,
	basePath: "base/Health.base",
	concernViewOverrides: {},
	concernIcons: {},
	defaultProfile: undefined,
};

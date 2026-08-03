import { DEFAULT_VAULT_PATHS, type VaultPaths } from "./vault/reader";

export type WidgetTier = "chip" | "list";

export interface HealthPluginSettings extends VaultPaths {
	deadbandPct: number;
	widgetTier: WidgetTier;
	widgetMaxRows: number;
	widgetShowSparkline: boolean;
	showAllDefault: boolean;
	concernBaseOverrides: Record<string, string>;
	/** Icon override per concern id, for concerns not in the hardcoded CONCERN_CONFIG map
	 *  (render/concern-registry.ts) -- e.g. after renaming a concern, or a wholly new one.
	 *  Purely cosmetic, no vault write. */
	concernIcons: Record<string, string>;
	defaultProfile?: string;
}

/** Renames a concern's key in both settings maps -- the settings-side half of a concern rename
 *  (the vault-side half, rewriting marker `concern:` frontmatter, is renameConcern in vault/writer.ts). */
export function renameConcernInSettings(settings: HealthPluginSettings, oldConcern: string, newConcern: string): void {
	if (settings.concernBaseOverrides[oldConcern] !== undefined) {
		settings.concernBaseOverrides[newConcern] = settings.concernBaseOverrides[oldConcern];
		delete settings.concernBaseOverrides[oldConcern];
	}
	if (settings.concernIcons[oldConcern] !== undefined) {
		settings.concernIcons[newConcern] = settings.concernIcons[oldConcern];
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
	concernBaseOverrides: {},
	concernIcons: {},
	defaultProfile: undefined,
};

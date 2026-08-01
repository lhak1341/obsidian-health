import { DEFAULT_VAULT_PATHS, type VaultPaths } from "./vault/reader";

export type WidgetTier = "chip" | "list";

export interface HealthPluginSettings extends VaultPaths {
	deadbandPct: number;
	widgetTier: WidgetTier;
	widgetMaxRows: number;
	widgetShowSparkline: boolean;
	showAllDefault: boolean;
	concernBaseOverrides: Record<string, string>;
	defaultProfile?: string;
}

export const DEFAULT_SETTINGS: HealthPluginSettings = {
	...DEFAULT_VAULT_PATHS,
	deadbandPct: 0.03,
	widgetTier: "list",
	widgetMaxRows: 5,
	widgetShowSparkline: true,
	showAllDefault: false,
	concernBaseOverrides: {},
	defaultProfile: undefined,
};

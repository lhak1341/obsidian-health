import type { App } from "obsidian";
import type HealthPlugin from "./main";

/** Shared handle a settings-tab section needs from its host tab: identity (app/plugin), the two
 *  lifecycle callbacks every mutating action ends with (persist, then re-render the whole tab so
 *  other sections reading the same snapshot stay in sync), and the dirty flag that defers the
 *  open-dashboard refresh to tab close instead of firing on every drag/keystroke. */
export interface SettingsSectionContext {
	app: App;
	plugin: HealthPlugin;
	markDirty(): void;
	save(): Promise<void>;
	/** Re-render the tab from the currently-cached snapshot -- no vault rescan. */
	rerender(): void;
	/** Rescan the vault, then re-render. Needed after a write whose effect on the snapshot isn't
	 *  safe to hand-patch in memory (contrast ConcernSection.renameConcern, which patches). */
	reload(): Promise<void>;
}

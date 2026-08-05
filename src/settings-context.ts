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
	/** Persists without marking dirty -- only for mutations that don't affect the open dashboard
	 *  (e.g. Concern -> Base override CRUD, which only changes a header's clicked-through link). */
	saveQuiet(): Promise<void>;
	/** Re-render the tab from the currently-cached snapshot -- no vault rescan. */
	rerender(): void;
	/** Rescan the vault, then re-render. Needed after a write whose effect on the snapshot isn't
	 *  safe to hand-patch in memory (contrast ConcernSection.renameConcern, which patches). */
	reload(): Promise<void>;
}

/** Writes sparse `order:` values (10, 20, 30…) for a full drag-reordered list, one vault write per
 *  item via `persistOne`, then marks the tab dirty -- shared by ConcernSection.saveConcernOrder and
 *  ProfileSection.saveProfileOrder, which otherwise duplicated this exact algorithm. Mutates each
 *  item's `order` field in place, matching how both callers already read it back for re-rendering.
 *  Deliberately calls `markDirty()`, not `reload()` -- a full reload would re-scan and rebuild the
 *  whole tab mid-drag, collapsing every open `<details>` accordion. */
export async function saveOrder<T extends { order?: number }>(
	ctx: SettingsSectionContext,
	order: T[],
	getId: (item: T) => string,
	persistOne: (id: string, order: number) => Promise<void>,
): Promise<void> {
	order.forEach((item, i) => (item.order = (i + 1) * 10));
	await Promise.all(order.map((item) => persistOne(getId(item), item.order!)));
	ctx.markDirty();
}

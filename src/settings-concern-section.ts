import { Notice, Setting } from "obsidian";
import { groupByConcern, normalizeConcernKey } from "./core/dashboard";
import type { MarkerNote } from "./core/types";
import { labelForConcern } from "./render/concern-registry";
import { renderDragReorderList } from "./render/drag-reorder";
import { IconSuggest } from "./render/icon-suggest";
import { iconForConcern } from "./render/icons";
import type { SettingsSectionContext } from "./settings-context";
import type { VaultSnapshot } from "./vault/reader";
import { renameConcern as renameConcernInVault, saveMarkerOrder } from "./vault/writer";

/** Concern → Base overrides, per-concern row order, and concern rename/icon -- the concern-taxonomy
 *  half of the settings tab, split out from profile management (settings-profile-section.ts). */
export class ConcernSection {
	constructor(private readonly ctx: SettingsSectionContext) {}

	render(root: HTMLElement, snapshot: VaultSnapshot | undefined): void {
		this.renderConcernOverrides(root);
		this.renderRowOrder(root, snapshot);
	}

	private renderConcernOverrides(root: HTMLElement): void {
		new Setting(root).setName("Concern → Base overrides").setHeading();
		root.createEl("p", {
			cls: "setting-item-description",
			text: "By convention a concern header opens a .base file named after the concern. Override the target here when the name differs.",
		});
		const items = root.createDiv("setting-group").createDiv("setting-items");

		const settings = this.ctx.plugin.settings;
		const overrides = settings.concernBaseOverrides;

		for (const concern of Object.keys(overrides)) {
			new Setting(items)
				.setName(labelForConcern(concern))
				.addText((text) =>
					text.setValue(overrides[concern]).onChange((value) => {
						overrides[concern] = value;
						void this.ctx.saveQuiet();
					}),
				)
				.addExtraButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Remove override")
						.onClick(() => {
							delete overrides[concern];
							void this.ctx.saveQuiet();
							this.ctx.rerender();
						}),
				);
		}

		let newConcern = "";
		let newBase = "";
		new Setting(items)
			.setName("Add override")
			.addText((text) => text.setPlaceholder("concern").onChange((value) => (newConcern = value)))
			.addText((text) => text.setPlaceholder("Base file path").onChange((value) => (newBase = value)))
			.addButton((btn) =>
				btn.setButtonText("Add").onClick(() => {
					const key = normalizeConcernKey(newConcern);
					if (!key || !newBase.trim()) {
						new Notice("Both concern and Base path are required.");
						return;
					}
					overrides[key] = newBase.trim();
					void this.ctx.saveQuiet();
					this.ctx.rerender();
				}),
			);
	}

	private async renameConcern(snapshot: VaultSnapshot | undefined, oldConcern: string, newConcernRaw: string): Promise<void> {
		const newConcern = newConcernRaw.trim();
		if (!newConcern || newConcern === oldConcern) {
			new Notice("Enter a different name.");
			return;
		}

		await renameConcernInVault(this.ctx.app, this.ctx.plugin.settings, snapshot?.markers ?? [], oldConcern, newConcern);

		// Patch the in-memory snapshot instead of `reload()`-ing: `app.metadataCache` can still be
		// serving the pre-rename frontmatter for a beat after `processFrontMatter`'s promise resolves
		// (its own re-index runs on a separate, unawaited pass), so an immediate re-scan risks reading
		// stale concern values right back for the very markers we just wrote.
		for (const marker of snapshot?.markers ?? []) {
			marker.concern = marker.concern.map((c) => (normalizeConcernKey(c) === oldConcern ? newConcern : c));
		}

		await this.ctx.save();
		new Notice(`Renamed "${oldConcern}" to "${newConcern}".`);
		this.ctx.rerender();
	}

	/** Which dashboard column (left/center/right) a concern lands in is NOT configurable here --
	 *  it's a hardcoded, deliberately-stable pin (CONCERN_CONFIG in render/concern-registry.ts).
	 *  Row order below only controls marker order within a concern. */
	private renderRowOrder(root: HTMLElement, snapshot: VaultSnapshot | undefined): void {
		new Setting(root).setName("Row order").setHeading();
		root.createEl("p", {
			cls: "setting-item-description",
			text: "Drag to reorder markers within a concern. Dropping writes order: to every marker note in that group -- no manual renumbering.",
		});
		const items = root.createDiv("setting-group").createDiv("setting-items");

		const byConcern = groupByConcern(snapshot?.markers ?? [], (marker) => marker.concern.map(normalizeConcernKey));

		const concerns = [...byConcern.keys()].sort((a, b) => a.localeCompare(b));
		if (concerns.length === 0) {
			items.createEl("p", { cls: "setting-item-description", text: "No markers with a concern yet." });
			return;
		}

		for (const concern of concerns) {
			const markers = byConcern.get(concern)!.sort((a, b) => (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name));
			this.renderConcernOrderList(items, concern, markers, snapshot);
		}
	}

	private renderConcernOrderList(root: HTMLElement, concern: string, markers: MarkerNote[], snapshot: VaultSnapshot | undefined): void {
		const details = root.createEl("details", { cls: "hlth-settings-details" });
		details.createEl("summary", { text: `${labelForConcern(concern)} (${markers.length})` });

		let renameTo = "";
		new Setting(details.createDiv())
			.setName("Rename concern")
			.setDesc("Rewrites concern: on every marker note in this group -- a real rename, not a display override. Carries over the Base override above and the icon below, if either is set.")
			.addText((text) => text.setPlaceholder(labelForConcern(concern)).onChange((value) => (renameTo = value)))
			.addButton((btn) => btn.setButtonText("Rename").onClick(() => void this.renameConcern(snapshot, concern, renameTo)));

		const icons = this.ctx.plugin.settings.concernIcons;
		const iconSetting = new Setting(details.createDiv())
			.setName("Icon")
			.setDesc('Lucide icon name (e.g. "activity", "droplet") shown next to this column\'s header. Leave blank for the built-in default.');
		const preview = iconSetting.controlEl.createSpan({ cls: "hlth-icon-preview" });
		preview.appendChild(iconForConcern(concern, icons));
		iconSetting.addText((text) => {
			new IconSuggest(this.ctx.app, text.inputEl);
			text.setPlaceholder("(default)")
				.setValue(icons[concern] ?? "")
				.onChange((value) => {
					if (value.trim()) icons[concern] = value.trim();
					else delete icons[concern];
					preview.empty();
					preview.appendChild(iconForConcern(concern, icons));
					void this.ctx.save();
				});
		});

		const list = details.createDiv({ cls: "hlth-order-list" });
		renderDragReorderList(list, markers, { getId: (m) => m.id, getLabel: (m) => m.name }, (order) => void this.saveConcernOrder(order));
	}

	/** Writes sparse `order:` values (10, 20, 30…) for a concern's full list so a future drag only
	 *  ever needs to touch that one moved marker's file again, not renumber its neighbors.
	 *  Updates the in-memory snapshot instead of a full `reload()` -- reloading re-scans the vault
	 *  and rebuilds the whole tab, which would collapse every open `<details>` accordion mid-drag. */
	private async saveConcernOrder(order: MarkerNote[]): Promise<void> {
		const paths = this.ctx.plugin.settings;
		order.forEach((marker, i) => (marker.order = (i + 1) * 10));
		await Promise.all(order.map((marker) => saveMarkerOrder(this.ctx.app, paths, marker.id, marker.order!)));
		this.ctx.markDirty();
	}
}

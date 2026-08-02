import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { parseAllergies, validateProfileInput } from "./core/entry";
import type { MarkerNote, PersonSex, ProfileNote } from "./core/types";
import type HealthPlugin from "./main";
import { renderDragReorderList } from "./render/drag-reorder";
import { IconSuggest } from "./render/icon-suggest";
import { iconForConcern } from "./render/icons";
import type { VaultSnapshot } from "./vault/reader";
import {
	renameConcern as renameConcernInVault,
	renameProfile as renameProfileInVault,
	saveMarkerOrder,
	saveProfileNote,
	saveProfileOrder,
} from "./vault/writer";
import { renameConcernInSettings, type WidgetTier } from "./settings";

interface NewProfileDraft {
	person: string;
	sex: PersonSex;
	dob: string;
	bloodType: string;
	allergies: string;
}

export class HealthSettingTab extends PluginSettingTab {
	private snapshot?: VaultSnapshot;
	private newProfile: NewProfileDraft = { person: "", sex: "m", dob: "", bloodType: "", allergies: "" };
	// The settings modal is an overlay -- an open dashboard behind it can't be seen anyway, so
	// there's no point refreshing it after every single drag. Batch to one rescan on tab close.
	private dirty = false;

	constructor(
		app: App,
		private readonly plugin: HealthPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.createDiv({ text: "Loading…" });
		void this.reload();
	}

	hide(): void {
		if (this.dirty) {
			this.plugin.refreshOpenViews();
			this.dirty = false;
		}
	}

	private async reload(): Promise<void> {
		this.snapshot = await this.plugin.scanVault(this.plugin.settings);
		this.renderContent();
	}

	private async save(): Promise<void> {
		await this.plugin.saveSettings();
	}

	private renderContent(): void {
		const root = this.containerEl;
		root.empty();

		this.renderVaultPaths(root);
		this.renderDashboardSettings(root);
		this.renderWidgetSettings(root);
		this.renderConcernOverrides(root);
		this.renderRowOrder(root);
		this.renderProfileOrder(root);
		this.renderProfiles(root);
	}

	private renderVaultPaths(root: HTMLElement): void {
		new Setting(root).setName("Vault paths").setHeading();
		const items = root.createDiv("setting-group").createDiv("setting-items");

		const settings = this.plugin.settings;
		const pathField = (name: string, key: "markersFolder" | "profilesFolder" | "plansFolder" | "visitsFolder" | "basesFolder") => {
			new Setting(items).setName(name).addText((text) => {
				text.setValue(settings[key]).onChange((value) => {
					settings[key] = value.trim();
					void this.save();
				});
				// Re-scan on blur (not per-keystroke): the Profiles section and default-profile
				// dropdown below are built from a vault snapshot cached at tab-open/last reload.
				text.inputEl.addEventListener("blur", () => void this.reload());
			});
		};

		pathField("Markers folder", "markersFolder");
		pathField("Profiles folder", "profilesFolder");
		pathField("Plans folder", "plansFolder");
		pathField("Visits folder", "visitsFolder");
		pathField("Bases folder", "basesFolder");
	}

	private renderDashboardSettings(root: HTMLElement): void {
		new Setting(root).setName("Dashboard").setHeading();
		const items = root.createDiv("setting-group").createDiv("setting-items");
		const settings = this.plugin.settings;

		new Setting(items)
			.setName("Arrow deadband")
			.setDesc("Percent change below which the trend arrow shows flat.")
			.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(String(Math.round(settings.deadbandPct * 1000) / 10));
				text.onChange((value) => {
					const pct = Number(value);
					if (Number.isFinite(pct) && pct >= 0) settings.deadbandPct = pct / 100;
					void this.save();
				});
			});

		new Setting(items)
			.setName("Show all markers by default")
			.setDesc("Opens the dashboard with the full marker list instead of just the curated set.")
			.addToggle((toggle) =>
				toggle.setValue(settings.showAllDefault).onChange((value) => {
					settings.showAllDefault = value;
					void this.save();
				}),
			);

		new Setting(items)
			.setName("Default profile")
			.setDesc("Profile the dashboard loads on open.")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "(first profile)");
				for (const profile of this.snapshot?.profiles ?? []) dropdown.addOption(profile.person, profile.person);
				dropdown.setValue(settings.defaultProfile ?? "");
				dropdown.onChange((value) => {
					settings.defaultProfile = value || undefined;
					void this.save();
				});
			});
	}

	private renderWidgetSettings(root: HTMLElement): void {
		new Setting(root).setName("lhak-dashboard widget").setHeading();
		const items = root.createDiv("setting-group").createDiv("setting-items");
		const settings = this.plugin.settings;

		new Setting(items)
			.setName("Tier")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("chip", "Chip")
					.addOption("list", "List")
					.setValue(settings.widgetTier)
					.onChange((value) => {
						settings.widgetTier = value as WidgetTier;
						void this.save();
					}),
			);

		new Setting(items)
			.setName("Max rows")
			.setDesc("Applies to the List tier.")
			.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(String(settings.widgetMaxRows));
				text.onChange((value) => {
					const rows = Number(value);
					if (Number.isInteger(rows) && rows > 0) settings.widgetMaxRows = rows;
					void this.save();
				});
			});

		new Setting(items)
			.setName("Show sparkline")
			.setDesc("Applies to the List tier.")
			.addToggle((toggle) =>
				toggle.setValue(settings.widgetShowSparkline).onChange((value) => {
					settings.widgetShowSparkline = value;
					void this.save();
				}),
			);
	}

	private renderConcernOverrides(root: HTMLElement): void {
		new Setting(root).setName("Concern → Base overrides").setHeading();
		root.createEl("p", {
			cls: "setting-item-description",
			text: "By convention a concern header opens a .base file named after the concern. Override the target here when the name differs.",
		});
		const items = root.createDiv("setting-group").createDiv("setting-items");

		const settings = this.plugin.settings;
		const overrides = settings.concernBaseOverrides;

		for (const concern of Object.keys(overrides)) {
			new Setting(items)
				.setName(concern)
				.addText((text) =>
					text.setValue(overrides[concern]).onChange((value) => {
						overrides[concern] = value;
						void this.save();
					}),
				)
				.addExtraButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Remove override")
						.onClick(() => {
							delete overrides[concern];
							void this.save();
							this.renderContent();
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
					const concern = newConcern.trim();
					if (!concern || !newBase.trim()) {
						new Notice("Both concern and Base path are required.");
						return;
					}
					overrides[concern] = newBase.trim();
					void this.save();
					this.renderContent();
				}),
			);
	}

	private async renameConcern(oldConcern: string, newConcernRaw: string): Promise<void> {
		const newConcern = newConcernRaw.trim();
		if (!newConcern || newConcern === oldConcern) {
			new Notice("Enter a different name.");
			return;
		}

		await renameConcernInVault(this.app, this.plugin.settings, this.snapshot?.markers ?? [], oldConcern, newConcern);
		renameConcernInSettings(this.plugin.settings, oldConcern, newConcern);

		// Patch the in-memory snapshot instead of `reload()`-ing: `app.metadataCache` can still be
		// serving the pre-rename frontmatter for a beat after `processFrontMatter`'s promise resolves
		// (its own re-index runs on a separate, unawaited pass), so an immediate re-scan risks reading
		// stale concern values right back for the very markers we just wrote.
		for (const marker of this.snapshot?.markers ?? []) {
			marker.concern = marker.concern.map((c) => (c === oldConcern ? newConcern : c));
		}

		await this.save();
		this.dirty = true;
		new Notice(`Renamed "${oldConcern}" to "${newConcern}".`);
		this.renderContent();
	}

	/** Which dashboard column (left/center/right) a concern lands in is NOT configurable here --
	 *  it's a hardcoded, deliberately-stable pin (LEFT_CONCERNS/CENTER_CONCERNS in dashboard-view.ts,
	 *  next to columnForConcern). Row order below only controls marker order within a concern. */
	private renderRowOrder(root: HTMLElement): void {
		new Setting(root).setName("Row order").setHeading();
		root.createEl("p", {
			cls: "setting-item-description",
			text: "Drag to reorder markers within a concern. Dropping writes order: to every marker note in that group -- no manual renumbering.",
		});
		const items = root.createDiv("setting-group").createDiv("setting-items");

		const byConcern = new Map<string, MarkerNote[]>();
		for (const marker of this.snapshot?.markers ?? []) {
			for (const concern of marker.concern) {
				const group = byConcern.get(concern) ?? [];
				group.push(marker);
				byConcern.set(concern, group);
			}
		}

		const concerns = [...byConcern.keys()].sort((a, b) => a.localeCompare(b));
		if (concerns.length === 0) {
			items.createEl("p", { cls: "setting-item-description", text: "No markers with a concern yet." });
			return;
		}

		for (const concern of concerns) {
			const markers = byConcern.get(concern)!.sort((a, b) => (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name));
			this.renderConcernOrderList(items, concern, markers);
		}
	}

	private renderConcernOrderList(root: HTMLElement, concern: string, markers: MarkerNote[]): void {
		const details = root.createEl("details", { cls: "hlth-settings-details" });
		details.createEl("summary", { text: `${concern} (${markers.length})` });

		let renameTo = "";
		new Setting(details.createDiv())
			.setName("Rename concern")
			.setDesc("Rewrites concern: on every marker note in this group -- a real rename, not a display override. Carries over the Base override above and the icon below, if either is set.")
			.addText((text) => text.setPlaceholder(concern).onChange((value) => (renameTo = value)))
			.addButton((btn) => btn.setButtonText("Rename").onClick(() => void this.renameConcern(concern, renameTo)));

		const icons = this.plugin.settings.concernIcons;
		const iconSetting = new Setting(details.createDiv())
			.setName("Icon")
			.setDesc('Lucide icon name (e.g. "activity", "droplet") shown next to this column\'s header. Leave blank for the built-in default.');
		const preview = iconSetting.controlEl.createSpan({ cls: "hlth-icon-preview" });
		preview.appendChild(iconForConcern(concern, icons));
		iconSetting.addText((text) => {
			new IconSuggest(this.app, text.inputEl);
			text.setPlaceholder("(default)")
				.setValue(icons[concern] ?? "")
				.onChange((value) => {
					if (value.trim()) icons[concern] = value.trim();
					else delete icons[concern];
					preview.empty();
					preview.appendChild(iconForConcern(concern, icons));
					this.dirty = true;
					void this.save();
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
		const paths = this.plugin.settings;
		order.forEach((marker, i) => (marker.order = (i + 1) * 10));
		await Promise.all(order.map((marker) => saveMarkerOrder(this.app, paths, marker.id, marker.order!)));
		this.dirty = true;
	}

	private renderProfileOrder(root: HTMLElement): void {
		new Setting(root).setName("Profile order").setHeading();
		root.createEl("p", {
			cls: "setting-item-description",
			text: "Drag to reorder the profile switcher buttons on the dashboard.",
		});
		const list = root.createDiv("setting-group").createDiv("setting-items").createDiv({ cls: "hlth-order-list" });
		const profiles = this.snapshot?.profiles ?? [];
		renderDragReorderList(list, profiles, { getId: (p) => p.person, getLabel: (p) => p.person }, (order) => void this.saveProfileOrder(order));
	}

	/** Writes sparse `order:` values (10, 20, 30…) for the full profile list, mirroring saveConcernOrder. */
	private async saveProfileOrder(order: ProfileNote[]): Promise<void> {
		const paths = this.plugin.settings;
		order.forEach((profile, i) => (profile.order = (i + 1) * 10));
		await Promise.all(order.map((profile) => saveProfileOrder(this.app, paths, profile.person, profile.order!)));
		this.dirty = true;
	}

	private renderProfiles(root: HTMLElement): void {
		new Setting(root).setName("Profiles").setHeading();
		const items = root.createDiv("setting-group").createDiv("setting-items");

		for (const profile of this.snapshot?.profiles ?? []) this.renderProfileEditor(items, profile);
		this.renderAddProfileForm(items);
	}

	private renderProfileEditor(root: HTMLElement, profile: ProfileNote): void {
		const details = root.createEl("details", { cls: "hlth-settings-details" });
		details.createEl("summary", { text: profile.person });
		const body = details.createDiv();

		let renameTo = "";
		new Setting(body)
			.setName("Rename profile")
			.setDesc("Renames the profile note, its labs subfolder, and person: on every visit/plan note that references it.")
			.addText((text) => text.setPlaceholder(profile.person).onChange((value) => (renameTo = value)))
			.addButton((btn) =>
				btn.setButtonText("Rename").onClick(() => void this.renameProfile(profile.person, renameTo)),
			);

		let sex: PersonSex = profile.sex;
		let dob = profile.dob ?? "";
		let bloodType = profile.bloodType ?? "";
		let allergies = (profile.allergies ?? []).join(", ");

		new Setting(body).setName("Sex").addDropdown((dropdown) =>
			dropdown
				.addOption("m", "Male")
				.addOption("f", "Female")
				.setValue(sex)
				.onChange((value) => (sex = value as PersonSex)),
		);
		new Setting(body).setName("Date of birth").addText((text) => {
			text.inputEl.type = "date";
			text.setValue(dob);
			text.onChange((value) => (dob = value));
		});
		new Setting(body).setName("Blood type").addText((text) => text.setValue(bloodType).onChange((value) => (bloodType = value)));
		new Setting(body)
			.setName("Allergies")
			.setDesc("Comma-separated.")
			.addText((text) => text.setValue(allergies).onChange((value) => (allergies = value)));

		new Setting(body).addButton((btn) =>
			btn
				.setButtonText("Save")
				.setCta()
				.onClick(() =>
					void this.saveProfile(profile.person, sex, dob, bloodType, allergies).then(() => {
						new Notice(`Saved profile for ${profile.person}.`);
					}),
				),
		);
	}

	private renderAddProfileForm(root: HTMLElement): void {
		const details = root.createEl("details", { cls: "hlth-settings-details" });
		details.createEl("summary", { text: "+ Add a profile" });
		const body = details.createDiv();

		const draft = this.newProfile;
		new Setting(body).setName("Person").addText((text) => text.setValue(draft.person).onChange((value) => (draft.person = value)));
		new Setting(body).setName("Sex").addDropdown((dropdown) =>
			dropdown
				.addOption("m", "Male")
				.addOption("f", "Female")
				.setValue(draft.sex)
				.onChange((value) => (draft.sex = value as PersonSex)),
		);
		new Setting(body).setName("Date of birth").addText((text) => {
			text.inputEl.type = "date";
			text.setValue(draft.dob);
			text.onChange((value) => (draft.dob = value));
		});
		new Setting(body).setName("Blood type").addText((text) => text.setValue(draft.bloodType).onChange((value) => (draft.bloodType = value)));
		new Setting(body)
			.setName("Allergies")
			.setDesc("Comma-separated.")
			.addText((text) => text.setValue(draft.allergies).onChange((value) => (draft.allergies = value)));

		new Setting(body).addButton((btn) =>
			btn
				.setButtonText("Add profile")
				.setCta()
				.onClick(() => void this.addProfile()),
		);
	}

	private async saveProfile(person: string, sex: PersonSex, dob: string, bloodType: string, allergies: string): Promise<void> {
		await saveProfileNote(this.app, this.plugin.settings, person, {
			sex,
			dob: dob || undefined,
			bloodType: bloodType || undefined,
			allergies: parseAllergies(allergies),
		});
		await this.reload();
	}

	private async addProfile(): Promise<void> {
		const draft = this.newProfile;
		const person = draft.person.trim();
		const error = validateProfileInput(person, draft.sex);
		if (error) {
			new Notice(error);
			return;
		}
		if (this.snapshot?.profiles.some((p) => p.person === person)) {
			new Notice(`Profile "${person}" already exists.`);
			return;
		}

		await this.saveProfile(person, draft.sex, draft.dob, draft.bloodType, draft.allergies);
		this.newProfile = { person: "", sex: "m", dob: "", bloodType: "", allergies: "" };
		new Notice(`Added profile for ${person}.`);
	}

	private async renameProfile(oldPerson: string, newPersonRaw: string): Promise<void> {
		const newPerson = newPersonRaw.trim();
		if (!newPerson || newPerson === oldPerson) {
			new Notice("Enter a different name.");
			return;
		}

		try {
			await renameProfileInVault(this.app, this.plugin.settings, oldPerson, newPerson);
		} catch (err) {
			new Notice(err instanceof Error ? err.message : String(err));
			return;
		}

		if (this.plugin.settings.defaultProfile === oldPerson) this.plugin.settings.defaultProfile = newPerson;
		await this.save();
		this.dirty = true;
		new Notice(`Renamed profile "${oldPerson}" to "${newPerson}".`);
		await this.reload();
	}
}

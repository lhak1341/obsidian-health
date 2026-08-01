import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { parseAllergies, validateProfileInput } from "./core/entry";
import type { PersonSex, ProfileNote } from "./core/types";
import type HealthPlugin from "./main";
import type { VaultSnapshot } from "./vault/reader";
import { saveProfileNote } from "./vault/writer";
import type { WidgetTier } from "./settings";

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
}

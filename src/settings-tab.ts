import { App, PluginSettingTab, Setting } from "obsidian";
import type HealthPlugin from "./main";
import { ConcernSection } from "./settings-concern-section";
import type { SettingsSectionContext } from "./settings-context";
import { ProfileSection } from "./settings-profile-section";
import type { WidgetTier } from "./settings";
import type { VaultSnapshot } from "./vault/reader";

export class HealthSettingTab extends PluginSettingTab {
	private snapshot?: VaultSnapshot;
	// The settings modal is an overlay -- an open dashboard behind it can't be seen anyway, so
	// there's no point refreshing it after every single drag. Batch to one rescan on tab close.
	private dirty = false;

	private readonly concernSection: ConcernSection;
	private readonly profileSection: ProfileSection;

	constructor(
		app: App,
		private readonly plugin: HealthPlugin,
	) {
		super(app, plugin);
		const ctx: SettingsSectionContext = {
			app: this.app,
			plugin: this.plugin,
			markDirty: () => (this.dirty = true),
			save: () => this.save(),
			rerender: () => this.renderContent(),
			reload: () => this.reload(),
		};
		this.concernSection = new ConcernSection(ctx);
		this.profileSection = new ProfileSection(ctx);
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
		this.concernSection.render(root, this.snapshot);
		this.profileSection.render(root, this.snapshot);
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
}

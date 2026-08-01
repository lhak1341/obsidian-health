import { ItemView, WorkspaceLeaf } from "obsidian";
import { computeDashboardModel } from "./core/dashboard";
import type HealthPlugin from "./main";
import { renderDashboard } from "./render/dashboard-view";

export const HEALTH_VIEW_TYPE = "health-dashboard";

export class HealthView extends ItemView {
	private showAll: boolean;
	private activePerson: string | undefined;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: HealthPlugin,
	) {
		super(leaf);
		this.showAll = plugin.settings.showAllDefault;
	}

	getViewType(): string {
		return HEALTH_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Health";
	}

	getIcon(): string {
		return "heart-pulse";
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	async refresh(): Promise<void> {
		const snapshot = await this.plugin.scanVault();

		// The active profile is session-only: it survives a refresh (e.g. after saving a visit)
		// but resets to the configured default whenever it no longer resolves to a real profile.
		const current = this.activePerson && snapshot.profiles.find((p) => p.person === this.activePerson);
		const defaultPerson = this.plugin.settings.defaultProfile;
		const profile = current || (defaultPerson && snapshot.profiles.find((p) => p.person === defaultPerson)) || snapshot.profiles[0];
		this.activePerson = profile?.person;

		this.contentEl.empty();
		this.contentEl.addClass("health-dashboard-outer");

		if (!profile) {
			this.contentEl.createDiv({ cls: "hlth-empty", text: "No profile configured yet. Add a profile note to get started." });
			return;
		}

		const model = computeDashboardModel(snapshot.markers, snapshot.visits, profile, { deadbandPct: this.plugin.settings.deadbandPct });
		renderDashboard(this.contentEl, model, {
			showAll: this.showAll,
			onToggleShowAll: () => {
				this.showAll = !this.showAll;
				void this.refresh();
			},
			onAddVisit: () => void this.plugin.openAddVisitModal(),
			profiles: snapshot.profiles.map((p) => p.person),
			activePerson: profile.person,
			onSwitchProfile: (person) => {
				this.activePerson = person;
				void this.refresh();
			},
		});
	}
}

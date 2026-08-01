import { ItemView, WorkspaceLeaf } from "obsidian";
import { computeDashboardModel } from "./core/dashboard";
import type { DashboardSettings } from "./core/model";
import type HealthPlugin from "./main";
import { renderDashboard } from "./render/dashboard-view";

export const HEALTH_VIEW_TYPE = "health-dashboard";

const DEFAULT_SETTINGS: DashboardSettings = { deadbandPct: 0.03 };

export class HealthView extends ItemView {
	private showAll = false;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: HealthPlugin,
	) {
		super(leaf);
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
		const profile = snapshot.profiles[0];

		this.contentEl.empty();
		this.contentEl.addClass("health-dashboard-outer");

		if (!profile) {
			this.contentEl.createDiv({ cls: "hlth-empty", text: "No profile configured yet. Add a profile note to get started." });
			return;
		}

		const model = computeDashboardModel(snapshot.markers, snapshot.visits, profile, DEFAULT_SETTINGS);
		renderDashboard(this.contentEl, model, {
			showAll: this.showAll,
			onToggleShowAll: () => {
				this.showAll = !this.showAll;
				void this.refresh();
			},
			onAddVisit: () => void this.plugin.openAddVisitModal(),
		});
	}
}

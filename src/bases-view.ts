import { BasesView, type QueryController } from "obsidian";
import { computeDashboardModel, resolveDefaultProfile } from "./core/dashboard";
import type HealthPlugin from "./main";
import { renderBasesMarkers } from "./render/bases-view";

export const HEALTH_BASES_VIEW_TYPE = "health-markers";

export class HealthBasesView extends BasesView {
	type = HEALTH_BASES_VIEW_TYPE;
	private destroyed = false;

	constructor(
		controller: QueryController,
		private readonly containerEl: HTMLElement,
		private readonly plugin: HealthPlugin,
	) {
		super(controller);
	}

	onunload(): void {
		this.destroyed = true;
	}

	onDataUpdated(): void {
		void this.render();
	}

	private async render(): Promise<void> {
		const snapshot = await this.plugin.scanVault();
		if (this.destroyed) return;

		const profile = resolveDefaultProfile(snapshot.profiles, this.plugin.settings.defaultProfile);

		this.containerEl.textContent = "";
		if (!profile) {
			const empty = createDiv();
			empty.className = "hlth-widget-empty";
			empty.textContent = "No profile configured yet.";
			this.containerEl.appendChild(empty);
			return;
		}

		const queriedIds = new Set(this.data.data.map((entry) => entry.file.basename));
		const markers = snapshot.markers.filter((marker) => queriedIds.has(marker.id));

		const model = computeDashboardModel(markers, snapshot.visits, profile, { deadbandPct: this.plugin.settings.deadbandPct });
		renderBasesMarkers(this.containerEl, model);
	}
}

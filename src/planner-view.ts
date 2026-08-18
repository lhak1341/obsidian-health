import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { resolveDefaultProfile } from "./core/dashboard";
import { computePlannerBacklog, latestPlanNote } from "./core/planner";
import type HealthPlugin from "./main";
import { renderPlanner } from "./render/planner-view";

export const HEALTH_PLANNER_VIEW_TYPE = "health-planner";

export class HealthPlannerView extends ItemView {
	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: HealthPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return HEALTH_PLANNER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Health planner";
	}

	getIcon(): string {
		return "clipboard-list";
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	async refresh(): Promise<void> {
		const snapshot = await this.plugin.scanVault();
		const person = resolveDefaultProfile(snapshot.profiles, this.plugin.settings.defaultProfile)?.person;

		this.contentEl.empty();
		this.contentEl.addClass("health-planner-outer");

		renderPlanner(this.contentEl, {
			backlog: computePlannerBacklog(snapshot.markers, snapshot.visits),
			plan: person ? latestPlanNote(snapshot.plans, person) : undefined,
			onOpenDashboard: () => void this.plugin.activateView(),
			onOpenPlanNote: (path) => this.openPlanNote(path),
		});
	}

	private openPlanNote(path: string): void {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) void this.app.workspace.getLeaf(true).openFile(file);
	}
}

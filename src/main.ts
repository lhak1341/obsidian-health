import { Plugin, WorkspaceLeaf } from "obsidian";
import { HEALTH_VIEW_TYPE, HealthView } from "./view";

export default class HealthPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(HEALTH_VIEW_TYPE, (leaf) => new HealthView(leaf));

		this.addCommand({
			id: "open-health-dashboard",
			name: "Open dashboard",
			callback: () => this.activateView(),
		});
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(HEALTH_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: HEALTH_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}

import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { AddVisitModal } from "./modals/add-visit-modal";
import { HEALTH_VIEW_TYPE, HealthView } from "./view";
import { DEFAULT_VAULT_PATHS, scanVault, type VaultPaths, type VaultSnapshot } from "./vault/reader";

export default class HealthPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(HEALTH_VIEW_TYPE, (leaf) => new HealthView(leaf, this));

		this.addCommand({
			id: "open-health-dashboard",
			name: "Open dashboard",
			callback: () => this.activateView(),
		});

		this.addCommand({
			id: "add-lab-visit",
			name: "Add lab visit",
			callback: () => void this.openAddVisitModal(),
		});
	}

	async openAddVisitModal(): Promise<void> {
		const snapshot = await this.scanVault();
		const defaultPerson = snapshot.profiles[0]?.person;
		if (!defaultPerson) {
			new Notice("Add a profile note before recording a lab visit.");
			return;
		}

		new AddVisitModal(this.app, DEFAULT_VAULT_PATHS, snapshot, defaultPerson, () => this.refreshOpenViews()).open();
	}

	private refreshOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(HEALTH_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof HealthView) void view.refresh();
		}
	}

	scanVault(paths?: VaultPaths): Promise<VaultSnapshot> {
		return scanVault(this.app, paths);
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

import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { HEALTH_BASES_VIEW_TYPE, HealthBasesView } from "./bases-view";
import { computeDashboardModel } from "./core/dashboard";
import { AddVisitModal } from "./modals/add-visit-modal";
import { HEALTH_PLANNER_VIEW_TYPE, HealthPlannerView } from "./planner-view";
import { renderHealthWidget, renderHealthWidgetEmpty } from "./render/widget-view";
import { HealthSettingTab } from "./settings-tab";
import { DEFAULT_SETTINGS, type HealthPluginSettings, type WidgetTier } from "./settings";
import { HEALTH_VIEW_TYPE, HealthView } from "./view";
import { scanVault, type VaultPaths, type VaultSnapshot } from "./vault/reader";

export interface HealthWidgetHandle {
	destroy(): void;
}

export interface HealthWidgetOptions {
	tier?: WidgetTier;
	maxRows?: number;
	onOpenMarker?: (markerId: string) => void;
}

export default class HealthPlugin extends Plugin {
	settings: HealthPluginSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		const saved = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		// Object.assign only shallow-copies; nested-object fields (e.g. concernBaseOverrides)
		// would otherwise stay reference-shared with the DEFAULT_SETTINGS module constant.
		this.settings.concernBaseOverrides = { ...DEFAULT_SETTINGS.concernBaseOverrides, ...saved?.concernBaseOverrides };

		this.registerView(HEALTH_VIEW_TYPE, (leaf) => new HealthView(leaf, this));
		this.registerView(HEALTH_PLANNER_VIEW_TYPE, (leaf) => new HealthPlannerView(leaf, this));
		this.registerBasesView(HEALTH_BASES_VIEW_TYPE, {
			name: "Health markers",
			icon: "heart-pulse",
			factory: (controller, containerEl) => new HealthBasesView(controller, containerEl, this),
		});
		this.addSettingTab(new HealthSettingTab(this.app, this));

		this.addCommand({
			id: "open-health-dashboard",
			name: "Open dashboard",
			callback: () => this.activateView(),
		});

		this.addCommand({
			id: "open-health-planner",
			name: "Open planner",
			callback: () => this.activatePlannerView(),
		});

		this.addCommand({
			id: "add-lab-visit",
			name: "Add lab visit",
			callback: () => void this.openAddVisitModal(),
		});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async openAddVisitModal(): Promise<void> {
		const snapshot = await this.scanVault();
		const defaultPerson = this.settings.defaultProfile ?? snapshot.profiles[0]?.person;
		if (!defaultPerson) {
			new Notice("Add a profile note before recording a lab visit.");
			return;
		}

		new AddVisitModal(this.app, this.settings, snapshot, defaultPerson, () => this.refreshOpenViews()).open();
	}

	refreshOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(HEALTH_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof HealthView) void view.refresh();
		}
	}

	scanVault(paths?: VaultPaths): Promise<VaultSnapshot> {
		return scanVault(this.app, paths ?? this.settings);
	}

	/** Public API — mounts a compact widget (e.g. into the lhak-dashboard host). Recomputes on mount only. */
	mountHealthWidget(container: HTMLElement, opts: HealthWidgetOptions = {}): HealthWidgetHandle {
		const root = document.createElement("div");
		container.appendChild(root);

		let destroyed = false;
		void this.renderWidgetInto(root, opts, () => destroyed);

		return {
			destroy: () => {
				destroyed = true;
				root.remove();
			},
		};
	}

	private async renderWidgetInto(root: HTMLElement, opts: HealthWidgetOptions, isDestroyed: () => boolean): Promise<void> {
		const snapshot = await this.scanVault();
		if (isDestroyed()) return;

		const defaultPerson = this.settings.defaultProfile;
		const profile = (defaultPerson && snapshot.profiles.find((p) => p.person === defaultPerson)) || snapshot.profiles[0];

		if (!profile) {
			renderHealthWidgetEmpty(root, "No profile configured yet.");
			return;
		}

		const model = computeDashboardModel(snapshot.markers, snapshot.visits, profile, { deadbandPct: this.settings.deadbandPct });
		if (model.markers.length === 0) {
			renderHealthWidgetEmpty(root, "No visits recorded yet.");
			return;
		}

		renderHealthWidget(root, model, {
			tier: opts.tier ?? this.settings.widgetTier,
			maxRows: opts.maxRows ?? this.settings.widgetMaxRows,
			showSparkline: this.settings.widgetShowSparkline,
			onOpenDashboard: () => void this.activateView(),
			onOpenMarker: opts.onOpenMarker,
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

	async activatePlannerView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(HEALTH_PLANNER_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: HEALTH_PLANNER_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}

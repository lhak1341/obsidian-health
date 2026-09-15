import { ItemView, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { HEALTH_BASES_VIEW_TYPE, HealthBasesView } from "./bases-view";
import { computeDashboardModel, resolveDefaultProfile } from "./core/dashboard";
import { resolveFontVar } from "./fonts";
import { HEALTH_PLANNER_VIEW_TYPE, HealthPlannerView } from "./planner-view";
import { applyTooltipFonts } from "./render/tooltip";
import { renderHealthWidget, renderHealthWidgetEmpty } from "./render/widget-view";
import { HealthSettingTab } from "./settings-tab";
import { DEFAULT_SETTINGS, type HealthPluginSettings, type WidgetTier } from "./settings";
import { HEALTH_VIEW_TYPE, HealthView } from "./dashboard-view";
import { HEALTH_VISIT_EDITOR_VIEW_TYPE, HealthVisitEditorView } from "./visit-editor-view";
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
		const saved = (await this.loadData()) as Partial<HealthPluginSettings> | undefined;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		// Object.assign only shallow-copies; nested-object fields (e.g. concernViewOverrides)
		// would otherwise stay reference-shared with the DEFAULT_SETTINGS module constant.
		this.settings.concernViewOverrides = { ...DEFAULT_SETTINGS.concernViewOverrides, ...saved?.concernViewOverrides };
		this.settings.concernIcons = { ...DEFAULT_SETTINGS.concernIcons, ...saved?.concernIcons };
		this.settings.managedBaseViews = [...(saved?.managedBaseViews ?? DEFAULT_SETTINGS.managedBaseViews)];
		this.applyFonts();

		this.registerView(HEALTH_VIEW_TYPE, (leaf) => new HealthView(leaf, this));
		this.registerView(HEALTH_PLANNER_VIEW_TYPE, (leaf) => new HealthPlannerView(leaf, this));
		this.registerView(HEALTH_VISIT_EDITOR_VIEW_TYPE, (leaf) => new HealthVisitEditorView(leaf, this));
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
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Dashboard/Planner/Visit-editor share a single tab -- switching between them swaps that one
	 *  leaf's view type in place instead of spawning a new tab per view. Finds any leaf already
	 *  showing one of the three, preferring an exact match so a same-type reopen doesn't re-tab. */
	private findHealthLeaf(exactType: string): WorkspaceLeaf | undefined {
		const { workspace } = this.app;
		return (
			workspace.getLeavesOfType(exactType)[0] ??
			workspace.getLeavesOfType(HEALTH_VIEW_TYPE)[0] ??
			workspace.getLeavesOfType(HEALTH_PLANNER_VIEW_TYPE)[0] ??
			workspace.getLeavesOfType(HEALTH_VISIT_EDITOR_VIEW_TYPE)[0]
		);
	}

	async openVisitEditor(initialDate?: string, mode: "add" | "edit" = "add", person?: string): Promise<void> {
		const snapshot = await this.scanVault();
		const requestedPerson = person && snapshot.profiles.some((p) => p.person === person) ? person : undefined;
		const targetPerson = requestedPerson ?? resolveDefaultProfile(snapshot.profiles, this.settings.defaultProfile)?.person;
		if (!targetPerson) {
			new Notice("Add a profile note before recording a lab visit.");
			return;
		}

		const { workspace } = this.app;
		const leaf = this.findHealthLeaf(HEALTH_VISIT_EDITOR_VIEW_TYPE) ?? workspace.getLeaf("tab");
		await leaf.setViewState({
			type: HEALTH_VISIT_EDITOR_VIEW_TYPE,
			active: true,
			state: { person: targetPerson, initialDate, mode },
		});
		await workspace.revealLeaf(leaf);
	}

	refreshOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(HEALTH_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof HealthView) void view.reload();
		}
	}

	/** Sets --hlth-fh/fb/fm (from current settings) as inline style on `el` -- inline style on
	 *  the element itself always wins over the `.health-*-outer` class rule that declares the
	 *  theme-following defaults, so this is a no-op visually until a non-default font is chosen. */
	applyFontVarsTo(el: HTMLElement): void {
		const { fontHeading, fontHeadingCustom, fontBody, fontBodyCustom, fontMono, fontMonoCustom } = this.settings;
		const set = (prop: string, choice: HealthPluginSettings["fontHeading"], custom: string) => {
			const v = resolveFontVar(choice, custom);
			if (v) el.style.setProperty(prop, v);
			else   el.style.removeProperty(prop);
		};
		set("--hlth-fh", fontHeading, fontHeadingCustom);
		set("--hlth-fb", fontBody, fontBodyCustom);
		set("--hlth-fm", fontMono, fontMonoCustom);
	}

	/** Applies current font settings to every already-open Dashboard/Planner/Visit-editor leaf
	 *  and the shared tooltip -- called after a font setting changes. Freshly-opened views apply
	 *  their own fonts via `applyFontVarsTo` in their render entry point, so this only needs to
	 *  cover the "already open while settings changed" case. */
	applyFonts(): void {
		for (const type of [HEALTH_VIEW_TYPE, HEALTH_PLANNER_VIEW_TYPE, HEALTH_VISIT_EDITOR_VIEW_TYPE]) {
			for (const leaf of this.app.workspace.getLeavesOfType(type)) {
				if (leaf.view instanceof ItemView) this.applyFontVarsTo(leaf.view.contentEl);
			}
		}
		applyTooltipFonts(resolveFontVar(this.settings.fontHeading, this.settings.fontHeadingCustom));
	}

	scanVault(paths?: VaultPaths): Promise<VaultSnapshot> {
		return scanVault(this.app, paths ?? this.settings);
	}

	/** Public API — mounts a compact widget (e.g. into the lhak-dashboard host). Recomputes on mount only. */
	mountHealthWidget(container: HTMLElement, opts: HealthWidgetOptions = {}): HealthWidgetHandle {
		const root = createDiv();
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

		const profile = resolveDefaultProfile(snapshot.profiles, this.settings.defaultProfile);

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

	async activateView(person?: string): Promise<void> {
		const { workspace } = this.app;

		const leaf = this.findHealthLeaf(HEALTH_VIEW_TYPE) ?? workspace.getLeaf("tab");
		if (leaf.view.getViewType() !== HEALTH_VIEW_TYPE) {
			await leaf.setViewState({ type: HEALTH_VIEW_TYPE, active: true, state: person ? { person } : undefined });
		}

		await workspace.revealLeaf(leaf);
	}

	async activatePlannerView(): Promise<void> {
		const { workspace } = this.app;

		const leaf = this.findHealthLeaf(HEALTH_PLANNER_VIEW_TYPE) ?? workspace.getLeaf("tab");
		if (leaf.view.getViewType() !== HEALTH_PLANNER_VIEW_TYPE) await leaf.setViewState({ type: HEALTH_PLANNER_VIEW_TYPE, active: true });

		await workspace.revealLeaf(leaf);
	}
}

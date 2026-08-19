import { ItemView, TFile, WorkspaceLeaf, type ViewStateResult } from "obsidian";
import { computeDashboardModel, resolveDefaultProfile } from "./core/dashboard";
import type { DashboardModel } from "./core/model";
import type { ProfileNote } from "./core/types";
import type HealthPlugin from "./main";
import { renderDashboard, type DashboardViewState } from "./render/dashboard-view";
import type { VaultSnapshot } from "./vault/reader";
import { toggleMarkerCurated } from "./vault/writer";

export const HEALTH_VIEW_TYPE = "health-dashboard";

export class HealthView extends ItemView {
	private snapshot: VaultSnapshot = { markers: [], visits: [], profiles: [], plans: [] };
	private readonly viewState: DashboardViewState;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: HealthPlugin,
	) {
		super(leaf);
		this.viewState = { showAll: plugin.settings.showAllDefault, unitToggles: new Set(), openMarkerId: undefined, activePerson: undefined };
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
		await this.reload();
	}

	/** Fires after `onOpen()` when this leaf's view type is switched to `HEALTH_VIEW_TYPE` in place
	 *  (e.g. navigating back from the visit editor) -- `onOpen` runs first with no state, so the
	 *  default profile wins there; this carries the caller's requested person on top via `repaint()`
	 *  (snapshot's already loaded, no need to rescan). */
	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const person = (state as { person?: string } | undefined)?.person;
		if (person) {
			this.viewState.activePerson = person;
			this.repaint();
		}
		await super.setState(state, result);
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	/** Rescans the vault -- for when the underlying data may actually have changed (view open,
	 *  after a visit save). Pure view-state changes (showAll, unit toggle, profile switch) go
	 *  through `repaint()` instead, which needs no I/O. */
	async reload(): Promise<void> {
		this.snapshot = await this.plugin.scanVault();
		this.repaint();
	}

	/** Recomputes the model from the already-loaded snapshot and repaints -- no vault I/O. */
	repaint(): void {
		// The active profile is session-only: it survives a repaint (e.g. after a unit toggle)
		// but resets to the configured default whenever it no longer resolves to a real profile.
		const current = this.viewState.activePerson && this.snapshot.profiles.find((p) => p.person === this.viewState.activePerson);
		const profile = current || resolveDefaultProfile(this.snapshot.profiles, this.plugin.settings.defaultProfile);
		this.viewState.activePerson = profile?.person;

		if (!profile) {
			this.contentEl.empty();
			this.contentEl.addClass("health-dashboard-outer");
			this.contentEl.createDiv({ cls: "hlth-empty", text: "No profile configured yet. Add a profile note to get started." });
			return;
		}

		const model = computeDashboardModel(this.snapshot.markers, this.snapshot.visits, profile, { deadbandPct: this.plugin.settings.deadbandPct });
		const lastVisitDate = this.snapshot.visits
			.filter((v) => v.person === profile.person)
			.map((v) => v.date)
			.sort()
			.at(-1);

		this.paint(model, profile, lastVisitDate);
	}

	private paint(model: DashboardModel, profile: ProfileNote, lastVisitDate: string | undefined): void {
		// `.hlth-dash` (the actual scrollable element, not contentEl itself) gets torn down and
		// rebuilt from scratch below, which would otherwise silently reset scroll position on every
		// repaint -- including ones triggered mid-scroll, like a unit toggle inside an open row.
		const scrollTop = this.contentEl.querySelector(".hlth-dash")?.scrollTop;

		this.contentEl.empty();
		this.contentEl.addClass("health-dashboard-outer");

		renderDashboard(this.contentEl, model, {
			onAddVisit: () => void this.plugin.openVisitEditor(undefined, "add", profile.person),
			onEditVisit: lastVisitDate ? () => void this.plugin.openVisitEditor(lastVisitDate, "edit", profile.person) : undefined,
			onOpenPlanner: () => void this.plugin.activatePlannerView(),
			onOpenConcern: (key, label) => this.openConcernBase(key, label),
			onToggleCurated: (markerId) => void this.toggleCurated(markerId),
			profiles: this.snapshot.profiles.map((p) => p.person),
			profile,
			lastVisitDate,
			concernIcons: this.plugin.settings.concernIcons,
			viewState: this.viewState,
			onViewStateChange: () => this.repaint(),
		});

		if (scrollTop !== undefined) {
			const dash = this.contentEl.querySelector(".hlth-dash");
			if (dash) dash.scrollTop = scrollTop;
		}
	}

	/** Flips a marker's `curated:` flag on disk (row context menu), then rescans -- the curated set is
	 *  derived from `snapshot.markers` at scan time, so a local repaint would keep showing stale state. */
	private async toggleCurated(markerId: string): Promise<void> {
		await toggleMarkerCurated(this.app, this.plugin.settings, markerId);
		await this.reload();
	}

	/** A concern header opens the single configured Base file (settings.basePath), switching to the
	 *  view named after the concern's label -- or the per-concern override (keyed by the normalized
	 *  identity, not the display label) when the view name differs. Returns false if the Base file
	 *  doesn't exist so the caller can degrade to in-plugin expand. */
	private openConcernBase(key: string, label: string): boolean {
		const settings = this.plugin.settings;
		const viewName = settings.concernViewOverrides[key]?.trim() || label;

		const file = this.app.vault.getAbstractFileByPath(settings.basePath);
		if (!(file instanceof TFile)) return false;

		void this.switchToBaseView(file, viewName);
		return true;
	}

	/** Two-step by necessity: `openFile(file, { state: { viewName } })` in a single call gets
	 *  overridden back to the Base's last-used view once it finishes loading -- confirmed live.
	 *  `setViewState` after the file has loaded is what actually sticks. */
	private async switchToBaseView(file: TFile, viewName: string): Promise<void> {
		const leaf = this.app.workspace.getLeaf(true);
		await leaf.openFile(file);
		const viewState = leaf.getViewState();
		await leaf.setViewState({ ...viewState, state: { ...viewState.state, viewName } });
	}
}

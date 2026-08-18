import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { computeDashboardModel } from "./core/dashboard";
import type HealthPlugin from "./main";
import { renderDashboard } from "./render/dashboard-view";

export const HEALTH_VIEW_TYPE = "health-dashboard";

export class HealthView extends ItemView {
	private showAll: boolean;
	private activePerson: string | undefined;
	/** Marker ids shown in their alt unit -- session-only, resets on view close/reopen (new instance). */
	private readonly unitToggles = new Set<string>();
	/** Which row is expanded, if any -- same session-only lifetime as `unitToggles`. */
	private openMarkerId: string | undefined;

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

		// `.hlth-dash` (the actual scrollable element, not contentEl itself) gets torn down and
		// rebuilt from scratch below, which would otherwise silently reset scroll position on every
		// refresh -- including ones triggered mid-scroll, like a unit toggle inside an open row.
		const scrollTop = this.contentEl.querySelector(".hlth-dash")?.scrollTop;

		this.contentEl.empty();
		this.contentEl.addClass("health-dashboard-outer");

		if (!profile) {
			this.contentEl.createDiv({ cls: "hlth-empty", text: "No profile configured yet. Add a profile note to get started." });
			return;
		}

		const model = computeDashboardModel(snapshot.markers, snapshot.visits, profile, { deadbandPct: this.plugin.settings.deadbandPct });
		const lastVisitDate = snapshot.visits
			.filter((v) => v.person === profile.person)
			.map((v) => v.date)
			.sort()
			.at(-1);
		renderDashboard(this.contentEl, model, {
			showAll: this.showAll,
			onToggleShowAll: () => {
				this.showAll = !this.showAll;
				void this.refresh();
			},
			onAddVisit: () => void this.plugin.openVisitEditor(),
			onEditVisit: lastVisitDate ? () => void this.plugin.openVisitEditor(lastVisitDate, "edit") : undefined,
			onOpenPlanner: () => void this.plugin.activatePlannerView(),
			onOpenConcern: (key, label) => this.openConcernBase(key, label),
			profiles: snapshot.profiles.map((p) => p.person),
			activePerson: profile.person,
			onSwitchProfile: (person) => {
				this.activePerson = person;
				void this.refresh();
			},
			profile,
			lastVisitDate,
			concernIcons: this.plugin.settings.concernIcons,
			unitToggles: this.unitToggles,
			onToggleUnit: (markerId) => {
				if (!this.unitToggles.delete(markerId)) this.unitToggles.add(markerId);
				void this.refresh();
			},
			openMarkerId: this.openMarkerId,
			onOpenRowChange: (markerId) => {
				this.openMarkerId = markerId;
			},
		});

		if (scrollTop !== undefined) {
			const dash = this.contentEl.querySelector(".hlth-dash");
			if (dash) dash.scrollTop = scrollTop;
		}
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

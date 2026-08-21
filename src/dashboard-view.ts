import { toPng } from "html-to-image";
import { ItemView, Modal, Notice, Platform, Setting, TFile, WorkspaceLeaf, type App, type ViewStateResult } from "obsidian";
import { computeDashboardModel, concernViewNameForProfile, resolveConcernViewName, resolveDefaultProfile, resolveTarget } from "./core/dashboard";
import type { DashboardModel } from "./core/model";
import type { MarkerNote, ProfileNote } from "./core/types";
import type HealthPlugin from "./main";
import { renderDashboard, type DashboardViewState } from "./render/dashboard-view";
import type { VaultSnapshot } from "./vault/reader";
import { saveMarkerTarget, toggleMarkerCurated } from "./vault/writer";

export const HEALTH_VIEW_TYPE = "health-dashboard";

/** Blank -> absent (clears that bound); anything non-finite (`"abc"`, overflowing literals like
 *  `"1e309"` which parse to `Infinity`) -> also absent, matching `evaluateNumericField`'s
 *  `Number.isFinite` guard in core/entry.ts rather than accepting it as a real bound. */
function parseTargetBound(raw: string): number | undefined {
	if (raw.trim() === "") return undefined;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : undefined;
}

/** Form for a marker's personal target override, scoped to whichever profile is active on the
 *  dashboard -- opened from the marker row's "Edit target…" context menu item. Prefills with the
 *  *effective* value (the profile's override if one exists, else the marker's global default);
 *  clearing both fields removes the override on save. */
class EditTargetModal extends Modal {
	constructor(
		app: App,
		private readonly marker: MarkerNote,
		private readonly profile: ProfileNote,
		private readonly onSave: (target: { low?: number; high?: number }) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const effective = resolveTarget(this.marker, this.profile);
		let lowText = effective.low !== undefined ? String(effective.low) : "";
		let highText = effective.high !== undefined ? String(effective.high) : "";

		this.contentEl.createEl("h3", { text: `Edit target — ${this.marker.name}` });

		new Setting(this.contentEl).setName("Low").addText((text) => {
			text.inputEl.type = "number";
			text.setValue(lowText).onChange((value) => (lowText = value));
		});
		new Setting(this.contentEl).setName("High").addText((text) => {
			text.inputEl.type = "number";
			text.setValue(highText).onChange((value) => (highText = value));
		});

		const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
		buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
		buttons
			.createEl("button", { text: "Save", cls: "mod-cta" })
			.addEventListener("click", () => {
				const low = parseTargetBound(lowText);
				const high = parseTargetBound(highText);
				this.close();
				this.onSave({ low, high });
			});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

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
			onExportScreenshot: () => void this.exportScreenshot(profile),
			onOpenConcern: (key, label) => this.openConcernBase(key, label, profile.person),
			onToggleCurated: (markerId) => void this.toggleCurated(markerId),
			onEditTarget: (markerId) => this.editTarget(profile, markerId),
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

	/** Opens the target-editing form for a marker, scoped to whichever profile is active when the
	 *  row's context menu was opened. */
	private editTarget(profile: ProfileNote, markerId: string): void {
		const marker = this.snapshot.markers.find((m) => m.id === markerId);
		if (!marker) return;
		new EditTargetModal(this.app, marker, profile, (target) => void this.saveTarget(profile, markerId, target)).open();
	}

	/** Writes a marker's personal target override (or clears it) on disk, then rescans -- resolved
	 *  status/display derive from `snapshot.profiles` at scan time, so a local repaint would keep
	 *  showing the stale target. */
	private async saveTarget(profile: ProfileNote, markerId: string, target: { low?: number; high?: number }): Promise<void> {
		await saveMarkerTarget(this.app, this.plugin.settings, profile, markerId, target);
		await this.reload();
	}

	/** Renders a full (Show all, not Curated) screenshot of the dashboard and saves it via a native
	 *  save dialog. Show all and Curated are two independent lane-layout systems (docs/adr/0003), so
	 *  this can't just hide rows in place -- it forces the real `showAll` toggle, repaints, captures,
	 *  then restores whatever the user had before. `.hlth-dash` is `overflow-y: auto` at a fixed
	 *  `height: 100%` normally (see styles.css) -- temporarily overridden to its natural full height
	 *  so the capture isn't clipped to whatever fit on screen. */
	private async exportScreenshot(profile: ProfileNote): Promise<void> {
		if (!Platform.isDesktop) {
			new Notice("Exporting a screenshot requires the desktop app.");
			return;
		}

		// html-to-image walks every stylesheet loaded in the whole Obsidian window (core + every
		// theme/snippet/plugin, not just this view) to inline styles for the clone -- confirmed live
		// this can take 10-30+ seconds depending on how much CSS is loaded, unrelated to dashboard
		// size. `deleteAfter: 0` keeps the notice up until `.hide()` below, so it covers the whole wait.
		const rendering = new Notice("Rendering screenshot… this can take up to 30 seconds.", 0);

		const wasShowAll = this.viewState.showAll;
		this.viewState.showAll = true;
		this.repaint();
		await nextFrame();
		await nextFrame();

		const outer = this.contentEl;
		const dash = outer.querySelector<HTMLElement>(".hlth-dash");
		if (!dash) {
			rendering.hide();
			this.viewState.showAll = wasShowAll;
			this.repaint();
			return;
		}

		const prevOuterHeight = outer.style.height;
		const prevOuterOverflow = outer.style.overflow;
		const prevDashHeight = dash.style.height;
		const prevDashOverflowY = dash.style.overflowY;

		outer.setCssStyles({ height: "auto", overflow: "visible" });
		dash.setCssStyles({ height: "auto", overflowY: "visible" });
		await nextFrame();

		try {
			const width = outer.getBoundingClientRect().width;
			const height = outer.scrollHeight;
			// `skipFonts` skips html-to-image re-fetching every @font-face across every stylesheet
			// loaded in the whole Obsidian window (core + all themes/snippets, not just this view) to
			// re-embed them as portable data URIs -- unnecessary since the fonts are already loaded and
			// rendering correctly live. The remaining ~10-12s (confirmed live, 3-run benchmark) is the
			// per-element style-walk over this view's own DOM, not fonts or the pixelRatio-2 raster --
			// pixelRatio 1 only shaves ~25-30% off that and halves output resolution, not worth it.
			const dataUrl = await toPng(outer, { width, height, pixelRatio: 2, skipFonts: true });

			const electron = getElectronRemote();
			const date = new Date().toISOString().slice(0, 10);
			const result = await electron.remote.dialog.showSaveDialog(electron.remote.getCurrentWindow(), {
				title: "Export health dashboard screenshot",
				defaultPath: `Health - ${profile.person} - Show all - ${date}.png`,
				filters: [{ name: "PNG Image", extensions: ["png"] }],
			});
			if (result.canceled || !result.filePath) return;

			const fs = getNodeFs();
			await fs.promises.writeFile(result.filePath, getNodeBuffer().from(dataUrl.split(",")[1], "base64"));
			new Notice(`Saved screenshot to ${result.filePath}`);
		} catch (err) {
			console.error("Health: failed to export screenshot", err);
			new Notice("Failed to export screenshot.");
		} finally {
			rendering.hide();
			outer.setCssStyles({ height: prevOuterHeight, overflow: prevOuterOverflow });
			dash.setCssStyles({ height: prevDashHeight, overflowY: prevDashOverflowY });
			this.viewState.showAll = wasShowAll;
			this.repaint();
		}
	}

	/** A concern header opens the single configured Base file (settings.basePath), switching to the
	 *  view named after the concern's label -- or the per-concern override (keyed by the normalized
	 *  identity, not the display label) when the view name differs -- suffixed with the active
	 *  profile so each profile gets its own filtered view instead of one shared, mixed one. Returns
	 *  false if the Base file doesn't exist so the caller can degrade to in-plugin expand. A
	 *  per-profile view that hasn't been hand-authored yet isn't checked for here -- Obsidian's own
	 *  Bases renderer shows an inline "not found" state rather than silently substituting another
	 *  view or mixed data (confirmed live), so no extra existence check is needed. */
	private openConcernBase(key: string, _label: string, person: string): boolean {
		const settings = this.plugin.settings;
		const viewName = concernViewNameForProfile(resolveConcernViewName(key, settings.concernViewOverrides), person);

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

function nextFrame(): Promise<void> {
	return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

interface ElectronRemote {
	remote: {
		dialog: {
			showSaveDialog(
				win: unknown,
				opts: { title: string; defaultPath: string; filters: { name: string; extensions: string[] }[] },
			): Promise<{ canceled: boolean; filePath?: string }>;
		};
		getCurrentWindow(): unknown;
	};
}

/** Desktop-only (native save dialog) -- Obsidian's main renderer runs with Node integration on,
 *  so `window.require` reaches real Electron/Node modules exactly like live `eval` debugging does
 *  (see the `obsidian-plugin-dev` skill's debugging notes). Not available on mobile; callers must
 *  expect this to throw there. */
function getElectronRemote(): ElectronRemote {
	return (window as unknown as { require: (id: string) => ElectronRemote }).require("electron");
}

function getNodeFs(): { promises: { writeFile(path: string, data: Uint8Array): Promise<void> } } {
	return (window as unknown as { require: (id: string) => { promises: { writeFile(path: string, data: Uint8Array): Promise<void> } } }).require("fs");
}

function getNodeBuffer(): { from(data: string, encoding: string): Uint8Array } {
	return (window as unknown as { require: (id: string) => { Buffer: { from(data: string, encoding: string): Uint8Array } } }).require("buffer").Buffer;
}

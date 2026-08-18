import { ItemView, Modal, Notice, WorkspaceLeaf, type App, type ViewStateResult } from "obsidian";
import { buildPreSaveSummary, buildVisitValues, checkDuplicateMarkerId, evaluateVisitFields, formatVisitError } from "./core/entry";
import type { MarkerNote } from "./core/types";
import type HealthPlugin from "./main";
import { renderVisitEditor, reprefill, type EditorFormState, type NewMarkerDraft, type VisitEditorOptions } from "./render/visit-editor-view";
import type { VaultSnapshot } from "./vault/reader";
import { saveNewMarkerNote, saveVisitNote } from "./vault/writer";

export const HEALTH_VISIT_EDITOR_VIEW_TYPE = "health-visit-editor";

export interface VisitEditorState {
	person: string;
	initialDate?: string;
	mode: "add" | "edit";
}

/** Obsidian-native stand-in for `window.confirm` -- blocking native dialogs don't render on mobile
 *  and look out of place next to the rest of the app's UI. */
class DiscardChangesModal extends Modal {
	constructor(
		app: App,
		private readonly onDiscard: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.createEl("p", { text: "Discard unsaved changes to this visit?" });
		const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
		buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
		buttons
			.createEl("button", { text: "Discard", cls: "mod-warning" })
			.addEventListener("click", () => {
				this.close();
				this.onDiscard();
			});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export class HealthVisitEditorView extends ItemView {
	private snapshot: VaultSnapshot = { markers: [], visits: [], profiles: [], plans: [] };
	private state: EditorFormState = {
		person: "",
		date: "",
		mode: "add",
		markers: [],
		profiles: [],
		visits: [],
		fields: new Map(),
		facility: "",
		dirty: false,
		errors: [],
	};

	private readonly opts: VisitEditorOptions = {
		onBack: (dirty) => this.handleBack(dirty),
		onSave: () => void this.save(),
		onAddMarker: (draft) => void this.addMarker(draft),
	};

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: HealthPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return HEALTH_VISIT_EDITOR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Lab visit";
	}

	getIcon(): string {
		return "clipboard-plus";
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	/** Only entry point that (re)opens this view with fresh state -- called via `leaf.setViewState`'s
	 *  `state` payload, including when an already-open leaf is reused (unlike onOpen, which only fires once). */
	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const s = state as Partial<VisitEditorState> | undefined;
		if (s?.person) {
			this.state.person = s.person;
			this.state.date = s.initialDate ?? new Date().toISOString().slice(0, 10);
			this.state.mode = s.mode ?? "add";
			this.state.errors = [];
			await this.refresh();
		}
		await super.setState(state, result);
	}

	private async refresh(): Promise<void> {
		this.snapshot = await this.plugin.scanVault();
		this.state.markers = [...this.snapshot.markers];
		this.state.profiles = this.snapshot.profiles;
		this.state.visits = this.snapshot.visits;

		reprefill(this.state);

		this.paint();
	}

	private paint(): void {
		renderVisitEditor(this.contentEl, this.state, this.opts);
	}

	private handleBack(dirty: boolean): void {
		if (!dirty) {
			void this.plugin.activateView();
			return;
		}
		new DiscardChangesModal(this.app, () => void this.plugin.activateView()).open();
	}

	private markersById(): Map<string, MarkerNote> {
		return new Map(this.state.markers.map((m) => [m.id, m]));
	}

	private async addMarker(draft: NewMarkerDraft): Promise<void> {
		if (!draft.id || !draft.name) {
			new Notice("A new marker needs both a name and an ID.");
			return;
		}
		if (checkDuplicateMarkerId(draft.id, this.state.markers.map((m) => m.id))) {
			new Notice(`Marker "${draft.id}" already exists.`);
			return;
		}

		const newMarker = { id: draft.id, name: draft.name, type: draft.type, unit: draft.unit || undefined, panel: draft.panel || "misc", concern: [] as string[], curated: false };
		await saveNewMarkerNote(this.app, this.plugin.settings, newMarker);
		this.state.markers.push({ ...newMarker, aliases: [], blurb: "" });

		this.paint();
	}

	private async save(): Promise<void> {
		const profile = this.state.profiles.find((p) => p.person === this.state.person);
		const { entries, errors } = evaluateVisitFields(this.state.markers, this.state.fields, profile, this.state.date);
		if (errors.length > 0) {
			this.state.errors = errors.map((e) => formatVisitError(e, this.markersById()));
			this.paint();
			return;
		}

		const markersById = this.markersById();
		const softWarnLabels = buildPreSaveSummary(markersById, entries)
			.filter((line) => line.softWarn)
			.map((line) => line.label);

		const values = buildVisitValues(entries, markersById);
		await saveVisitNote(this.app, this.plugin.settings, this.state.person, this.state.date, values, this.state.facility.trim() || undefined);

		const warnSuffix = softWarnLabels.length > 0 ? ` Double-check: ${softWarnLabels.join(", ")}.` : "";
		new Notice(`Saved lab visit for ${this.state.person} on ${this.state.date}.${warnSuffix}`);
		this.plugin.refreshOpenViews();
		await this.refresh();
	}
}

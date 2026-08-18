import { ItemView, Notice, Setting, WorkspaceLeaf, type ViewStateResult } from "obsidian";
import {
	buildPreSaveSummary,
	buildVisitValues,
	checkDuplicateMarkerId,
	evaluateVisitFields,
	findVisit,
	groupMarkersByPanel,
	pairMarkerNotes,
	resolveBandForEntry,
	unitOptions,
	type FieldState,
	type VisitFieldError,
} from "./core/entry";
import type { MarkerKind, MarkerNote, ProfileNote } from "./core/types";
import type HealthPlugin from "./main";
import { iconFor } from "./render/icons";
import type { VaultSnapshot } from "./vault/reader";
import { saveNewMarkerNote, saveVisitNote } from "./vault/writer";

export const HEALTH_VISIT_EDITOR_VIEW_TYPE = "health-visit-editor";

export interface VisitEditorState {
	person: string;
	initialDate?: string;
	mode: "add" | "edit";
}

const OTHER_OPTION = "__other__";

/** Editorial column pin for the entry form's panel cards -- a deliberate layout choice, not derived
 *  data (same spirit as concern-registry.ts's column pin for the dashboard, but keyed by panel,
 *  panel and concern being intentionally separate axes per CLAUDE.md). Unregistered panels fall
 *  through to the right column, ordered after every pinned entry there. */
const PANEL_LAYOUT: Record<string, { column: 0 | 1 | 2; order: number }> = {
	vitals: { column: 0, order: 0 },
	biochemical: { column: 0, order: 1 },
	blood: { column: 1, order: 0 },
	urine: { column: 2, order: 0 },
	antigen: { column: 2, order: 1 },
};
const DEFAULT_PANEL_COLUMN = 2;

/** Prefixes a field error with its marker's name; a blank markerId (the date check) has no marker to name. */
function formatVisitError(error: VisitFieldError, markersById: Map<string, MarkerNote>): string {
	if (!error.markerId) return error.reason;
	return `${markersById.get(error.markerId)!.name}: ${error.reason}`;
}

export class HealthVisitEditorView extends ItemView {
	private snapshot: VaultSnapshot = { markers: [], visits: [], profiles: [], plans: [] };
	private markers: MarkerNote[] = [];
	private person = "";
	private date = "";
	private facility = "";
	private mode: "add" | "edit" = "add";
	private readonly fields = new Map<string, FieldState>();
	/** True once any field has been touched since the last load/save -- guards the "Health" back
	 *  button so leaving mid-edit doesn't silently discard work (nothing here autosaves). */
	private dirty = false;
	private errors: string[] = [];

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
			this.person = s.person;
			this.date = s.initialDate ?? new Date().toISOString().slice(0, 10);
			this.mode = s.mode ?? "add";
			this.errors = [];
			this.fields.clear();
			await this.refresh();
		}
		await super.setState(state, result);
	}

	private async refresh(): Promise<void> {
		this.snapshot = await this.plugin.scanVault();
		this.markers = [...this.snapshot.markers];
		this.prefillFromExistingVisit();
		this.render();
	}

	private currentProfile(): ProfileNote | undefined {
		return this.snapshot.profiles.find((p) => p.person === this.person);
	}

	private fieldState(markerId: string, defaultUnit: string): FieldState {
		let state = this.fields.get(markerId);
		if (!state) {
			state = { raw: "", unit: defaultUnit };
			this.fields.set(markerId, state);
		}
		return state;
	}

	/** Prefills field state from an existing visit when person+date match one (create-or-edit by date). */
	private prefillFromExistingVisit(): void {
		const existing = findVisit(this.snapshot.visits, this.person, this.date);
		this.fields.clear();
		this.facility = existing?.facility ?? "";
		this.dirty = false;
		if (!existing) return;

		for (const marker of this.markers) {
			const value = existing.values[marker.id];
			if (value === undefined) continue;
			this.fields.set(marker.id, { raw: String(value), unit: marker.unit ?? "" });
		}
	}

	private render(): void {
		this.contentEl.empty();
		this.contentEl.addClass("health-visit-editor-outer");

		const wrap = this.contentEl.createDiv({ cls: "hlth-visit-editor" });

		wrap.appendChild(this.buildHeader());
		this.buildPersonDateRow(wrap);

		if (this.errors.length > 0) this.buildErrors(wrap);

		this.buildFields(wrap);
		this.buildAddMarkerForm(wrap);
	}

	private buildHeader(): HTMLElement {
		const top = createDiv();
		top.className = "hlth-top";

		const back = createEl("button");
		back.type = "button";
		back.className = "hlth-showall-btn";
		back.appendChild(iconFor("arrow-left"));
		back.appendChild(document.createTextNode("Health"));
		back.addEventListener("click", () => {
			if (this.dirty && !window.confirm("Discard unsaved changes to this visit?")) return;
			void this.plugin.activateView();
		});
		top.appendChild(back);

		return top;
	}

	private buildEditorField(root: HTMLElement, label: string): HTMLElement {
		const field = root.createDiv({ cls: "hlth-editor-field" });
		field.createSpan({ cls: "hlth-lbl", text: label });
		return field;
	}

	private buildPersonDateRow(root: HTMLElement): void {
		const meta = root.createDiv({ cls: "hlth-editor-meta" });
		const fields = meta.createDiv({ cls: "hlth-editor-meta-fields" });

		const personField = this.buildEditorField(fields, "Person");
		const personSelect = personField.createEl("select", { cls: "hlth-editor-select" });
		for (const profile of this.snapshot.profiles) personSelect.createEl("option", { value: profile.person, text: profile.person });
		personSelect.value = this.person;
		personSelect.addEventListener("change", () => {
			this.person = personSelect.value;
			this.prefillFromExistingVisit();
			this.render();
		});

		const pastDates = this.snapshot.visits
			.filter((v) => v.person === this.person)
			.map((v) => v.date)
			.sort()
			.reverse();

		// Edit mode picks among existing visits only -- a free-date input makes no sense there.
		// Falls back to the date input if the person has no recorded visits to pick from.
		if (this.mode === "edit" && pastDates.length > 0) {
			if (!pastDates.includes(this.date)) {
				this.date = pastDates[0];
				this.prefillFromExistingVisit();
			}
			const visitField = this.buildEditorField(fields, "Visit");
			const visitSelect = visitField.createEl("select", { cls: "hlth-editor-select" });
			for (const date of pastDates) visitSelect.createEl("option", { value: date, text: date });
			visitSelect.value = this.date;
			visitSelect.addEventListener("change", () => {
				this.date = visitSelect.value;
					this.prefillFromExistingVisit();
				this.render();
			});
		} else {
			const dateField = this.buildEditorField(fields, "Date");
			const dateInput = dateField.createEl("input", { cls: "hlth-editor-select", attr: { type: "date" } });
			dateInput.value = this.date;
			dateInput.addEventListener("change", () => {
				this.date = dateInput.value;
					this.prefillFromExistingVisit();
				this.render();
			});
		}

		const facilityField = this.buildEditorField(fields, "Facility");
		const facilityInput = facilityField.createEl("input", { cls: "hlth-editor-select", attr: { placeholder: "Optional" } });
		facilityInput.value = this.facility;
		facilityInput.addEventListener("input", () => {
			this.facility = facilityInput.value;
			this.dirty = true;
		});

		const saveButton = fields.createEl("button", { cls: "hlth-showall-btn hlth-editor-save", text: "Save" });
		saveButton.type = "button";
		saveButton.addEventListener("click", () => void this.save());

		const existing = findVisit(this.snapshot.visits, this.person, this.date);
		meta.createSpan({ cls: "hlth-title", text: existing ? "Edit lab visit" : "Add lab visit" });
	}

	private buildErrors(root: HTMLElement): void {
		const box = root.createDiv({ cls: "hlth-modal-errors" });
		for (const error of this.errors) box.createDiv({ text: error });
	}

	private buildFields(root: HTMLElement): void {
		const profile = this.currentProfile();
		const groups = groupMarkersByPanel(this.markers.filter((m) => m.type !== "derived"));

		const columns: (typeof groups)[number][][] = [[], [], []];
		for (const group of groups) {
			const layout = PANEL_LAYOUT[group.panel.toLowerCase()];
			columns[layout?.column ?? DEFAULT_PANEL_COLUMN].push(group);
		}
		for (const columnGroups of columns) {
			columnGroups.sort((a, b) => {
				const orderA = PANEL_LAYOUT[a.panel.toLowerCase()]?.order ?? Number.POSITIVE_INFINITY;
				const orderB = PANEL_LAYOUT[b.panel.toLowerCase()]?.order ?? Number.POSITIVE_INFINITY;
				return orderA - orderB || a.panel.localeCompare(b.panel);
			});
		}

		const panels = root.createDiv({ cls: "hlth-editor-panels" });
		for (const columnGroups of columns) {
			if (columnGroups.length === 0) continue;
			const col = panels.createDiv({ cls: "hlth-editor-col" });
			for (const group of columnGroups) this.buildPanelCard(col, group, profile);
		}
	}

	private buildPanelCard(col: HTMLElement, group: { panel: string; markers: MarkerNote[] }, profile: ProfileNote | undefined): void {
		const card = col.createDiv({ cls: "hlth-editor-panel" });

		// Same head treatment as the dashboard's concern-group header (`.hlth-grp-head`/`.hlth-lbl`),
		// minus the icon lookup and status dot -- those are keyed by concern, a deliberately separate
		// axis from panel (CLAUDE.md), so a panel head can't borrow them without conflating the two.
		const head = card.createDiv({ cls: "hlth-editor-panel-head" });
		head.appendChild(iconFor("list"));
		head.createSpan({ cls: "hlth-lbl hlth-grp-label", text: group.panel });
		for (const row of pairMarkerNotes(group.markers)) {
			if (row.secondary) this.buildPairRow(card, row.primary, row.secondary);
			else if (row.primary.type === "qualitative") this.buildQualitativeRow(card, row.primary);
			else this.buildNumericRow(card, row.primary, profile);
		}
	}

	/** A range hint costs nothing extra vertically as a placeholder (vs. a second description line
	 *  like the old Setting-based row had) -- falls back to the unit when there's no band to show. */
	private rangePlaceholder(marker: MarkerNote, profile: ProfileNote | undefined): string {
		const band = profile ? resolveBandForEntry(marker, profile, this.date) : {};
		if (band.low !== undefined && band.high !== undefined) return `${band.low}–${band.high}`;
		if (band.low !== undefined) return `≥${band.low}`;
		if (band.high !== undefined) return `≤${band.high}`;
		return marker.unit ?? "value";
	}

	private buildNumericRow(root: HTMLElement, marker: MarkerNote, profile: ProfileNote | undefined): void {
		const options = unitOptions(marker);
		const state = this.fieldState(marker.id, options[0]?.value ?? "");

		const row = root.createDiv({ cls: "hlth-editor-row" });
		row.createSpan({ cls: "hlth-editor-name", text: marker.name, attr: { title: marker.name } });

		const controls = row.createDiv({ cls: "hlth-editor-controls" });
		const input = controls.createEl("input", { cls: "hlth-editor-value", attr: { placeholder: this.rangePlaceholder(marker, profile) } });
		input.value = state.raw;
		input.addEventListener("input", () => {
			state.raw = input.value;
			this.dirty = true;
		});

		if (options.length > 1) {
			const unitSelect = controls.createEl("select", { cls: "hlth-editor-unit-select" });
			for (const option of options) unitSelect.createEl("option", { value: option.value, text: option.label });
			unitSelect.value = state.unit;
			unitSelect.addEventListener("change", () => {
				state.unit = unitSelect.value;
				this.dirty = true;
			});
		} else if (marker.unit) {
			controls.createSpan({ cls: "hlth-editor-unit", text: marker.unit });
		}
	}

	private buildPairRow(root: HTMLElement, primary: MarkerNote, secondary: MarkerNote): void {
		const primaryState = this.fieldState(primary.id, primary.unit ?? "");
		const secondaryState = this.fieldState(secondary.id, secondary.unit ?? "");

		const row = root.createDiv({ cls: "hlth-editor-row" });
		row.createSpan({ cls: "hlth-editor-name", text: `${primary.name} / ${secondary.name}`, attr: { title: `${primary.name} / ${secondary.name}` } });

		const controls = row.createDiv({ cls: "hlth-editor-controls" });
		const primaryInput = controls.createEl("input", { cls: "hlth-editor-value hlth-editor-value-pair" });
		primaryInput.value = primaryState.raw;
		primaryInput.addEventListener("input", () => {
			primaryState.raw = primaryInput.value;
			this.dirty = true;
		});

		controls.createSpan({ cls: "hlth-editor-sep", text: "/" });

		const secondaryInput = controls.createEl("input", { cls: "hlth-editor-value hlth-editor-value-pair" });
		secondaryInput.value = secondaryState.raw;
		secondaryInput.addEventListener("input", () => {
			secondaryState.raw = secondaryInput.value;
			this.dirty = true;
		});

		if (primary.unit) controls.createSpan({ cls: "hlth-editor-unit", text: primary.unit });
	}

	private buildQualitativeRow(root: HTMLElement, marker: MarkerNote): void {
		const state = this.fieldState(marker.id, "");
		const normal = marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
		const isSeeded = state.raw === "" || normal.includes(state.raw);

		const row = root.createDiv({ cls: "hlth-editor-row" });
		row.createSpan({ cls: "hlth-editor-name", text: marker.name, attr: { title: marker.name } });

		const controls = row.createDiv({ cls: "hlth-editor-controls" });
		const select = controls.createEl("select", { cls: "hlth-editor-unit-select hlth-editor-qualitative" });
		for (const option of normal) select.createEl("option", { value: option, text: option });
		select.createEl("option", { value: OTHER_OPTION, text: "Other…" });
		select.value = isSeeded && state.raw !== "" ? state.raw : isSeeded ? normal[0] ?? OTHER_OPTION : OTHER_OPTION;
		select.addEventListener("change", () => {
			state.raw = select.value === OTHER_OPTION ? "" : select.value;
			this.dirty = true;
			this.render();
		});

		if (!isSeeded) {
			const text = controls.createEl("input", { cls: "hlth-editor-value hlth-editor-value-wide", attr: { placeholder: "Free text" } });
			text.value = state.raw;
			text.addEventListener("input", () => {
				state.raw = text.value;
				this.dirty = true;
			});
		}
	}

	private buildAddMarkerForm(root: HTMLElement): void {
		const details = root.createEl("details", { cls: "hlth-modal-addmarker" });
		details.createEl("summary", { text: "+ add a new marker" });

		const body = details.createDiv();
		let name = "";
		let id = "";
		let type: MarkerKind = "numeric";
		let unit = "";
		let panel = this.markers[0]?.panel ?? "";

		new Setting(body).setName("Name").addText((text) => text.onChange((value) => (name = value)));
		new Setting(body).setName("ID (marker key)").addText((text) => text.onChange((value) => (id = value)));
		new Setting(body).setName("Type").addDropdown((dropdown) =>
			dropdown
				.addOption("numeric", "Numeric")
				.addOption("qualitative", "Qualitative")
				.onChange((value) => (type = value as MarkerKind)),
		);
		new Setting(body).setName("Unit").addText((text) => text.onChange((value) => (unit = value)));
		new Setting(body).setName("Panel").addText((text) => {
			text.setValue(panel);
			text.onChange((value) => (panel = value));
		});

		new Setting(body).addButton((btn) =>
			btn
				.setButtonText("Add marker")
				.setCta()
				.onClick(() => void this.addMarker(id.trim(), name.trim(), type, unit.trim(), panel.trim(), details)),
		);
	}

	private async addMarker(id: string, name: string, type: MarkerKind, unit: string, panel: string, details: HTMLDetailsElement): Promise<void> {
		if (!id || !name) {
			new Notice("A new marker needs both a name and an ID.");
			return;
		}
		if (checkDuplicateMarkerId(id, this.markers.map((m) => m.id))) {
			new Notice(`Marker "${id}" already exists.`);
			return;
		}

		const newMarker = { id, name, type, unit: unit || undefined, panel: panel || "misc", concern: [] as string[], curated: false };
		await saveNewMarkerNote(this.app, this.plugin.settings, newMarker);
		this.markers.push({ ...newMarker, aliases: [], blurb: "" });

		details.open = false;
		this.render();
	}

	private markersById(): Map<string, MarkerNote> {
		return new Map(this.markers.map((m) => [m.id, m]));
	}

	private async save(): Promise<void> {
		const { entries, errors } = evaluateVisitFields(this.markers, this.fields, this.currentProfile(), this.date);
		if (errors.length > 0) {
			this.errors = errors.map((e) => formatVisitError(e, this.markersById()));
			this.render();
			return;
		}

		const markersById = this.markersById();
		const softWarnLabels = buildPreSaveSummary(markersById, entries)
			.filter((line) => line.softWarn)
			.map((line) => line.label);

		const values = buildVisitValues(entries);
		await saveVisitNote(this.app, this.plugin.settings, this.person, this.date, values, this.facility.trim() || undefined);

		const warnSuffix = softWarnLabels.length > 0 ? ` Double-check: ${softWarnLabels.join(", ")}.` : "";
		new Notice(`Saved lab visit for ${this.person} on ${this.date}.${warnSuffix}`);
		this.plugin.refreshOpenViews();
		await this.refresh();
	}
}

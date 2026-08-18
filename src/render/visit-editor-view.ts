import { Setting } from "obsidian";
import { convert, convertTo } from "../core/dashboard";
import { findVisit, groupMarkersByPanel, pairMarkerNotes, prefillFields, resolveBandForEntry, unitOptions, type FieldState } from "../core/entry";
import type { MarkerKind, MarkerNote, ProfileNote, VisitNote } from "../core/types";
import { iconFor } from "./icons";
import { columnForPanel, orderForPanel } from "./panel-registry";

const OTHER_OPTION = "__other__";

export interface NewMarkerDraft {
	id: string;
	name: string;
	type: MarkerKind;
	unit: string;
	panel: string;
}

/** Everything the editor needs to render, owned by the adapter and passed by reference: `fields`,
 *  `facility`, and `dirty` are mutated in place by input handlers below without a full re-render
 *  (so typing a digit doesn't blow away DOM focus) -- only structural changes (person/date/panel
 *  pick, qualitative-option switch, add-marker) trigger a full rebuild, via a local `rerender` that
 *  re-invokes `renderVisitEditor` itself. Nothing here does vault I/O; that's `opts`' job. */
export interface EditorFormState {
	person: string;
	date: string;
	mode: "add" | "edit";
	markers: MarkerNote[];
	profiles: ProfileNote[];
	visits: VisitNote[];
	fields: Map<string, FieldState>;
	facility: string;
	dirty: boolean;
	errors: string[];
}

export interface VisitEditorOptions {
	/** `dirty` is read off `state` at click-time -- the adapter decides whether to confirm-discard. */
	onBack: (dirty: boolean) => void;
	onSave: () => void;
	onAddMarker: (draft: NewMarkerDraft) => void;
}

export function renderVisitEditor(root: HTMLElement, state: EditorFormState, opts: VisitEditorOptions): void {
	const rerender = () => renderVisitEditor(root, state, opts);

	root.empty();
	root.addClass("health-visit-editor-outer");

	const wrap = root.createDiv({ cls: "hlth-visit-editor" });

	wrap.appendChild(buildHeader(state, opts));
	buildPersonDateRow(wrap, state, opts, rerender);

	if (state.errors.length > 0) buildErrors(wrap, state);

	buildFields(wrap, state, rerender);
	buildAddMarkerForm(wrap, state, opts);
}

function buildHeader(state: EditorFormState, opts: VisitEditorOptions): HTMLElement {
	const top = createDiv();
	top.className = "hlth-top";

	const back = createEl("button");
	back.type = "button";
	back.className = "hlth-showall-btn";
	back.appendChild(iconFor("arrow-left"));
	back.appendChild(document.createTextNode("Health"));
	back.addEventListener("click", () => opts.onBack(state.dirty));
	top.appendChild(back);

	return top;
}

function buildEditorField(root: HTMLElement, label: string): HTMLElement {
	const field = root.createDiv({ cls: "hlth-editor-field" });
	field.createSpan({ cls: "hlth-lbl", text: label });
	return field;
}

/** Re-derives `state.fields`/`facility`/`dirty` for the (possibly new) person+date -- the shared
 *  recompute for every person/date change below, and for the adapter's initial/post-save load. */
export function reprefill(state: EditorFormState): void {
	const pre = prefillFields(state.visits, state.markers, state.person, state.date);
	state.fields = pre.fields;
	state.facility = pre.facility;
	state.dirty = false;
}

function buildPersonDateRow(root: HTMLElement, state: EditorFormState, opts: VisitEditorOptions, rerender: () => void): void {
	const meta = root.createDiv({ cls: "hlth-editor-meta" });
	const fields = meta.createDiv({ cls: "hlth-editor-meta-fields" });

	const personField = buildEditorField(fields, "Person");
	const personSelect = personField.createEl("select", { cls: "hlth-editor-select" });
	for (const profile of state.profiles) personSelect.createEl("option", { value: profile.person, text: profile.person });
	personSelect.value = state.person;
	personSelect.addEventListener("change", () => {
		state.person = personSelect.value;
		reprefill(state);
		rerender();
	});

	const pastDates = state.visits
		.filter((v) => v.person === state.person)
		.map((v) => v.date)
		.sort()
		.reverse();

	// Edit mode picks among existing visits only -- a free-date input makes no sense there.
	// Falls back to the date input if the person has no recorded visits to pick from.
	if (state.mode === "edit" && pastDates.length > 0) {
		if (!pastDates.includes(state.date)) {
			state.date = pastDates[0];
			reprefill(state);
		}
		const visitField = buildEditorField(fields, "Visit");
		const visitSelect = visitField.createEl("select", { cls: "hlth-editor-select" });
		for (const date of pastDates) visitSelect.createEl("option", { value: date, text: date });
		visitSelect.value = state.date;
		visitSelect.addEventListener("change", () => {
			state.date = visitSelect.value;
			reprefill(state);
			rerender();
		});
	} else {
		const dateField = buildEditorField(fields, "Date");
		const dateInput = dateField.createEl("input", { cls: "hlth-editor-select", attr: { type: "date" } });
		dateInput.value = state.date;
		dateInput.addEventListener("change", () => {
			state.date = dateInput.value;
			reprefill(state);
			rerender();
		});
	}

	const facilityField = buildEditorField(fields, "Facility");
	const facilityInput = facilityField.createEl("input", { cls: "hlth-editor-select", attr: { placeholder: "Optional" } });
	facilityInput.value = state.facility;
	facilityInput.addEventListener("input", () => {
		state.facility = facilityInput.value;
		state.dirty = true;
	});

	const saveButton = fields.createEl("button", { cls: "hlth-showall-btn hlth-editor-save", text: "Save" });
	saveButton.type = "button";
	saveButton.addEventListener("click", () => opts.onSave());

	const existing = findVisit(state.visits, state.person, state.date);
	meta.createSpan({ cls: "hlth-title", text: existing ? "Edit lab visit" : "Add lab visit" });
}

function buildErrors(root: HTMLElement, state: EditorFormState): void {
	const box = root.createDiv({ cls: "hlth-modal-errors" });
	for (const error of state.errors) box.createDiv({ text: error });
}

function currentProfile(state: EditorFormState): ProfileNote | undefined {
	return state.profiles.find((p) => p.person === state.person);
}

function fieldState(state: EditorFormState, markerId: string, defaultUnit: string): FieldState {
	let fs = state.fields.get(markerId);
	if (!fs) {
		fs = { raw: "", unit: defaultUnit };
		state.fields.set(markerId, fs);
	}
	return fs;
}

function buildFields(root: HTMLElement, state: EditorFormState, rerender: () => void): void {
	const profile = currentProfile(state);
	const groups = groupMarkersByPanel(state.markers.filter((m) => m.type !== "derived"));

	const columns: (typeof groups)[number][][] = [[], [], []];
	for (const group of groups) columns[columnForPanel(group.panel)].push(group);
	for (const columnGroups of columns) {
		columnGroups.sort((a, b) => orderForPanel(a.panel) - orderForPanel(b.panel) || a.panel.localeCompare(b.panel));
	}

	const panels = root.createDiv({ cls: "hlth-editor-panels" });
	for (const columnGroups of columns) {
		if (columnGroups.length === 0) continue;
		const col = panels.createDiv({ cls: "hlth-editor-col" });
		for (const group of columnGroups) buildPanelCard(col, group, profile, state, rerender);
	}
}

function buildPanelCard(col: HTMLElement, group: { panel: string; markers: MarkerNote[] }, profile: ProfileNote | undefined, state: EditorFormState, rerender: () => void): void {
	const card = col.createDiv({ cls: "hlth-editor-panel" });

	// Same head treatment as the dashboard's concern-group header (`.hlth-grp-head`/`.hlth-lbl`),
	// minus the icon lookup and status dot -- those are keyed by concern, a deliberately separate
	// axis from panel (CLAUDE.md), so a panel head can't borrow them without conflating the two.
	const head = card.createDiv({ cls: "hlth-editor-panel-head" });
	head.appendChild(iconFor("list"));
	head.createSpan({ cls: "hlth-lbl hlth-grp-label", text: group.panel });
	for (const row of pairMarkerNotes(group.markers)) {
		if (row.secondary) buildPairRow(card, row.primary, row.secondary, state);
		else if (row.primary.type === "qualitative") buildQualitativeRow(card, row.primary, state, rerender);
		else buildNumericRow(card, row.primary, profile, state);
	}
}

/** A range hint costs nothing extra vertically as a placeholder (vs. a second description line
 *  like the old Setting-based row had) -- falls back to the unit when there's no band to show. */
function rangePlaceholder(marker: MarkerNote, profile: ProfileNote | undefined, state: EditorFormState): string {
	const band = profile ? resolveBandForEntry(marker, profile, state.date) : {};
	if (band.low !== undefined && band.high !== undefined) return `${band.low}–${band.high}`;
	if (band.low !== undefined) return `≥${band.low}`;
	if (band.high !== undefined) return `≤${band.high}`;
	return marker.unit ?? "value";
}

function buildNumericRow(root: HTMLElement, marker: MarkerNote, profile: ProfileNote | undefined, state: EditorFormState): void {
	const options = unitOptions(marker);
	const fs = fieldState(state, marker.id, options[0]?.value ?? "");

	const row = root.createDiv({ cls: "hlth-editor-row" });
	row.createSpan({ cls: "hlth-editor-name", text: marker.name, attr: { title: marker.name } });

	const controls = row.createDiv({ cls: "hlth-editor-controls" });
	const input = controls.createEl("input", { cls: "hlth-editor-value", attr: { placeholder: rangePlaceholder(marker, profile, state) } });
	input.value = fs.raw;
	input.addEventListener("input", () => {
		fs.raw = input.value;
		state.dirty = true;
	});

	if (options.length > 1) {
		const unitSelect = controls.createEl("select", { cls: "hlth-editor-unit-select" });
		for (const option of options) unitSelect.createEl("option", { value: option.value, text: option.label });
		unitSelect.value = fs.unit;
		unitSelect.addEventListener("change", () => {
			// Convert the already-typed number along with the unit switch, rather than leaving it
			// as-is under the new unit label -- switching mg/dL -> µmol/L should reflect the same
			// reading, not silently relabel the same digits.
			const parsed = Number(fs.raw.trim());
			if (fs.raw.trim() !== "" && Number.isFinite(parsed)) {
				const canonical = convert(parsed, fs.unit, marker);
				const converted = convertTo(canonical, unitSelect.value, marker);
				fs.raw = String(Math.round(converted * 1000) / 1000);
				input.value = fs.raw;
			}
			fs.unit = unitSelect.value;
			state.dirty = true;
		});
	} else if (marker.unit) {
		controls.createSpan({ cls: "hlth-editor-unit", text: marker.unit });
	}
}

function buildPairRow(root: HTMLElement, primary: MarkerNote, secondary: MarkerNote, state: EditorFormState): void {
	const primaryState = fieldState(state, primary.id, primary.unit ?? "");
	const secondaryState = fieldState(state, secondary.id, secondary.unit ?? "");

	const row = root.createDiv({ cls: "hlth-editor-row" });
	row.createSpan({ cls: "hlth-editor-name", text: `${primary.name} / ${secondary.name}`, attr: { title: `${primary.name} / ${secondary.name}` } });

	const controls = row.createDiv({ cls: "hlth-editor-controls" });
	const primaryInput = controls.createEl("input", { cls: "hlth-editor-value hlth-editor-value-pair" });
	primaryInput.value = primaryState.raw;
	primaryInput.addEventListener("input", () => {
		primaryState.raw = primaryInput.value;
		state.dirty = true;
	});

	controls.createSpan({ cls: "hlth-editor-sep", text: "/" });

	const secondaryInput = controls.createEl("input", { cls: "hlth-editor-value hlth-editor-value-pair" });
	secondaryInput.value = secondaryState.raw;
	secondaryInput.addEventListener("input", () => {
		secondaryState.raw = secondaryInput.value;
		state.dirty = true;
	});

	if (primary.unit) controls.createSpan({ cls: "hlth-editor-unit", text: primary.unit });
}

function buildQualitativeRow(root: HTMLElement, marker: MarkerNote, state: EditorFormState, rerender: () => void): void {
	const fs = fieldState(state, marker.id, "");
	const normal = marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
	const isSeeded = fs.raw === "" || normal.includes(fs.raw);

	const row = root.createDiv({ cls: "hlth-editor-row" });
	row.createSpan({ cls: "hlth-editor-name", text: marker.name, attr: { title: marker.name } });

	const controls = row.createDiv({ cls: "hlth-editor-controls" });
	const select = controls.createEl("select", { cls: "hlth-editor-unit-select hlth-editor-qualitative" });
	for (const option of normal) select.createEl("option", { value: option, text: option });
	select.createEl("option", { value: OTHER_OPTION, text: "Other…" });
	select.value = isSeeded && fs.raw !== "" ? fs.raw : isSeeded ? (normal[0] ?? OTHER_OPTION) : OTHER_OPTION;
	select.addEventListener("change", () => {
		fs.raw = select.value === OTHER_OPTION ? "" : select.value;
		state.dirty = true;
		rerender();
	});

	if (!isSeeded) {
		const text = controls.createEl("input", { cls: "hlth-editor-value hlth-editor-value-wide", attr: { placeholder: "Free text" } });
		text.value = fs.raw;
		text.addEventListener("input", () => {
			fs.raw = text.value;
			state.dirty = true;
		});
	}
}

function buildAddMarkerForm(root: HTMLElement, state: EditorFormState, opts: VisitEditorOptions): void {
	const details = root.createEl("details", { cls: "hlth-modal-addmarker" });
	details.createEl("summary", { text: "+ add a new marker" });

	const body = details.createDiv();
	let name = "";
	let id = "";
	let type: MarkerKind = "numeric";
	let unit = "";
	let panel = state.markers[0]?.panel ?? "";

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
			.onClick(() => {
				opts.onAddMarker({ id: id.trim(), name: name.trim(), type, unit: unit.trim(), panel: panel.trim() });
			}),
	);
}

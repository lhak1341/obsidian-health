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
	/** Marker-search text -- survives a structural rerender (person/date change, add-marker) since
	 *  it lives on `state` like `facility`/`dirty`, but typing itself never triggers one (see
	 *  `buildSearchRow`'s input handler); it just re-filters the already-rendered rows in place. */
	search: string;
}

export interface VisitEditorOptions {
	/** `dirty` is read off `state` at click-time -- the adapter decides whether to confirm-discard. */
	onBack: (dirty: boolean) => void;
	onSave: () => void;
	onAddMarker: (draft: NewMarkerDraft) => void;
}

export function renderVisitEditor(root: HTMLElement, state: EditorFormState, opts: VisitEditorOptions): void {
	const rerender = () => renderVisitEditor(root, state, opts);

	// `.hlth-visit-editor` (the scrollable element) gets torn down and rebuilt from scratch below --
	// a structural change (unit toggle, qualitative pick) would otherwise silently reset scroll
	// position back to the top on every rerender, same fix as the dashboard's paint().
	const scrollTop = root.querySelector(".hlth-visit-editor")?.scrollTop;

	root.empty();
	root.addClass("health-visit-editor-outer");

	const wrap = root.createDiv({ cls: "hlth-visit-editor" });

	wrap.appendChild(buildHeader(state, opts));
	buildPersonDateRow(wrap, state, opts, rerender);

	if (state.errors.length > 0) buildErrors(wrap, state);

	buildFields(wrap, state);
	buildAddMarkerForm(wrap, state, opts);

	if (scrollTop !== undefined) wrap.scrollTop = scrollTop;
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

/** Shows/hides already-built rows in place against `query` -- no rerender, so it can run on every
 *  keystroke without disturbing input focus. A panel card hides entirely once none of its rows
 *  match, instead of leaving an empty header floating above a blank card. */
function applySearchFilter(panels: HTMLElement, query: string): void {
	const q = query.trim().toLowerCase();
	for (const card of Array.from(panels.querySelectorAll<HTMLElement>(".hlth-editor-panel"))) {
		let anyVisible = false;
		for (const row of Array.from(card.querySelectorAll<HTMLElement>(".hlth-editor-row"))) {
			const match = q === "" || (row.dataset.search ?? "").includes(q);
			row.style.display = match ? "" : "none";
			anyVisible ||= match;
		}
		card.style.display = anyVisible ? "" : "none";
	}
}

function buildFields(root: HTMLElement, state: EditorFormState): void {
	const profile = currentProfile(state);
	const groups = groupMarkersByPanel(state.markers.filter((m) => m.type !== "derived" && (!m.sex || m.sex === profile?.sex)));

	const columns: (typeof groups)[number][][] = [[], [], []];
	for (const group of groups) columns[columnForPanel(group.panel)].push(group);
	for (const columnGroups of columns) {
		columnGroups.sort((a, b) => orderForPanel(a.panel) - orderForPanel(b.panel) || a.panel.localeCompare(b.panel));
	}

	const searchWrap = root.createDiv({ cls: "hlth-editor-search" });
	searchWrap.appendChild(iconFor("search"));
	const searchInput = searchWrap.createEl("input", { cls: "hlth-editor-search-input", attr: { type: "text", placeholder: "Search markers…" } });
	searchInput.value = state.search;

	const panels = root.createDiv({ cls: "hlth-editor-panels" });
	for (const columnGroups of columns) {
		if (columnGroups.length === 0) continue;
		const col = panels.createDiv({ cls: "hlth-editor-col" });
		for (const group of columnGroups) buildPanelCard(col, group, profile, state);
	}

	searchInput.addEventListener("input", () => {
		state.search = searchInput.value;
		applySearchFilter(panels, state.search);
	});
	// A persisted, non-empty search (carried over from before a structural rerender -- person/date
	// change, add-marker) needs re-applying now that the rows exist again.
	if (state.search) applySearchFilter(panels, state.search);
}

function buildPanelCard(col: HTMLElement, group: { panel: string; markers: MarkerNote[] }, profile: ProfileNote | undefined, state: EditorFormState): void {
	const card = col.createDiv({ cls: "hlth-editor-panel" });

	// Same head treatment as the dashboard's concern-group header (`.hlth-grp-head`/`.hlth-lbl`),
	// minus the icon lookup and status dot -- those are keyed by concern, a deliberately separate
	// axis from panel (CLAUDE.md), so a panel head can't borrow them without conflating the two.
	const head = card.createDiv({ cls: "hlth-editor-panel-head" });
	head.appendChild(iconFor("list"));
	head.createSpan({ cls: "hlth-lbl hlth-grp-label", text: group.panel });
	for (const row of pairMarkerNotes(group.markers)) {
		if (row.secondary) buildPairRow(card, row.primary, row.secondary, state);
		else if (row.primary.type === "qualitative") buildQualitativeRow(card, row.primary, state);
		else buildNumericRow(card, row.primary, profile, state);
	}
}

/** A range hint costs nothing extra vertically as a placeholder (vs. a second description line
 *  like the old Setting-based row had) -- falls back to the unit when there's no band to show.
 *  `resolveBandForEntry` returns the band in the marker's canonical unit, so a non-canonical
 *  `unit` (the alt-unit toggle) needs the band converted before display, not just the raw value. */
function rangePlaceholder(marker: MarkerNote, profile: ProfileNote | undefined, state: EditorFormState, unit: string): string {
	const band = profile ? resolveBandForEntry(marker, profile, state.date) : {};
	const toUnit = (value: number) => (marker.unit && unit !== marker.unit ? convertTo(value, unit, marker) : value);
	const round = (value: number) => Math.round(value * 1000) / 1000;
	if (band.low !== undefined && band.high !== undefined) return `${round(toUnit(band.low))}–${round(toUnit(band.high))}`;
	if (band.low !== undefined) return `≥${round(toUnit(band.low))}`;
	if (band.high !== undefined) return `≤${round(toUnit(band.high))}`;
	return unit || "value";
}

/** Search text a row matches against -- name plus aliases, so e.g. typing "ALT" still finds
 *  "Alanine Aminotransferase" even on a marker whose name doesn't spell the abbreviation out. */
function searchTextFor(marker: MarkerNote): string {
	return [marker.name, ...marker.aliases].join(" ").toLowerCase();
}

function buildNumericRow(root: HTMLElement, marker: MarkerNote, profile: ProfileNote | undefined, state: EditorFormState): void {
	const options = unitOptions(marker);
	const fs = fieldState(state, marker.id, options[0]?.value ?? "");

	const row = root.createDiv({ cls: "hlth-editor-row" });
	row.dataset.search = searchTextFor(marker);
	row.createSpan({ cls: "hlth-editor-name", text: marker.name, attr: { title: marker.name } });

	const controls = row.createDiv({ cls: "hlth-editor-controls" });
	const input = controls.createEl("input", { cls: "hlth-editor-value", attr: { placeholder: rangePlaceholder(marker, profile, state, fs.unit) } });
	input.value = fs.raw;
	input.addEventListener("input", () => {
		fs.raw = input.value;
		state.dirty = true;
	});

	if (options.length > 1) {
		// Only ever two options (canonical + alt), so a click-to-toggle label reads faster than a
		// dropdown that always has exactly one alternative to pick -- mirrors the dashboard's
		// buildUnitCell instead of forcing an open/select/close dropdown interaction for one choice.
		const unitLabel = controls.createSpan({ cls: "hlth-editor-unit hlth-unit-toggle" });
		const otherOption = () => options.find((option) => option.value !== fs.unit) ?? options[0];
		const paintUnit = () => {
			unitLabel.textContent = fs.unit;
			unitLabel.title = `Click to show in ${otherOption().label}`;
		};
		paintUnit();
		unitLabel.addEventListener("click", () => {
			const target = otherOption();
			// Convert the already-typed number along with the unit switch, rather than leaving it
			// as-is under the new unit label -- switching mg/dL -> µmol/L should reflect the same
			// reading, not silently relabel the same digits.
			const parsed = Number(fs.raw.trim());
			if (fs.raw.trim() !== "" && Number.isFinite(parsed)) {
				const canonical = convert(parsed, fs.unit, marker);
				const converted = convertTo(canonical, target.value, marker);
				fs.raw = String(Math.round(converted * 1000) / 1000);
				input.value = fs.raw;
			}
			fs.unit = target.value;
			input.placeholder = rangePlaceholder(marker, profile, state, fs.unit);
			paintUnit();
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
	row.dataset.search = `${searchTextFor(primary)} ${searchTextFor(secondary)}`;
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

function buildQualitativeRow(root: HTMLElement, marker: MarkerNote, state: EditorFormState): void {
	const fs = fieldState(state, marker.id, "");
	const normal = marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
	// "" (blank) and any listed normal value are known options; anything else (a prior free-text
	// entry, e.g. a graded "2+" result) means Other was picked and its text lives in fs.raw itself.
	const isKnownValue = fs.raw === "" || normal.includes(fs.raw);

	const row = root.createDiv({ cls: "hlth-editor-row" });
	row.dataset.search = searchTextFor(marker);
	row.createSpan({ cls: "hlth-editor-name", text: marker.name, attr: { title: marker.name } });

	const controls = row.createDiv({ cls: "hlth-editor-controls" });
	const select = controls.createEl("select", { cls: "hlth-editor-unit-select hlth-editor-qualitative" });
	// An untouched field must stay on this blank option, not pre-pick normal[0] -- otherwise Save
	// can't distinguish "user confirmed normal" from "marker wasn't logged this visit"
	// (evaluateQualitativeField treats "" as omitted, which is exactly what an unlogged marker wants).
	select.createEl("option", { value: "", text: "-" });
	for (const option of normal) select.createEl("option", { value: option, text: option });
	select.createEl("option", { value: OTHER_OPTION, text: "Other…" });
	select.value = isKnownValue ? fs.raw : OTHER_OPTION;

	// Always in the DOM (not conditionally rebuilt on select change, which previously required a
	// full-form rerender and -- since picking "Other…" sets fs.raw to "" until something's typed --
	// made "" ambiguous between "blank" and "Other, nothing typed yet" and hid the box entirely).
	// Toggling visibility off the select's own value sidesteps that ambiguity. Inline `display`,
	// not the `.hlth-hidden` class -- that class is scoped `.hlth-row.hlth-hidden` (dashboard rows
	// only) and silently never matches an `<input>` that isn't itself a `.hlth-row`.
	const text = controls.createEl("input", { cls: "hlth-editor-value hlth-editor-value-wide", attr: { placeholder: "Free text" } });
	text.value = isKnownValue ? "" : fs.raw;
	text.style.display = isKnownValue ? "none" : "";

	select.addEventListener("change", () => {
		const other = select.value === OTHER_OPTION;
		text.style.display = other ? "" : "none";
		fs.raw = other ? text.value : select.value;
		state.dirty = true;
		if (other) text.focus();
	});
	text.addEventListener("input", () => {
		fs.raw = text.value;
		state.dirty = true;
	});
}

/** Same compact `.hlth-editor-field`/`.hlth-editor-select` shape as the Person/Date/Facility row
 *  above -- not Obsidian's `Setting` rows, which are full settings-page-sized and looked wildly
 *  out of place (and much taller) next to the rest of this form's compact controls. */
function buildAddMarkerForm(root: HTMLElement, state: EditorFormState, opts: VisitEditorOptions): void {
	const details = root.createEl("details", { cls: "hlth-modal-addmarker" });
	details.createEl("summary", { text: "+ add a new marker" });

	const body = details.createDiv({ cls: "hlth-editor-meta-fields" });
	const draft = { name: "", id: "", type: "numeric" as MarkerKind, unit: "", panel: "" };
	const panels = Array.from(new Set(state.markers.map((m) => m.panel).filter((p) => p))).sort((a, b) => a.localeCompare(b));

	const nameInput = buildEditorField(body, "Name").createEl("input", { cls: "hlth-editor-select" });
	nameInput.addEventListener("input", () => (draft.name = nameInput.value));

	const idInput = buildEditorField(body, "ID").createEl("input", { cls: "hlth-editor-select" });
	idInput.addEventListener("input", () => (draft.id = idInput.value));

	const typeSelect = buildEditorField(body, "Type").createEl("select", { cls: "hlth-editor-select" });
	typeSelect.createEl("option", { value: "numeric", text: "Numeric" });
	typeSelect.createEl("option", { value: "qualitative", text: "Qualitative" });
	typeSelect.addEventListener("change", () => (draft.type = typeSelect.value as MarkerKind));

	const unitInput = buildEditorField(body, "Unit").createEl("input", { cls: "hlth-editor-select" });
	unitInput.addEventListener("input", () => (draft.unit = unitInput.value));

	// Same select+Other pattern as a qualitative row's dropdown (buildQualitativeRow) -- pick an
	// existing panel by default, or "Other…" to reveal a free-text box for a brand-new one.
	const panelField = buildEditorField(body, "Panel");
	const panelSelect = panelField.createEl("select", { cls: "hlth-editor-select" });
	for (const panel of panels) panelSelect.createEl("option", { value: panel, text: panel });
	panelSelect.createEl("option", { value: OTHER_OPTION, text: "Other…" });

	const panelOtherInput = panelField.createEl("input", { cls: "hlth-editor-select", attr: { placeholder: "New panel name" } });

	const noExistingPanels = panels.length === 0;
	panelSelect.value = noExistingPanels ? OTHER_OPTION : panels[0];
	draft.panel = noExistingPanels ? "" : panels[0];
	panelOtherInput.style.display = noExistingPanels ? "" : "none";

	panelSelect.addEventListener("change", () => {
		const other = panelSelect.value === OTHER_OPTION;
		panelOtherInput.style.display = other ? "" : "none";
		draft.panel = other ? panelOtherInput.value : panelSelect.value;
		if (other) panelOtherInput.focus();
	});
	panelOtherInput.addEventListener("input", () => (draft.panel = panelOtherInput.value));

	const addButton = body.createEl("button", { cls: "hlth-showall-btn hlth-editor-save", text: "Add marker" });
	addButton.type = "button";
	addButton.addEventListener("click", () => {
		opts.onAddMarker({ id: draft.id.trim(), name: draft.name.trim(), type: draft.type, unit: draft.unit.trim(), panel: draft.panel.trim() });
	});
}

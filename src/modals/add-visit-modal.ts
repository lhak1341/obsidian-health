import { App, Modal, Notice, Setting } from "obsidian";
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
} from "../core/entry";
import type { MarkerKind, MarkerNote, ProfileNote } from "../core/types";
import type { VaultPaths, VaultSnapshot } from "../vault/reader";
import { saveNewMarkerNote, saveVisitNote } from "../vault/writer";

const OTHER_OPTION = "__other__";

/** Prefixes a field error with its marker's name; a blank markerId (the date check) has no marker to name. */
function formatVisitError(error: VisitFieldError, markersById: Map<string, MarkerNote>): string {
	if (!error.markerId) return error.reason;
	return `${markersById.get(error.markerId)!.name}: ${error.reason}`;
}

export class AddVisitModal extends Modal {
	private markers: MarkerNote[];
	private person: string;
	private date: string;
	private readonly fields = new Map<string, FieldState>();
	private reviewing = false;
	private errors: string[] = [];

	constructor(
		app: App,
		private readonly paths: VaultPaths,
		private readonly snapshot: VaultSnapshot,
		defaultPerson: string,
		private readonly onSaved: () => void,
	) {
		super(app);
		this.markers = [...snapshot.markers];
		this.person = defaultPerson;
		this.date = new Date().toISOString().slice(0, 10);
	}

	onOpen(): void {
		this.prefillFromExistingVisit();
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
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
		if (!existing) return;

		for (const marker of this.markers) {
			const value = existing.values[marker.id];
			if (value === undefined) continue;
			this.fields.set(marker.id, { raw: String(value), unit: marker.unit ?? "" });
		}
	}

	private render(): void {
		this.contentEl.empty();
		this.titleEl.setText("Add lab visit");

		this.buildPersonDateRow(this.contentEl);

		if (this.errors.length > 0) this.buildErrors(this.contentEl);

		if (this.reviewing) {
			this.buildSummary(this.contentEl);
		} else {
			this.buildFields(this.contentEl);
			this.buildAddMarkerForm(this.contentEl);
		}

		this.buildFooter(this.contentEl);
	}

	private buildPersonDateRow(root: HTMLElement): void {
		new Setting(root)
			.setName("Person")
			.addDropdown((dropdown) => {
				for (const profile of this.snapshot.profiles) dropdown.addOption(profile.person, profile.person);
				dropdown.setValue(this.person);
				dropdown.onChange((value) => {
					this.person = value;
					this.reviewing = false;
					this.prefillFromExistingVisit();
					this.render();
				});
			})
			.addText((text) => {
				text.inputEl.type = "date";
				text.setValue(this.date);
				text.onChange((value) => {
					this.date = value;
					this.reviewing = false;
					this.prefillFromExistingVisit();
					this.render();
				});
			});
	}

	private buildErrors(root: HTMLElement): void {
		const box = root.createDiv({ cls: "hlth-modal-errors" });
		for (const error of this.errors) box.createDiv({ text: error });
	}

	private buildFields(root: HTMLElement): void {
		const profile = this.currentProfile();
		const groups = groupMarkersByPanel(this.markers.filter((m) => m.type !== "derived"));

		for (const group of groups) {
			root.createEl("h4", { text: group.panel });
			for (const row of pairMarkerNotes(group.markers)) {
				if (row.secondary) this.buildPairRow(root, row.primary, row.secondary);
				else if (row.primary.type === "qualitative") this.buildQualitativeRow(root, row.primary);
				else this.buildNumericRow(root, row.primary, profile);
			}
		}
	}

	private buildNumericRow(root: HTMLElement, marker: MarkerNote, profile: ProfileNote | undefined): void {
		const options = unitOptions(marker);
		const state = this.fieldState(marker.id, options[0]?.value ?? "");
		const band = profile ? resolveBandForEntry(marker, profile, this.date) : {};

		const setting = new Setting(root)
			.setName(marker.name)
			.setDesc(band.low !== undefined || band.high !== undefined ? `Normal ${band.low ?? "–"}–${band.high ?? "–"} ${marker.unit ?? ""}` : "")
			.addText((text) => {
				text.setPlaceholder(marker.unit ?? "value");
				text.setValue(state.raw);
				text.onChange((value) => (state.raw = value));
			});

		if (options.length > 1) {
			setting.addDropdown((dropdown) => {
				for (const option of options) dropdown.addOption(option.value, option.label);
				dropdown.setValue(state.unit);
				dropdown.onChange((value) => (state.unit = value));
			});
		}
	}

	private buildPairRow(root: HTMLElement, primary: MarkerNote, secondary: MarkerNote): void {
		const primaryState = this.fieldState(primary.id, primary.unit ?? "");
		const secondaryState = this.fieldState(secondary.id, secondary.unit ?? "");

		new Setting(root)
			.setName(`${primary.name} / ${secondary.name}`)
			.addText((text) => {
				text.setPlaceholder(primary.name);
				text.setValue(primaryState.raw);
				text.onChange((value) => (primaryState.raw = value));
			})
			.addText((text) => {
				text.setPlaceholder(secondary.name);
				text.setValue(secondaryState.raw);
				text.onChange((value) => (secondaryState.raw = value));
			});
	}

	private buildQualitativeRow(root: HTMLElement, marker: MarkerNote): void {
		const state = this.fieldState(marker.id, "");
		const normal = marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
		const isSeeded = state.raw === "" || normal.includes(state.raw);

		const setting = new Setting(root).setName(marker.name);

		setting.addDropdown((dropdown) => {
			for (const option of normal) dropdown.addOption(option, option);
			dropdown.addOption(OTHER_OPTION, "Other…");
			dropdown.setValue(isSeeded && state.raw !== "" ? state.raw : isSeeded ? normal[0] ?? OTHER_OPTION : OTHER_OPTION);
			dropdown.onChange((value) => {
				if (value === OTHER_OPTION) {
					state.raw = "";
				} else {
					state.raw = value;
				}
				this.render();
			});

			if (!isSeeded || (state.raw === "" && normal.length === 0)) {
				dropdown.setValue(OTHER_OPTION);
			}
		});

		if (!isSeeded) {
			setting.addText((text) => {
				text.setPlaceholder("Free text");
				text.setValue(state.raw);
				text.onChange((value) => (state.raw = value));
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
		await saveNewMarkerNote(this.app, this.paths, newMarker);
		this.markers.push({ ...newMarker, aliases: [], blurb: "" });

		details.open = false;
		this.render();
	}

	private markersById(): Map<string, MarkerNote> {
		return new Map(this.markers.map((m) => [m.id, m]));
	}

	private buildSummary(root: HTMLElement): void {
		const { entries } = evaluateVisitFields(this.markers, this.fields, this.currentProfile(), this.date);
		const markersById = this.markersById();
		const summary = buildPreSaveSummary(markersById, entries);

		root.createEl("h4", { text: "Review before saving" });
		if (summary.length === 0) {
			root.createDiv({ text: "No values entered." });
			return;
		}

		const list = root.createDiv({ cls: "hlth-modal-summary" });
		for (const line of summary) {
			const row = list.createDiv({ cls: line.softWarn ? "hlth-modal-summary-warn" : "" });
			const convertedNote = String(line.canonical) !== line.raw.trim() ? ` (entered ${line.raw})` : "";
			row.setText(`${line.label}: ${line.canonical}${line.unit ? ` ${line.unit}` : ""}${convertedNote}${line.softWarn ? " — unusually far outside range, please double-check" : ""}`);
		}
	}

	private buildFooter(root: HTMLElement): void {
		const footer = root.createDiv({ cls: "hlth-modal-footer" });

		if (this.reviewing) {
			new Setting(footer)
				.addButton((btn) => btn.setButtonText("Back").onClick(() => {
					this.reviewing = false;
					this.render();
				}))
				.addButton((btn) =>
					btn
						.setButtonText("Confirm & save")
						.setCta()
						.onClick(() => void this.save()),
				);
			return;
		}

		new Setting(footer).addButton((btn) =>
			btn
				.setButtonText("Review")
				.setCta()
				.onClick(() => {
					const { errors } = evaluateVisitFields(this.markers, this.fields, this.currentProfile(), this.date);
					const markersById = this.markersById();
					this.errors = errors.map((e) => formatVisitError(e, markersById));
					if (errors.length > 0) {
						this.render();
						return;
					}
					this.reviewing = true;
					this.render();
				}),
		);
	}

	private async save(): Promise<void> {
		const { entries, errors } = evaluateVisitFields(this.markers, this.fields, this.currentProfile(), this.date);
		if (errors.length > 0) {
			this.errors = errors.map((e) => formatVisitError(e, this.markersById()));
			this.reviewing = false;
			this.render();
			return;
		}

		const values = buildVisitValues(entries);
		await saveVisitNote(this.app, this.paths, this.person, this.date, values);

		new Notice(`Saved lab visit for ${this.person} on ${this.date}.`);
		this.onSaved();
		this.close();
	}
}

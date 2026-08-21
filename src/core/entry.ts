import { convert, isSoftWarn, resolve } from "./dashboard";
import type { ResolvedRange } from "./model";
import type { MarkerNote, ProfileNote, VisitNote } from "./types";

export interface PanelGroup {
	panel: string;
	markers: MarkerNote[];
}

/** Groups markers by panel for the entry form; panels and markers within them sort by name. */
export function groupMarkersByPanel(markers: MarkerNote[]): PanelGroup[] {
	const byPanel = new Map<string, MarkerNote[]>();
	for (const marker of markers) {
		const group = byPanel.get(marker.panel) ?? [];
		group.push(marker);
		byPanel.set(marker.panel, group);
	}

	return [...byPanel.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([panel, panelMarkers]) => ({
			panel,
			markers: [...panelMarkers].sort((a, b) => a.name.localeCompare(b.name)),
		}));
}

export interface MarkerRow {
	primary: MarkerNote;
	secondary?: MarkerNote;
}

/** Pairs items sharing a partner key (e.g. BP systolic/diastolic sharing a `pair` id) into one row,
 *  ordered by `getOrder` (missing order treated as primary=0/secondary=1). Shared by the entry
 *  form's marker pairing and the render layer's row pairing -- same algorithm, different types. */
export function pairByPartner<T>(
	items: T[],
	getId: (item: T) => string,
	getPair: (item: T) => string | undefined,
	getOrder: (item: T) => number | undefined,
): { primary: T; secondary?: T }[] {
	const consumed = new Set<string>();
	const rows: { primary: T; secondary?: T }[] = [];

	for (const item of items) {
		const id = getId(item);
		if (consumed.has(id)) continue;
		consumed.add(id);

		const pairKey = getPair(item);
		// Excludes already-consumed candidates (which, since `id` is already in `consumed` at this
		// point, also excludes self-matching): without this, a 3rd+ item sharing the same pair id
		// (a plausible typo since `pair` is unvalidated free text) could re-match an already-paired
		// item, producing two rows that both contain it instead of one item falling back to solo.
		const partner = pairKey ? items.find((other) => !consumed.has(getId(other)) && getPair(other) === pairKey) : undefined;

		if (partner) {
			consumed.add(getId(partner));
			const order = getOrder(item) ?? 0;
			const partnerOrder = getOrder(partner) ?? 1;
			rows.push(order <= partnerOrder ? { primary: item, secondary: partner } : { primary: partner, secondary: item });
		} else {
			rows.push({ primary: item });
		}
	}

	return rows;
}

/** Pairs markers sharing a `pair` id (e.g. BP systolic/diastolic) into one form row, ordered by `order`. */
export function pairMarkerNotes(markers: MarkerNote[]): MarkerRow[] {
	return pairByPartner(
		markers,
		(m) => m.id,
		(m) => m.pair,
		(m) => m.order,
	);
}

/** Create-or-edit lookup: an existing visit for this person+date, if any. */
export function findVisit(visits: VisitNote[], person: string, date: string): VisitNote | undefined {
	return visits.find((visit) => visit.person === person && visit.date === date);
}

/** Prefills a visit form's field state from an existing visit when person+date match one
 *  (create-or-edit by date); empty fields/facility when there's no match. The stored value is
 *  already the lab's raw reading -- `units[id]` (falling back to the marker's canonical unit)
 *  says what unit it's in, no conversion needed to display it. */
export function prefillFields(visits: VisitNote[], markers: MarkerNote[], person: string, date: string): { fields: Map<string, FieldState>; facility: string } {
	const fields = new Map<string, FieldState>();
	const existing = findVisit(visits, person, date);
	if (!existing) return { fields, facility: "" };

	for (const marker of markers) {
		const value = existing.values[marker.id];
		if (value === undefined) continue;
		const unit = existing.units?.[marker.id] ?? marker.unit ?? "";
		fields.set(marker.id, { raw: String(value), unit });
	}
	return { fields, facility: existing.facility ?? "" };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateDate(raw: string): string | undefined {
	if (!raw.trim()) return "Date is required.";
	if (!DATE_PATTERN.test(raw) || Number.isNaN(new Date(raw).getTime())) return "Date must be a valid YYYY-MM-DD date.";
	return undefined;
}

export function checkDuplicateMarkerId(id: string, existingIds: string[]): boolean {
	return existingIds.includes(id);
}

export type FieldOutcome =
	| { kind: "omitted" }
	| { kind: "blocked"; reason: string }
	| { kind: "ok"; value: number | string; softWarn: boolean };

/** Numeric entry pipeline: hard-blocks malformed input and unknown units, soft-warns using the
 *  canonical-converted magnitude against the band -- but `value` stays the raw entered number in
 *  its original unit (never the canonical conversion). Storage keeps what the lab actually printed;
 *  conversion to canonical happens at read time (see `dashboard.ts`'s `buildSeries`), keyed off the
 *  visit's `<id>_unit` sibling key (see `buildVisitValues`). */
export function evaluateNumericField(raw: string, unit: string, marker: MarkerNote, band: ResolvedRange): FieldOutcome {
	const trimmed = raw.trim();
	if (trimmed === "") return { kind: "omitted" };

	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed)) return { kind: "blocked", reason: `"${raw}" is not a number.` };

	let canonical: number;
	if (marker.unit === undefined && unit === "") {
		// Unitless markers (e.g. pH, specific gravity) have nothing to pick or convert against.
		canonical = parsed;
	} else {
		try {
			canonical = convert(parsed, unit, marker);
		} catch (err) {
			return { kind: "blocked", reason: (err as Error).message };
		}
	}

	return { kind: "ok", value: parsed, softWarn: isSoftWarn(canonical, band) };
}

export type BoundOutcome = { kind: "omitted" } | { kind: "blocked"; reason: string } | { kind: "ok"; value: number };

/** Numeric parsing for a personal target bound (`EditTargetModal`'s Low/High fields) -- no unit
 *  conversion, no band soft-warn, since a target bound isn't a reading compared against a
 *  reference range the way a visit value is. Shares only the blank/parse/finite core with
 *  `evaluateNumericField`. */
export function evaluateBoundField(raw: string): BoundOutcome {
	const trimmed = raw.trim();
	if (trimmed === "") return { kind: "omitted" };

	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed)) return { kind: "blocked", reason: `"${raw}" is not a number.` };

	return { kind: "ok", value: parsed };
}

export function evaluateQualitativeField(raw: string): FieldOutcome {
	const trimmed = raw.trim();
	if (trimmed === "") return { kind: "omitted" };
	return { kind: "ok", value: trimmed, softWarn: false };
}

export interface FieldEntry {
	markerId: string;
	outcome: FieldOutcome;
	/** Unit `outcome.value` is expressed in (numeric fields only) -- the unit the lab actually
	 *  reported, not necessarily the marker's canonical unit. */
	unit?: string;
}

/** A field entry with its raw user input retained, for review/summary display. */
export type FieldEvaluation = FieldEntry & { raw: string };

export interface FieldState {
	raw: string;
	unit: string;
}

export interface VisitFieldError {
	markerId: string;
	reason: string;
}

/** Prefixes a field error with its marker's name; a blank markerId (the date check) has no marker to name. */
export function formatVisitError(error: VisitFieldError, markersById: Map<string, MarkerNote>): string {
	if (!error.markerId) return error.reason;
	return `${markersById.get(error.markerId)!.name}: ${error.reason}`;
}

/** Orchestrates a whole visit form's worth of fields: skips derived markers (computed, never entered)
 *  and markers with no field state, dispatches numeric vs qualitative evaluation, resolves the
 *  profile's personal band when a profile is present, and folds the date's own validity into the
 *  same error list every caller needs to decide "is this visit save-able". */
export function evaluateVisitFields(
	markers: MarkerNote[],
	fields: Map<string, FieldState>,
	profile: ProfileNote | undefined,
	date: string,
): { entries: FieldEvaluation[]; errors: VisitFieldError[] } {
	const entries: FieldEvaluation[] = [];
	const errors: VisitFieldError[] = [];

	const dateError = validateDate(date);
	if (dateError) errors.push({ markerId: "", reason: dateError });

	for (const marker of markers) {
		if (marker.type === "derived") continue;
		const state = fields.get(marker.id);
		if (!state) continue;

		const outcome =
			marker.type === "qualitative"
				? evaluateQualitativeField(state.raw)
				: evaluateNumericField(state.raw, state.unit, marker, profile ? resolveBandForEntry(marker, profile, date) : {});

		if (outcome.kind === "blocked") errors.push({ markerId: marker.id, reason: outcome.reason });
		entries.push({ markerId: marker.id, raw: state.raw, outcome, unit: marker.type === "numeric" ? state.unit : undefined });
	}

	return { entries, errors };
}

/** Assembles the values map that becomes the visit note body: omitted/blocked fields drop their key
 *  entirely. `outcome.value` is written as-is (the raw entered number, not canonical) alongside a
 *  `<id>_unit` sibling key whenever the entered unit differs from the marker's canonical one, so the
 *  note keeps exactly what the lab reported instead of a lossy canonical conversion. */
export function buildVisitValues(entries: FieldEntry[], markersById: Map<string, MarkerNote>): Record<string, number | string> {
	const values: Record<string, number | string> = {};
	for (const entry of entries) {
		if (entry.outcome.kind !== "ok") continue;
		values[entry.markerId] = entry.outcome.value;

		const marker = markersById.get(entry.markerId);
		if (entry.unit && marker?.unit !== undefined && entry.unit !== marker.unit) {
			values[`${entry.markerId}_unit`] = entry.unit;
		}
	}
	return values;
}

export function buildVisitFrontmatter(person: string, date: string, values: Record<string, number | string>, facility?: string): Record<string, unknown> {
	return { type: "lab-visit", person, date, ...(facility ? { facility } : {}), ...values };
}

export interface SummaryLine {
	markerId: string;
	label: string;
	raw: string;
	value: number | string;
	unit?: string;
	softWarn: boolean;
}

/** Pre-save summary rows for fields that will actually be written, so wildly-off entries can be
 *  eyeballed (via `softWarn`) before writing. */
export function buildPreSaveSummary(markersById: Map<string, MarkerNote>, entries: FieldEvaluation[]): SummaryLine[] {
	const lines: SummaryLine[] = [];
	for (const entry of entries) {
		if (entry.outcome.kind !== "ok") continue;
		const marker = markersById.get(entry.markerId);
		lines.push({
			markerId: entry.markerId,
			label: marker?.name ?? entry.markerId,
			raw: entry.raw,
			value: entry.outcome.value,
			unit: entry.unit ?? marker?.unit,
			softWarn: entry.outcome.softWarn,
		});
	}
	return lines;
}

export interface UnitOption {
	value: string;
	label: string;
}

/** Unit choices for a numeric marker's picker: canonical first, then the alt unit if dual-unit. */
export function unitOptions(marker: MarkerNote): UnitOption[] {
	const options: UnitOption[] = [];
	if (marker.unit) options.push({ value: marker.unit, label: marker.unit });
	if (marker.altUnit) options.push({ value: marker.altUnit, label: marker.altUnit });
	return options;
}

export function resolveBandForEntry(marker: MarkerNote, profile: ProfileNote, date: string): ResolvedRange {
	if (marker.type !== "numeric") return {};
	return resolve(marker, profile, date);
}

/** Hard-blocks a profile missing its load-bearing facts for range resolution: person id and sex. */
export function validateProfileInput(person: string, sex: string): string | undefined {
	if (!person.trim()) return "Person is required.";
	if (sex !== "m" && sex !== "f") return "Sex must be m or f.";
	return undefined;
}

/** Splits a free-text comma-separated allergy list into trimmed, non-empty entries. */
export function parseAllergies(raw: string): string[] {
	return raw
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

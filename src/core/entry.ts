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

/** Pairs markers sharing a `pair` id (e.g. BP systolic/diastolic) into one form row, ordered by `order`. */
export function pairMarkerNotes(markers: MarkerNote[]): MarkerRow[] {
	const consumed = new Set<string>();
	const rows: MarkerRow[] = [];

	for (const marker of markers) {
		if (consumed.has(marker.id)) continue;
		consumed.add(marker.id);

		const partner = marker.pair ? markers.find((other) => other.id !== marker.id && other.pair === marker.pair) : undefined;

		if (partner) {
			consumed.add(partner.id);
			const markerOrder = marker.order ?? 0;
			const partnerOrder = partner.order ?? 1;
			rows.push(markerOrder <= partnerOrder ? { primary: marker, secondary: partner } : { primary: partner, secondary: marker });
		} else {
			rows.push({ primary: marker });
		}
	}

	return rows;
}

/** Create-or-edit lookup: an existing visit for this person+date, if any. */
export function findVisit(visits: VisitNote[], person: string, date: string): VisitNote | undefined {
	return visits.find((visit) => visit.person === person && visit.date === date);
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

/** Numeric entry pipeline: pick unit -> convert to canonical -> hard-block malformed -> soft-warn wildly outside band. */
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

	return { kind: "ok", value: canonical, softWarn: isSoftWarn(canonical, band) };
}

export function evaluateQualitativeField(raw: string): FieldOutcome {
	const trimmed = raw.trim();
	if (trimmed === "") return { kind: "omitted" };
	return { kind: "ok", value: trimmed, softWarn: false };
}

export interface FieldEntry {
	markerId: string;
	outcome: FieldOutcome;
}

/** A field entry with its raw user input retained, for review/summary display. */
export type FieldEvaluation = FieldEntry & { raw: string };

/** Assembles the values map that becomes the visit note body: omitted/blocked fields drop their key entirely. */
export function buildVisitValues(entries: FieldEntry[]): Record<string, number | string> {
	const values: Record<string, number | string> = {};
	for (const entry of entries) {
		if (entry.outcome.kind === "ok") values[entry.markerId] = entry.outcome.value;
	}
	return values;
}

export function buildVisitFrontmatter(person: string, date: string, values: Record<string, number | string>): Record<string, unknown> {
	return { type: "lab-visit", person, date, ...values };
}

export interface SummaryLine {
	markerId: string;
	label: string;
	raw: string;
	canonical: number | string;
	unit?: string;
	softWarn: boolean;
}

/** Pre-save summary rows for fields that will actually be written, so converted values can be eyeballed before writing. */
export function buildPreSaveSummary(markersById: Map<string, MarkerNote>, entries: FieldEvaluation[]): SummaryLine[] {
	const lines: SummaryLine[] = [];
	for (const entry of entries) {
		if (entry.outcome.kind !== "ok") continue;
		const marker = markersById.get(entry.markerId);
		lines.push({
			markerId: entry.markerId,
			label: marker?.name ?? entry.markerId,
			raw: entry.raw,
			canonical: entry.outcome.value,
			unit: marker?.unit,
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

import type { ResolvedRange } from "./model";
import type { MarkerNote } from "./types";

/** A reported value in `fromUnit` -> the marker's canonical unit. Throws on a unit the marker
 *  can't convert from (unknown, or an `alt_unit` with no `alt_factor`). */
export function convert(value: number, fromUnit: string, marker: MarkerNote): number {
	if (fromUnit === marker.unit) return value;
	if (fromUnit === marker.altUnit && marker.altFactor !== undefined) return value * marker.altFactor;
	throw new Error(`Marker "${marker.id}" has no known unit "${fromUnit}"`);
}

/** Inverse of `convert`: canonical-unit value -> `toUnit` (the marker's unit or altUnit). */
export function convertTo(value: number, toUnit: string, marker: MarkerNote): number {
	if (toUnit === marker.unit) return value;
	if (toUnit === marker.altUnit && marker.altFactor !== undefined) return value / marker.altFactor;
	throw new Error(`Marker "${marker.id}" has no known unit "${toUnit}"`);
}

/** Whether `marker` has a defined alt unit to toggle into (Uric Acid mg/dL <-> µmol/L, etc). The
 *  one dual-unit predicate: the dashboard toggle and the visit editor's unit choices both use it. */
export function isToggleable(marker: MarkerNote): boolean {
	return marker.altUnit !== undefined && marker.altFactor !== undefined;
}

/** A canonical-unit range -> `toUnit`, bound by bound. Throws like `convertTo`. */
export function convertRange(range: ResolvedRange, toUnit: string, marker: MarkerNote): ResolvedRange {
	return {
		low: range.low !== undefined ? convertTo(range.low, toUnit, marker) : undefined,
		high: range.high !== undefined ? convertTo(range.high, toUnit, marker) : undefined,
	};
}

/** Units a visit-editor field can be entered in: canonical first, then the alt unit only when it
 *  converts -- an `alt_unit` without `alt_factor` is never offered, since `convert` would reject
 *  every value entered in it. */
export function unitChoices(marker: MarkerNote): string[] {
	const choices: string[] = [];
	if (marker.unit) choices.push(marker.unit);
	if (isToggleable(marker)) choices.push(marker.altUnit!);
	return choices;
}

/** Three decimals: enough for any lab value, short enough for a form field. */
function roundForEntry(value: number): number {
	return Math.round(value * 1000) / 1000;
}

/** A typed field value re-expressed in `to` along with a unit switch, so switching mg/dL -> µmol/L
 *  shows the same reading rather than relabelling the same digits. Blank or non-numeric input, or a
 *  `from` unit the marker can't convert (a stale stored `<id>_unit`), comes back unchanged. */
export function switchUnit(raw: string, from: string, to: string, marker: MarkerNote): string {
	const trimmed = raw.trim();
	const parsed = Number(trimmed);
	if (trimmed === "" || !Number.isFinite(parsed)) return raw;
	try {
		return String(roundForEntry(convertTo(convert(parsed, from, marker), to, marker)));
	} catch {
		return raw;
	}
}

/** A canonical-unit band re-expressed in the unit a field is being entered in, rounded for display.
 *  A unit the marker can't convert to yields no band rather than a canonical band shown under the
 *  wrong unit label. */
export function bandInUnit(band: ResolvedRange, unit: string, marker: MarkerNote): ResolvedRange {
	let converted: ResolvedRange;
	try {
		converted = !marker.unit || unit === marker.unit ? band : convertRange(band, unit, marker);
	} catch {
		return {};
	}
	return {
		low: converted.low !== undefined ? roundForEntry(converted.low) : undefined,
		high: converted.high !== undefined ? roundForEntry(converted.high) : undefined,
	};
}

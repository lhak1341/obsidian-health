import type { Arrow, ArrowDirection, ArrowTone, ResolvedRange, Status } from "../core/model";
import type { MarkerNote } from "../core/types";

export function statusColor(status: Status): string {
	switch (status) {
		case "high":
			return "var(--color-red)";
		case "low":
			return "var(--color-blue)";
		case "watch":
			return "var(--color-orange)";
		case "good":
			return "var(--color-green)";
	}
}

export function arrowColor(tone: ArrowTone): string {
	switch (tone) {
		case "good":
			return "var(--color-green)";
		case "bad":
			return "var(--color-red)";
		case "neutral":
			return "var(--text-faint)";
	}
}

export function arrowGlyph(direction: ArrowDirection): string {
	switch (direction) {
		case "up":
			return "▲";
		case "down":
			return "▼";
		case "flat":
			return "–";
	}
}

export function formatArrow(arrow: Arrow | undefined): { glyph: string; color: string } {
	if (!arrow) return { glyph: "", color: "var(--text-faint)" };
	return { glyph: arrowGlyph(arrow.direction), color: arrowColor(arrow.tone) };
}

export function formatRawValue(value: number | string): string {
	if (typeof value === "string") return value;
	return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function formatRangeText(band: ResolvedRange, marker: MarkerNote, unitOverride?: string): string {
	if (marker.type === "qualitative") {
		const normal = marker.normal;
		if (Array.isArray(normal)) return normal.join(" / ");
		return normal ?? "—";
	}

	const displayUnit = unitOverride ?? marker.unit;
	const unit = displayUnit ? ` ${displayUnit}` : "";
	if (band.low !== undefined && band.high !== undefined) return `${formatRawValue(band.low)} – ${formatRawValue(band.high)}${unit}`;
	if (band.high !== undefined) return `< ${formatRawValue(band.high)}${unit}`;
	if (band.low !== undefined) return `> ${formatRawValue(band.low)}${unit}`;
	return "—";
}

/** `target` overrides the number shown (e.g. already converted to a toggled alt unit) -- the
 *  ≤/≥ direction always comes from which of `optimalHigh`/`optimalLow` the marker itself defines,
 *  since that's a fact about the marker, not about which unit it's currently displayed in. */
export function formatTargetText(marker: MarkerNote, target?: number): string {
	const resolved = target ?? marker.optimalHigh ?? marker.optimalLow;
	if (resolved === undefined) return "";
	if (marker.optimalHigh !== undefined) return `your target ≤ ${formatRawValue(resolved)}`;
	if (marker.optimalLow !== undefined) return `your target ≥ ${formatRawValue(resolved)}`;
	return "";
}

export function formatYear(date: string): string {
	const year = date.slice(2, 4);
	return `’${year}`;
}

export function formatFullDate(date: string): string {
	const [year, month, day] = date.split("-").map(Number);
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

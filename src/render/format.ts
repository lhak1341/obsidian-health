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
			return "·";
	}
}

export function formatArrow(arrow: Arrow | undefined): { glyph: string; color: string } {
	if (!arrow) return { glyph: "·", color: "var(--text-faint)" };
	return { glyph: arrowGlyph(arrow.direction), color: arrowColor(arrow.tone) };
}

export function formatRawValue(value: number | string): string {
	if (typeof value === "string") return value;
	return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function formatRangeText(band: ResolvedRange, marker: MarkerNote): string {
	if (marker.type === "qualitative") {
		const normal = marker.normal;
		if (Array.isArray(normal)) return normal.join(" / ");
		return normal ?? "—";
	}

	const unit = marker.unit ? ` ${marker.unit}` : "";
	if (band.low !== undefined && band.high !== undefined) return `${formatRawValue(band.low)} – ${formatRawValue(band.high)}${unit}`;
	if (band.high !== undefined) return `< ${formatRawValue(band.high)}${unit}`;
	if (band.low !== undefined) return `> ${formatRawValue(band.low)}${unit}`;
	return "—";
}

export function formatTargetText(marker: MarkerNote): string {
	if (marker.optimalHigh !== undefined) return `your target ≤ ${formatRawValue(marker.optimalHigh)}`;
	if (marker.optimalLow !== undefined) return `your target ≥ ${formatRawValue(marker.optimalLow)}`;
	return "";
}

export function formatYear(date: string): string {
	const year = date.slice(2, 4);
	return `’${year}`;
}

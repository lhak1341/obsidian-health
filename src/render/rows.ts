import type { DashboardModel, MarkerStatusInfo } from "../core/model";
import { buildSparkline } from "./charts";
import { formatArrow, formatRawValue, statusColor } from "./format";

export interface RowEntry {
	primary: MarkerStatusInfo;
	secondary?: MarkerStatusInfo;
}

function pairEntries(markers: MarkerStatusInfo[]): RowEntry[] {
	const consumed = new Set<string>();
	const rows: RowEntry[] = [];

	for (const info of markers) {
		if (consumed.has(info.marker.id)) continue;
		consumed.add(info.marker.id);

		const partner = info.marker.pair ? markers.find((other) => other.marker.id !== info.marker.id && other.marker.pair === info.marker.pair) : undefined;

		if (partner) {
			consumed.add(partner.marker.id);
			const infoOrder = info.marker.order ?? 0;
			const partnerOrder = partner.marker.order ?? 1;
			rows.push(infoOrder <= partnerOrder ? { primary: info, secondary: partner } : { primary: partner, secondary: info });
		} else {
			rows.push({ primary: info });
		}
	}

	return rows;
}

export function indexPairs(markers: MarkerStatusInfo[]): Map<string, RowEntry> {
	const rows = pairEntries(markers);
	const index = new Map<string, RowEntry>();
	for (const row of rows) {
		index.set(row.primary.marker.id, row);
		if (row.secondary) index.set(row.secondary.marker.id, row);
	}
	return index;
}

/** Flagged markers (status !== "good"), BP-paired and deduped, in attention order. */
export function flaggedRows(model: DashboardModel): RowEntry[] {
	const rowByMarkerId = indexPairs(model.markers);
	const infoById = new Map(model.markers.map((info) => [info.marker.id, info]));
	const seen = new Set<string>();
	const flagged: RowEntry[] = [];

	for (const id of model.attentionOrder) {
		const info = infoById.get(id)!;
		if (info.status === "good") continue;
		const row = rowByMarkerId.get(id)!;
		if (seen.has(row.primary.marker.id)) continue;
		seen.add(row.primary.marker.id);
		flagged.push(row);
	}

	return flagged;
}

/** Latest reading as display text, paired (`primary/secondary`) for BP-style markers. */
export function formatRowValue(primary: MarkerStatusInfo, secondary?: MarkerStatusInfo): string {
	if (!primary.latest) return "—";
	const primaryText = formatRawValue(primary.latest.value);
	if (secondary?.latest) return `${primaryText}/${formatRawValue(secondary.latest.value)}`;
	return primaryText;
}

/** Fills a status dot, name, optional sparkline, value, and arrow into `el` — the compact row shape shared by the widget and the Bases view. */
export function fillMarkerRowContent(
	el: HTMLElement,
	primary: MarkerStatusInfo,
	secondary: MarkerStatusInfo | undefined,
	opts: { showSparkline: boolean; colorValue?: boolean },
): void {
	const dot = document.createElement("span");
	dot.className = "hlth-dot";
	dot.style.background = statusColor(primary.status);
	el.appendChild(dot);

	const name = document.createElement("span");
	name.className = "hlth-widget-row-name";
	name.textContent = primary.marker.name;
	el.appendChild(name);

	if (opts.showSparkline) el.appendChild(buildSparkline(primary.series, primary.band, statusColor(primary.status), secondary?.series));

	const value = document.createElement("span");
	value.className = "hlth-widget-row-value";
	if (opts.colorValue ?? true) value.style.color = statusColor(primary.status);
	value.textContent = formatRowValue(primary, secondary);
	el.appendChild(value);

	const arrow = formatArrow(primary.arrow);
	const arrowEl = document.createElement("span");
	arrowEl.className = "hlth-arrow";
	arrowEl.style.color = arrow.color;
	arrowEl.textContent = arrow.glyph;
	el.appendChild(arrowEl);
}

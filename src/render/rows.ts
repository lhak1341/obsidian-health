import { pairByPartner } from "../core/entry";
import type { ConcernGroup, DashboardModel, MarkerStatusInfo } from "../core/model";
import { buildSparkline } from "./charts";
import { formatArrow, formatRawValue, statusColor } from "./format";

export interface RowEntry {
	primary: MarkerStatusInfo;
	secondary?: MarkerStatusInfo;
}

function pairEntries(markers: MarkerStatusInfo[]): RowEntry[] {
	return pairByPartner(
		markers,
		(info) => info.marker.id,
		(info) => info.marker.pair,
		(info) => info.marker.order,
	);
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

/** Formats a primary value as display text, paired (`primary/secondary`) for BP-style markers.
 *  `primaryValue` is the caller's choice of source -- a marker's raw latest reading, or a
 *  unit-toggled display value -- `secondary` always reads its own raw latest reading. */
export function formatRowValue(primaryValue: number | string | undefined, secondary?: MarkerStatusInfo): string {
	if (primaryValue === undefined) return "—";
	const primaryText = formatRawValue(primaryValue);
	if (secondary?.latest) return `${primaryText}/${formatRawValue(secondary.latest.value)}`;
	return primaryText;
}

/** Row position within a group: `order:` frontmatter pins a spot, unset markers sort last (then
 *  alphabetically by name at the call site) -- vault scan order is otherwise arbitrary. */
export function rowOrder(row: RowEntry): number {
	return row.primary.marker.order ?? Number.POSITIVE_INFINITY;
}

/** A BP-style pair (primary+secondary) shares one `RowEntry` under both marker ids in
 *  `rowByMarkerId` -- dedupe on the primary id so the pair isn't collected twice. */
export function collectGroupRows(group: ConcernGroup, rowByMarkerId: Map<string, RowEntry>): RowEntry[] {
	const rendered = new Set<string>();
	const rows: RowEntry[] = [];
	for (const info of group.markers) {
		const row = rowByMarkerId.get(info.marker.id)!;
		if (rendered.has(row.primary.marker.id)) continue;
		rendered.add(row.primary.marker.id);
		rows.push(row);
	}
	return rows;
}

/** Visible (non-hidden) row count per concern in Curated view -- tier-lanes.ts's `packLanes`'
 *  weight input. */
export function countVisibleRows(sorted: ConcernGroup[], rowByMarkerId: Map<string, RowEntry>, curated: Set<string>): Map<string, number> {
	const counts = new Map<string, number>();
	for (const group of sorted) {
		const rows = collectGroupRows(group, rowByMarkerId);
		counts.set(
			group.concern,
			rows.filter((row) => curated.has(row.primary.marker.id)).length,
		);
	}
	return counts;
}

/** Builds the `hlth-arrow` span (glyph + color) shared by the widget row, the Bases row, and the dashboard's attention/table rows. */
export function buildArrowCell(primary: MarkerStatusInfo): HTMLElement {
	const arrow = formatArrow(primary.arrow);
	const arrowEl = createSpan();
	arrowEl.className = "hlth-arrow";
	arrowEl.style.color = arrow.color;
	arrowEl.textContent = arrow.glyph;
	return arrowEl;
}

/** Fills a status dot, name, optional sparkline, value, and arrow into `el` — the compact row shape shared by the widget and the Bases view. */
export function fillMarkerRowContent(
	el: HTMLElement,
	primary: MarkerStatusInfo,
	secondary: MarkerStatusInfo | undefined,
	opts: { showSparkline: boolean; colorValue?: boolean },
): void {
	const dot = createSpan();
	dot.className = "hlth-dot";
	dot.style.background = statusColor(primary.status);
	el.appendChild(dot);

	const name = createSpan();
	name.className = "hlth-widget-row-name";
	name.textContent = primary.marker.name;
	el.appendChild(name);

	if (opts.showSparkline) el.appendChild(buildSparkline(primary.series, primary.band, statusColor(primary.status), secondary?.series));

	const value = createSpan();
	value.className = "hlth-widget-row-value";
	if (opts.colorValue ?? true) value.style.color = statusColor(primary.status);
	value.textContent = formatRowValue(primary.latest?.value, secondary);
	el.appendChild(value);

	el.appendChild(buildArrowCell(primary));
}

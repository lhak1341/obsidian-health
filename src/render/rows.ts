import type { MarkerStatusInfo, Status } from "../core/model";
import { buildSparkline } from "./charts";
import { formatArrow, formatRawValue, statusColor } from "./format";

/** Formats a primary value as display text, paired (`primary/secondary`) for BP-style markers.
 *  `primaryValue` is the caller's choice of source -- a marker's raw latest reading, or a
 *  unit-toggled display value -- `secondary` always reads its own raw latest reading. */
export function formatRowValue(primaryValue: number | string | undefined, secondary?: MarkerStatusInfo): string {
	if (primaryValue === undefined) return "—";
	const primaryText = formatRawValue(primaryValue);
	if (secondary?.latest) return `${primaryText}/${formatRawValue(secondary.latest.value)}`;
	return primaryText;
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
	opts: { status: Status; showSparkline: boolean; colorValue?: boolean },
): void {
	const dot = createSpan();
	dot.className = "hlth-dot";
	dot.style.background = statusColor(opts.status);
	el.appendChild(dot);

	const name = createSpan();
	name.className = "hlth-widget-row-name";
	name.textContent = primary.marker.name;
	el.appendChild(name);

	if (opts.showSparkline) el.appendChild(buildSparkline(primary.series, primary.band, statusColor(opts.status), secondary?.series));

	const value = createSpan();
	value.className = "hlth-widget-row-value";
	if (opts.colorValue ?? true) value.style.color = statusColor(opts.status);
	value.textContent = formatRowValue(primary.latest?.value, secondary);
	el.appendChild(value);

	el.appendChild(buildArrowCell(primary));
}

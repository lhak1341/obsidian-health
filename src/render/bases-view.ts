import type { DashboardModel, MarkerStatusInfo } from "../core/model";
import { fillMarkerRowContent } from "./rows";

/** Renders a Base's filtered markers using the dashboard's own computed status/arrow/sparkline. */
export function renderBasesMarkers(container: HTMLElement, model: DashboardModel): void {
	container.textContent = "";
	container.className = "hlth-widget";

	if (model.markers.length === 0) {
		const empty = document.createElement("div");
		empty.className = "hlth-widget-empty";
		empty.textContent = "No readings yet for these markers.";
		container.appendChild(empty);
		return;
	}

	const rankIndex = new Map(model.attentionOrder.map((id, i) => [id, i]));
	const sorted = [...model.markers].sort((a, b) => (rankIndex.get(a.marker.id) ?? Number.POSITIVE_INFINITY) - (rankIndex.get(b.marker.id) ?? Number.POSITIVE_INFINITY));

	const list = document.createElement("div");
	list.className = "hlth-widget-list";
	for (const info of sorted) list.appendChild(buildRow(info));
	container.appendChild(list);
}

function buildRow(info: MarkerStatusInfo): HTMLElement {
	const el = document.createElement("div");
	el.className = "hlth-widget-row";
	fillMarkerRowContent(el, info, undefined, { showSparkline: true });
	return el;
}

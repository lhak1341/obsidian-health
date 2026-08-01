import type { MarkerNote, PlanNote } from "../core/types";
import { formatRawValue } from "./format";

export interface PlannerRenderOptions {
	backlog: MarkerNote[];
	plan?: PlanNote;
	onOpenDashboard: () => void;
	onOpenPlanNote?: (path: string) => void;
}

export function renderPlanner(root: HTMLElement, opts: PlannerRenderOptions): void {
	root.textContent = "";

	const wrap = document.createElement("div");
	wrap.className = "hlth-planner";
	root.appendChild(wrap);

	wrap.appendChild(buildHeader(opts));
	wrap.appendChild(buildPlanSection(opts));
	wrap.appendChild(buildBacklog(opts.backlog));
}

function buildHeader(opts: PlannerRenderOptions): HTMLElement {
	const top = document.createElement("div");
	top.className = "hlth-top";

	const title = document.createElement("span");
	title.className = "hlth-title";
	title.textContent = "Planner";
	top.appendChild(title);

	const back = document.createElement("button");
	back.type = "button";
	back.className = "hlth-showall-btn";
	back.textContent = "Health";
	back.addEventListener("click", () => opts.onOpenDashboard());
	top.appendChild(back);

	return top;
}

function buildPlanSection(opts: PlannerRenderOptions): HTMLElement {
	const section = document.createElement("div");
	section.className = "hlth-planner-plan";

	const label = document.createElement("span");
	label.className = "hlth-lbl";
	label.textContent = "Yearly package analysis";
	section.appendChild(label);

	if (!opts.plan) {
		const empty = document.createElement("div");
		empty.className = "hlth-planner-plan-empty";
		empty.textContent = "No plan note yet.";
		section.appendChild(empty);
		return section;
	}

	const row = document.createElement("div");
	row.className = "hlth-planner-plan-row";

	const year = document.createElement("span");
	year.className = "hlth-planner-plan-year";
	year.textContent = String(opts.plan.year);
	row.appendChild(year);

	const preview = document.createElement("span");
	preview.className = "hlth-planner-plan-preview";
	preview.textContent = previewText(opts.plan.body);
	row.appendChild(preview);

	const open = document.createElement("button");
	open.type = "button";
	open.className = "hlth-showall-btn";
	open.textContent = "Open note";
	open.addEventListener("click", () => opts.onOpenPlanNote?.(opts.plan!.path));
	row.appendChild(open);

	section.appendChild(row);
	return section;
}

function previewText(body: string): string {
	const firstLine = body.split("\n").find((line) => line.trim().length > 0) ?? "";
	return firstLine.length > 140 ? `${firstLine.slice(0, 140)}…` : firstLine;
}

function buildBacklog(backlog: MarkerNote[]): HTMLElement {
	const section = document.createElement("div");
	section.className = "hlth-planner-backlog";

	const label = document.createElement("span");
	label.className = "hlth-lbl";
	label.textContent = `Backlog${backlog.length > 0 ? ` · ${backlog.length}` : ""}`;
	section.appendChild(label);

	if (backlog.length === 0) {
		const empty = document.createElement("div");
		empty.className = "hlth-planner-plan-empty";
		empty.textContent = "No candidate tests queued.";
		section.appendChild(empty);
		return section;
	}

	const list = document.createElement("div");
	list.className = "hlth-planner-list";
	for (const marker of backlog) list.appendChild(buildBacklogRow(marker));
	section.appendChild(list);

	return section;
}

function buildBacklogRow(marker: MarkerNote): HTMLElement {
	const row = document.createElement("div");
	row.className = "hlth-planner-row";

	const name = document.createElement("span");
	name.className = "hlth-planner-name";
	name.textContent = marker.name;
	row.appendChild(name);

	const priority = document.createElement("span");
	priority.className = `hlth-planner-priority hlth-planner-priority-${marker.priority ?? "unranked"}`;
	priority.textContent = marker.priority ?? "unranked";
	row.appendChild(priority);

	const cost = document.createElement("span");
	cost.className = "hlth-planner-cost";
	cost.textContent = marker.cost !== undefined ? formatRawValue(marker.cost) : "—";
	row.appendChild(cost);

	const year = document.createElement("span");
	year.className = "hlth-planner-year";
	year.textContent = marker.yearPlanned !== undefined ? String(marker.yearPlanned) : "";
	row.appendChild(year);

	if (marker.sourceUrl) {
		const link = document.createElement("a");
		link.className = "hlth-planner-link";
		link.href = marker.sourceUrl;
		link.target = "_blank";
		link.rel = "noopener";
		link.textContent = "source";
		row.appendChild(link);
	}

	return row;
}

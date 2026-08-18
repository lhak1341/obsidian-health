import type { MarkerNote, PlanNote } from "../core/types";
import { iconFor } from "./icons";

export interface PlannerRenderOptions {
	backlog: MarkerNote[];
	plan?: PlanNote;
	onOpenDashboard: () => void;
	onOpenPlanNote?: (path: string) => void;
}

export function renderPlanner(root: HTMLElement, opts: PlannerRenderOptions): void {
	root.textContent = "";

	const wrap = createDiv();
	wrap.className = "hlth-planner";
	root.appendChild(wrap);

	wrap.appendChild(buildHeader(opts));
	wrap.appendChild(buildPlanSection(opts));
	wrap.appendChild(buildBacklog(opts.backlog));
}

function buildHeader(opts: PlannerRenderOptions): HTMLElement {
	const top = createDiv();
	top.className = "hlth-top";

	const left = createDiv();
	left.className = "hlth-top-left";
	top.appendChild(left);

	const back = createEl("button");
	back.type = "button";
	back.className = "hlth-showall-btn";
	back.appendChild(iconFor("arrow-left"));
	back.appendChild(document.createTextNode("Health"));
	back.addEventListener("click", () => opts.onOpenDashboard());
	left.appendChild(back);

	const title = createSpan();
	title.className = "hlth-title";
	title.textContent = "Planner";
	left.appendChild(title);

	return top;
}

function buildPlanSection(opts: PlannerRenderOptions): HTMLElement {
	const section = createDiv();
	section.className = "hlth-planner-plan";

	const label = createSpan();
	label.className = "hlth-lbl";
	label.textContent = "Yearly package analysis";
	section.appendChild(label);

	if (!opts.plan) {
		const empty = createDiv();
		empty.className = "hlth-planner-plan-empty";
		empty.textContent = "No plan note yet.";
		section.appendChild(empty);
		return section;
	}

	const row = createDiv();
	row.className = "hlth-planner-plan-row";

	const year = createSpan();
	year.className = "hlth-planner-plan-year";
	year.textContent = String(opts.plan.year);
	row.appendChild(year);

	const preview = createSpan();
	preview.className = "hlth-planner-plan-preview";
	preview.textContent = previewText(opts.plan.body);
	row.appendChild(preview);

	const open = createEl("button");
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
	// Strips a leading markdown heading marker ("## Executive summary" -> "Executive summary") --
	// this is a plain-text preview, not a rendered one, so the raw "#"s would otherwise leak through.
	const stripped = firstLine.replace(/^#+\s*/, "");
	return stripped.length > 140 ? `${stripped.slice(0, 140)}…` : stripped;
}

function buildBacklog(backlog: MarkerNote[]): HTMLElement {
	const section = createDiv();
	section.className = "hlth-planner-backlog";

	const label = createSpan();
	label.className = "hlth-lbl";
	label.textContent = `Backlog${backlog.length > 0 ? ` · ${backlog.length}` : ""}`;
	section.appendChild(label);

	if (backlog.length === 0) {
		const empty = createDiv();
		empty.className = "hlth-planner-plan-empty";
		empty.textContent = "No candidate tests queued.";
		section.appendChild(empty);
		return section;
	}

	const list = createDiv();
	list.className = "hlth-planner-list";
	for (const marker of backlog) list.appendChild(buildBacklogRow(marker));
	section.appendChild(list);

	return section;
}

function buildBacklogRow(marker: MarkerNote): HTMLElement {
	const row = createDiv();
	row.className = "hlth-planner-row";

	const name = createSpan();
	name.className = "hlth-planner-name";
	name.textContent = marker.name;
	row.appendChild(name);

	const priority = createSpan();
	priority.className = `hlth-planner-priority hlth-planner-priority-${marker.priority ?? "unranked"}`;
	priority.textContent = marker.priority ?? "unranked";
	row.appendChild(priority);

	const cost = createSpan();
	cost.className = "hlth-planner-cost";
	cost.textContent = marker.cost !== undefined ? marker.cost.toLocaleString("en-US") : "—";
	row.appendChild(cost);

	const year = createSpan();
	year.className = "hlth-planner-year";
	year.textContent = marker.yearPlanned !== undefined ? String(marker.yearPlanned) : "";
	row.appendChild(year);

	if (marker.sourceUrl) {
		const link = createEl("a");
		link.className = "hlth-planner-link";
		link.href = marker.sourceUrl;
		link.target = "_blank";
		link.rel = "noopener";
		link.textContent = "Source";
		row.appendChild(link);
	}

	return row;
}

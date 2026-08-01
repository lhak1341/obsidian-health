import type { MarkerNote, PlanNote, Priority, VisitNote } from "./types";

const PRIORITY_RANK: Record<Priority, number> = { essential: 0, lifestyle: 1, secondary: 2 };
const UNRANKED = Object.keys(PRIORITY_RANK).length;

function priorityRank(priority: Priority | undefined): number {
	return priority === undefined ? UNRANKED : PRIORITY_RANK[priority];
}

/** Candidate markers (`status: candidate`) with zero readings across any visit, sorted priority then cost. */
export function computePlannerBacklog(markers: MarkerNote[], visits: VisitNote[]): MarkerNote[] {
	const measured = new Set<string>();
	for (const visit of visits) {
		for (const markerId of Object.keys(visit.values)) measured.add(markerId);
	}

	return markers
		.filter((marker) => marker.status === "candidate" && !measured.has(marker.id))
		.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.cost ?? Infinity) - (b.cost ?? Infinity));
}

/** The most recent yearly package-analysis plan note for a person, if any. */
export function latestPlanNote(plans: PlanNote[], person: string): PlanNote | undefined {
	return plans.filter((plan) => plan.person === person).sort((a, b) => b.year - a.year)[0];
}

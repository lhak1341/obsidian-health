/** Static per-concern editorial config: default icon + dashboard column. Obsidian-free --
 *  the one inventory both `icons.ts` (icon lookup) and `dashboard-view.ts` (column layout) read,
 *  instead of each keeping its own independent, silently-drifting list of known concerns.
 *
 *  Column placement is a deliberately-stable pin, not derived data: vitals/cardiometabolic/
 *  cancer/immunity always read left, cbc/blood always read center, everything else always reads
 *  right. Unregistered concerns fall through to the default (right column, "activity" icon) via
 *  the accessors below -- ships usable for a brand-new concern before anyone updates this file. */
export interface ConcernConfig {
	icon: string;
	column: 0 | 1 | 2;
}

const DEFAULT_ICON = "activity";
const DEFAULT_COLUMN: 0 | 1 | 2 = 2;

export const CONCERN_CONFIG: Record<string, ConcernConfig> = {
	vitals: { icon: "heart-pulse", column: 0 },
	cardiometabolic: { icon: "activity", column: 0 },
	cancer: { icon: "shield", column: 0 },
	immunity: { icon: "shield", column: 0 },
	cbc: { icon: "droplets", column: 1 },
	blood: { icon: "droplets", column: 1 },
	"blood count": { icon: "droplets", column: 1 },
	urine: { icon: "flask-conical", column: 2 },
	metabolic: { icon: "activity", column: 2 },
	kidney: { icon: "droplet", column: 2 },
	liver: { icon: "flask-conical", column: 2 },
};

export function iconNameForConcern(concern: string): string {
	return CONCERN_CONFIG[concern.toLowerCase()]?.icon ?? DEFAULT_ICON;
}

export function columnForConcern(concern: string): 0 | 1 | 2 {
	return CONCERN_CONFIG[concern.toLowerCase()]?.column ?? DEFAULT_COLUMN;
}

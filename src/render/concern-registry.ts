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
	/** Canonical display text -- overrides whatever casing a marker's frontmatter happens to use. */
	label: string;
}

const DEFAULT_ICON = "activity";
const DEFAULT_COLUMN: 0 | 1 | 2 = 2;

/** Keyed by normalizeConcernKey's output (core/dashboard.ts) -- every accessor here expects an
 *  already-normalized key, not raw frontmatter text. */
export const CONCERN_CONFIG: Record<string, ConcernConfig> = {
	vitals: { icon: "heart-pulse", column: 0, label: "Vitals" },
	cardiometabolic: { icon: "activity", column: 0, label: "Cardiometabolic" },
	cancer: { icon: "shield", column: 0, label: "Cancer" },
	immunity: { icon: "shield", column: 0, label: "Immunity" },
	cbc: { icon: "droplets", column: 1, label: "CBC" },
	blood: { icon: "droplets", column: 1, label: "Blood" },
	"blood count": { icon: "droplets", column: 1, label: "Blood Count" },
	urine: { icon: "flask-conical", column: 2, label: "Urine" },
	metabolic: { icon: "activity", column: 2, label: "Metabolic" },
	kidney: { icon: "droplet", column: 2, label: "Kidney" },
	liver: { icon: "flask-conical", column: 2, label: "Liver" },
};

export function iconNameForConcern(key: string): string {
	return CONCERN_CONFIG[key]?.icon ?? DEFAULT_ICON;
}

export function columnForConcern(key: string): 0 | 1 | 2 {
	return CONCERN_CONFIG[key]?.column ?? DEFAULT_COLUMN;
}

/** Canonical display text for a normalized concern key -- the registry's authored label for known
 *  concerns, else the key itself (already lowercase; unregistered concerns show lowercase until
 *  they're added here or renamed). */
export function labelForConcern(key: string): string {
	return CONCERN_CONFIG[key]?.label ?? key;
}

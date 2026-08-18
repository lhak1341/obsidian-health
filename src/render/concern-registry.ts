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
	/** Fixed position within column 0's lane (vitals/cardiometabolic/cancer/immunity always read in
	 *  this sequence, not attention-rank -- see tier-lanes.ts's resolveLane). Unused on columns 1/2,
	 *  which stay attention-rank ordered. Missing on a column-0 entry means "renders, just sorted last". */
	order?: number;
	/** Medium tier only: which of column 0's two MEDIUM_LANES halves this concern joins (see
	 *  tier-lanes.ts's MEDIUM_LANES) -- 0 joins the Kidney/Liver lane, 1 joins the Blood/CBC lane.
	 *  Unused outside column 0 and outside the medium tier. */
	mediumLaneGroup?: 0 | 1;
}

const DEFAULT_ICON = "activity";
const DEFAULT_COLUMN: 0 | 1 | 2 = 2;
const DEFAULT_ORDER = Number.POSITIVE_INFINITY;

/** Keyed by normalizeConcernKey's output (core/dashboard.ts) -- every accessor here expects an
 *  already-normalized key, not raw frontmatter text. */
export const CONCERN_CONFIG: Record<string, ConcernConfig> = {
	vitals: { icon: "heart-pulse", column: 0, label: "Vitals", order: 0, mediumLaneGroup: 0 },
	cardiometabolic: { icon: "activity", column: 0, label: "Cardiometabolic", order: 1, mediumLaneGroup: 0 },
	cancer: { icon: "shield", column: 0, label: "Cancer", order: 2, mediumLaneGroup: 1 },
	immunity: { icon: "shield", column: 0, label: "Immunity", order: 3, mediumLaneGroup: 1 },
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

/** Column-0's fixed lane position for a concern; unset (or a non-column-0 concern) sorts last. */
export function orderForConcern(key: string): number {
	return CONCERN_CONFIG[key]?.order ?? DEFAULT_ORDER;
}

/** Medium tier's MEDIUM_LANES half for a column-0 concern; undefined for anything unregistered or
 *  outside column 0 -- callers filtering by group should treat undefined as "no match". */
export function mediumLaneGroupForConcern(key: string): 0 | 1 | undefined {
	return CONCERN_CONFIG[key]?.mediumLaneGroup;
}

/** Canonical display text for a normalized concern key -- the registry's authored label for known
 *  concerns, else the key itself (already lowercase; unregistered concerns show lowercase until
 *  they're added here or renamed). */
export function labelForConcern(key: string): string {
	return CONCERN_CONFIG[key]?.label ?? key;
}

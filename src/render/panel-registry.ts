/** Static per-panel editorial config: which column of the visit-entry form a panel's card lands in,
 *  and its order within that column. Obsidian-free -- a deliberate layout choice, not derived data
 *  (same spirit as concern-registry.ts's column pin for the dashboard, but keyed by panel, panel and
 *  concern being intentionally separate axes per CLAUDE.md -- kept in its own file rather than folded
 *  into concern-registry.ts so the two axes' inventories don't collapse into one). Unregistered
 *  panels fall through to the default (right column, ordered after every pinned entry there). */
export interface PanelConfig {
	column: 0 | 1 | 2;
	order: number;
}

const DEFAULT_COLUMN: 0 | 1 | 2 = 2;
const DEFAULT_ORDER = Number.POSITIVE_INFINITY;

/** Keyed by lowercased panel text -- every accessor here expects an already-lowercased key. */
export const PANEL_LAYOUT: Record<string, PanelConfig> = {
	vitals: { column: 0, order: 0 },
	biochemical: { column: 0, order: 1 },
	blood: { column: 1, order: 0 },
	urine: { column: 2, order: 0 },
	antigen: { column: 2, order: 1 },
	gyn: { column: 2, order: 2 },
};

export function columnForPanel(panel: string): 0 | 1 | 2 {
	return PANEL_LAYOUT[panel.toLowerCase()]?.column ?? DEFAULT_COLUMN;
}

export function orderForPanel(panel: string): number {
	return PANEL_LAYOUT[panel.toLowerCase()]?.order ?? DEFAULT_ORDER;
}

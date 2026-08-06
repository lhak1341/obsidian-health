import { getIcon } from "obsidian";
import { iconNameForConcern } from "./concern-registry";

/** Obsidian's bundled Lucide set (`getIcon` from "obsidian") -- keeps stroke weight/theming consistent with the rest of the app's chrome instead of hand-copied SVG paths. */
export function iconFor(name: string): SVGSVGElement {
	const svg = getIcon(name) ?? getIcon("activity");
	if (!svg) return createSvg("svg");
	svg.classList.add("hlth-ic");
	return svg;
}

/** `key` must already be a normalized concern key (dashboard.ts's normalizeConcernKey) --
 *  `overrides` is keyed the same way, so this is a plain exact lookup. */
export function iconForConcern(key: string, overrides: Record<string, string> = {}): SVGSVGElement {
	return iconFor(overrides[key] ?? iconNameForConcern(key));
}

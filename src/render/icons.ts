import { getIcon } from "obsidian";
import { iconNameForConcern } from "./concern-registry";

/** Obsidian's bundled Lucide set (`getIcon` from "obsidian") -- keeps stroke weight/theming consistent with the rest of the app's chrome instead of hand-copied SVG paths. */
export function iconFor(name: string): SVGSVGElement {
	const svg = getIcon(name) ?? getIcon("activity");
	if (!svg) return document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.classList.add("hlth-ic");
	return svg;
}

export function iconForConcern(concern: string, overrides: Record<string, string> = {}): SVGSVGElement {
	const key = concern.toLowerCase();
	return iconFor(overrides[concern] ?? overrides[key] ?? iconNameForConcern(concern));
}

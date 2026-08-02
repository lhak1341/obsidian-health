import { getIcon } from "obsidian";

const CONCERN_ICON: Record<string, string> = {
	cbc: "droplets",
	blood: "droplets",
	urine: "flask-conical",
	metabolic: "activity",
	cardiometabolic: "activity",
	cancer: "shield",
	immunity: "shield",
	kidney: "droplet",
	liver: "flask-conical",
	vitals: "heart-pulse",
};

/** Obsidian's bundled Lucide set (`getIcon` from "obsidian") -- keeps stroke weight/theming consistent with the rest of the app's chrome instead of hand-copied SVG paths. */
export function iconFor(name: string): SVGSVGElement {
	const svg = getIcon(name) ?? getIcon("activity");
	if (!svg) return document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.classList.add("hlth-ic");
	return svg;
}

export function iconForConcern(concern: string, overrides: Record<string, string> = {}): SVGSVGElement {
	const key = concern.toLowerCase();
	return iconFor(overrides[concern] ?? overrides[key] ?? CONCERN_ICON[key] ?? "activity");
}

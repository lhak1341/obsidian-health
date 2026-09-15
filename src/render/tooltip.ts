import { renderInlineMarkdown } from "./rich-text";

// Obsidian's own workspace chrome applies a CSS transform up the tree (pane/tab transitions),
// which breaks naive `position: fixed` math for anything nested inside it -- and `.hlth-dash`'s
// `overflow-y: auto` clips a same-container absolutely-positioned tooltip for rows near the top.
// A single tooltip appended directly to `document.body` sidesteps both: no transformed ancestor,
// no clipping container.
let sharedTooltip: HTMLElement | undefined;

// The tooltip is appended to document.body (see above), outside the `.health-*-outer` scope
// that declares --hlth-fh/fb/fm -- it has no ancestor carrying those tokens, so its font
// choice is pushed in from main.ts's applyFonts() instead of being inherited.
let headingFontVar: string | null = null;

function applyFontVarTo(el: HTMLElement): void {
	if (headingFontVar) el.style.setProperty("--hlth-fh", headingFontVar);
	else                el.style.removeProperty("--hlth-fh");
}

/** Called from main.ts whenever the Heading font setting changes (and once at load) --
 *  updates the already-created tooltip, if any, and the value future ones are created with. */
export function applyTooltipFonts(fh: string | null): void {
	headingFontVar = fh;
	if (sharedTooltip) applyFontVarTo(sharedTooltip);
}

function getSharedTooltip(): HTMLElement {
	if (sharedTooltip?.isConnected) return sharedTooltip;
	const tip = createDiv();
	tip.className = "hlth-tip";
	const meaning = createSpan();
	meaning.className = "hlth-tip-meaning";
	const range = createSpan();
	range.className = "hlth-tip-range";
	tip.append(meaning, range);
	applyFontVarTo(tip);
	document.body.appendChild(tip);
	sharedTooltip = tip;
	return tip;
}

export function showTooltip(anchor: HTMLElement, meaning: string, rangeText: string): void {
	const tip = getSharedTooltip();
	renderInlineMarkdown(tip.querySelector(".hlth-tip-meaning")!, meaning);
	tip.querySelector(".hlth-tip-range")!.textContent = rangeText;
	tip.classList.add("hlth-open");

	const anchorRect = anchor.getBoundingClientRect();
	const tipHeight = tip.offsetHeight;
	const tipWidth = tip.offsetWidth;
	const opensUp = anchorRect.top - tipHeight - 8 > 0;
	tip.style.top = opensUp ? `${anchorRect.top - tipHeight - 8}px` : `${anchorRect.bottom + 8}px`;
	tip.style.left = `${Math.min(Math.max(anchorRect.left, 8), window.innerWidth - tipWidth - 8)}px`;
}

export function hideTooltip(): void {
	sharedTooltip?.classList.remove("hlth-open");
}

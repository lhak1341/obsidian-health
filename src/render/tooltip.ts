// Obsidian's own workspace chrome applies a CSS transform up the tree (pane/tab transitions),
// which breaks naive `position: fixed` math for anything nested inside it -- and `.hlth-dash`'s
// `overflow-y: auto` clips a same-container absolutely-positioned tooltip for rows near the top.
// A single tooltip appended directly to `document.body` sidesteps both: no transformed ancestor,
// no clipping container.
let sharedTooltip: HTMLElement | undefined;

function getSharedTooltip(): HTMLElement {
	if (sharedTooltip?.isConnected) return sharedTooltip;
	const tip = document.createElement("div");
	tip.className = "hlth-tip";
	const meaning = document.createElement("span");
	meaning.className = "hlth-tip-meaning";
	const range = document.createElement("span");
	range.className = "hlth-tip-range";
	tip.append(meaning, range);
	document.body.appendChild(tip);
	sharedTooltip = tip;
	return tip;
}

export function showTooltip(anchor: HTMLElement, meaning: string, rangeText: string): void {
	const tip = getSharedTooltip();
	tip.querySelector(".hlth-tip-meaning")!.textContent = meaning;
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

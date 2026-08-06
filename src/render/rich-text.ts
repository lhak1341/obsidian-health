/** Renders `**bold**`, `_italic_`, and `` `code` `` spans from marker blurb text into `el` --
 *  deliberately not full Markdown (no links, lists, headings): blurbs are one clinical sentence or
 *  two, and a real Markdown parser would be overkill for three inline styles. Builds DOM nodes
 *  directly (never innerHTML), so arbitrary blurb text can't inject markup. Plain DOM APIs, not
 *  Obsidian's `createEl`/`empty` helpers, to match the surrounding dashboard-view.ts/tooltip.ts
 *  call sites. */
export function renderInlineMarkdown(el: HTMLElement, text: string): void {
	el.replaceChildren();
	const tokens = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);

	for (const token of tokens) {
		if (!token) continue;

		if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
			const strong = createEl("strong");
			strong.textContent = token.slice(2, -2);
			el.appendChild(strong);
		} else if (token.startsWith("_") && token.endsWith("_") && token.length > 2) {
			const em = createEl("em");
			em.textContent = token.slice(1, -1);
			el.appendChild(em);
		} else if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
			const code = createEl("code");
			code.textContent = token.slice(1, -1);
			el.appendChild(code);
		} else {
			el.appendChild(document.createTextNode(token));
		}
	}
}

// A Lucide icon picker on Obsidian's suggest API (kit issue 16), merged from
// LCAL's `IconSuggest.ts` (ranking with Lucide's search tags) and HLTH's
// `icon-suggest.ts` (Obsidian's own registry, bare names).
import { AbstractInputSuggest, getIconIds, setIcon } from 'obsidian';
const LUCIDE = 'lucide-';
const bare = (id) => (id.startsWith(LUCIDE) ? id.slice(LUCIDE.length) : id);
/**
 * Ranks icon names against a query: name matches first (earliest match, then
 * alphabetical), then names matched only by a search tag ("chem" finds
 * "flask-conical" by its "chemistry" tag), alphabetical. An empty query lists all.
 */
export function rankIconSuggestions(query, names, tags = () => []) {
    const q = query.trim().toLowerCase();
    if (!q)
        return [...names];
    const byName = names
        .map((name) => ({ name, at: name.toLowerCase().indexOf(q) }))
        .filter((m) => m.at !== -1)
        .sort((a, b) => a.at - b.at || a.name.localeCompare(b.name))
        .map((m) => m.name);
    const named = new Set(byName);
    const byTag = names
        .filter((name) => !named.has(name) && tags(name).some((t) => t.toLowerCase().includes(q)))
        .sort((a, b) => a.localeCompare(b));
    return [...byName, ...byTag];
}
/**
 * Autocomplete for an icon field. Choosing writes the bare name into the input
 * and fires `input`, so the field's own `Setting` `onChange` saves it.
 */
export class IconSuggest extends AbstractInputSuggest {
    field;
    opts;
    /** Obsidian's registry as of the last query, so rendering a long list scans it once. */
    registered = new Set();
    constructor(app, inputEl, opts = {}) {
        super(app, inputEl);
        this.field = inputEl;
        this.opts = opts;
    }
    getSuggestions(query) {
        this.registered = new Set(getIconIds());
        const names = this.opts.names?.() ?? [...new Set([...this.registered].map(bare))];
        return rankIconSuggestions(query, names, this.opts.tags);
    }
    renderSuggestion(name, el) {
        el.classList.add('lk-icon-suggest-item');
        const icon = el.appendChild(document.createElement('span'));
        icon.className = 'lk-icon-suggest-icon';
        setIcon(icon, this.iconId(name));
        el.appendChild(document.createElement('span')).textContent = name;
    }
    selectSuggestion(name, _evt) {
        this.setValue(name);
        this.field.dispatchEvent(new Event('input', { bubbles: true }));
        this.close();
    }
    iconId(name) {
        if (this.opts.iconId)
            return this.opts.iconId(name);
        return this.registered.has(LUCIDE + name) ? LUCIDE + name : name;
    }
}

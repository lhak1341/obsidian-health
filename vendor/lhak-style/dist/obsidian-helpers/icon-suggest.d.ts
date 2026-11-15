import { AbstractInputSuggest, type App } from 'obsidian';
/**
 * Ranks icon names against a query: name matches first (earliest match, then
 * alphabetical), then names matched only by a search tag ("chem" finds
 * "flask-conical" by its "chemistry" tag), alphabetical. An empty query lists all.
 */
export declare function rankIconSuggestions(query: string, names: readonly string[], tags?: (name: string) => readonly string[]): string[];
export interface IconSuggestOptions {
    /** Every name to offer. Default: Obsidian's registered icons, Lucide ones by bare name. */
    names?: () => readonly string[];
    /** Search synonyms per name (lucide-static's tags). Default: none. */
    tags?: (name: string) => readonly string[];
    /** The id `setIcon` draws a name with. Default: `lucide-<name>` when registered, else the name. */
    iconId?: (name: string) => string;
}
/**
 * Autocomplete for an icon field. Choosing writes the bare name into the input
 * and fires `input`, so the field's own `Setting` `onChange` saves it.
 */
export declare class IconSuggest extends AbstractInputSuggest<string> {
    private readonly field;
    private readonly opts;
    /** Obsidian's registry as of the last query, so rendering a long list scans it once. */
    private registered;
    constructor(app: App, inputEl: HTMLInputElement, opts?: IconSuggestOptions);
    protected getSuggestions(query: string): string[];
    renderSuggestion(name: string, el: HTMLElement): void;
    selectSuggestion(name: string, _evt?: MouseEvent | KeyboardEvent): void;
    private iconId;
}

export declare const FONT_ROLES: readonly ["heading", "body", "mono"];
export type FontRole = (typeof FONT_ROLES)[number];
/**
 * Each plugin role onto the contract font role it sets (user decision, kit
 * issue 16), and the Obsidian font `obsidian.css` gives it by default. So kit
 * patterns in a plugin (`.lk-button` reads `--lk-font-label`) follow the setting.
 */
export declare const FONT_ROLE_VARIABLES: Record<FontRole, {
    variable: `--lk-font-${string}`;
    obsidian: `--font-${string}`;
}>;
export type FontSource = 'default' | 'obsidian-interface' | 'obsidian-text' | 'obsidian-monospace' | 'custom';
/** The dropdown's options, in order. A plugin may relabel `default` (`'Task default (theme fonts)'`). */
export declare function fontSourceOptions(defaultLabel?: string): Record<FontSource, string>;
/** The saved keys, flat, as all six plugins already store them. */
export interface FontRoleSettings {
    fontHeading: FontSource;
    fontHeadingCustom: string;
    fontBody: FontSource;
    fontBodyCustom: string;
    fontMono: FontSource;
    fontMonoCustom: string;
}
type SourceKey = 'fontHeading' | 'fontBody' | 'fontMono';
type CustomKey = `${SourceKey}Custom`;
export declare const FONT_ROLE_KEYS: Record<FontRole, {
    source: SourceKey;
    custom: CustomKey;
}>;
export declare const DEFAULT_FONT_ROLE_SETTINGS: Readonly<FontRoleSettings>;
/**
 * Reads the font keys of a plugin's saved data. Anything unknown reads as
 * `default`, which also carries over each plugin's old default key (TASK's
 * `'task'`), since that key meant the same thing.
 */
export declare function parseFontRoleSettings(saved: unknown): FontRoleSettings;
/** The CSS value a role takes, or null to leave the alias layer's default. */
export declare function resolveFontSource(choice: FontSource, custom: string): string | null;
/**
 * Sets each role inline on a view root (the element carrying `lk-root`: a
 * view's `contentEl`, a modal's `modalEl`). Inline style on that element beats
 * the alias layer's `.lk-root` rule, so the default only removes the property.
 * Call it on every open root when the setting changes, and on each root as it opens.
 */
export declare function applyFontRoles(el: HTMLElement, settings: FontRoleSettings): void;
export {};

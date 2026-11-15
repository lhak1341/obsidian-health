// The font-role setting the plugins repeated (wayfinder 003, 015; kit issue 16):
// heading, body and mono each follow the theme, take one of Obsidian's fonts
// or a custom family. Pure data and DOM, no `obsidian` import: the alias
// layer generator (src/tokens/css.ts) reads the role table from here, and
// plugins import it as `@lhak/style/obsidian-helpers/font-roles` from code
// their tests load, where `obsidian` has no runtime module.
export const FONT_ROLES = ['heading', 'body', 'mono'];
/**
 * Each plugin role onto the contract font role it sets (user decision, kit
 * issue 16), and the Obsidian font `obsidian.css` gives it by default. So kit
 * patterns in a plugin (`.lk-button` reads `--lk-font-label`) follow the setting.
 */
export const FONT_ROLE_VARIABLES = {
    heading: { variable: '--lk-font-label', obsidian: '--font-interface' },
    body: { variable: '--lk-font-interface', obsidian: '--font-text' },
    mono: { variable: '--lk-font-code', obsidian: '--font-monospace' },
};
/** The dropdown's options, in order. A plugin may relabel `default` (`'Task default (theme fonts)'`). */
export function fontSourceOptions(defaultLabel = 'Default (theme fonts)') {
    return {
        default: defaultLabel,
        'obsidian-interface': 'Obsidian: Interface font',
        'obsidian-text': 'Obsidian: Text font',
        'obsidian-monospace': 'Obsidian: Monospace font',
        custom: 'Custom…',
    };
}
export const FONT_ROLE_KEYS = {
    heading: { source: 'fontHeading', custom: 'fontHeadingCustom' },
    body: { source: 'fontBody', custom: 'fontBodyCustom' },
    mono: { source: 'fontMono', custom: 'fontMonoCustom' },
};
export const DEFAULT_FONT_ROLE_SETTINGS = {
    fontHeading: 'default',
    fontHeadingCustom: '',
    fontBody: 'default',
    fontBodyCustom: '',
    fontMono: 'default',
    fontMonoCustom: '',
};
const SOURCES = Object.keys(fontSourceOptions());
function source(value) {
    return SOURCES.find((s) => s === value) ?? 'default';
}
/**
 * Reads the font keys of a plugin's saved data. Anything unknown reads as
 * `default`, which also carries over each plugin's old default key (TASK's
 * `'task'`), since that key meant the same thing.
 */
export function parseFontRoleSettings(saved) {
    const data = (typeof saved === 'object' && saved !== null ? saved : {});
    const text = (v) => (typeof v === 'string' ? v : '');
    return {
        fontHeading: source(data.fontHeading),
        fontHeadingCustom: text(data.fontHeadingCustom),
        fontBody: source(data.fontBody),
        fontBodyCustom: text(data.fontBodyCustom),
        fontMono: source(data.fontMono),
        fontMonoCustom: text(data.fontMonoCustom),
    };
}
/** The CSS value a role takes, or null to leave the alias layer's default. */
export function resolveFontSource(choice, custom) {
    switch (choice) {
        case 'default':
            return null;
        case 'custom':
            return custom || null;
        default:
            return `var(--font-${choice.slice('obsidian-'.length)})`;
    }
}
/**
 * Sets each role inline on a view root (the element carrying `lk-root`: a
 * view's `contentEl`, a modal's `modalEl`). Inline style on that element beats
 * the alias layer's `.lk-root` rule, so the default only removes the property.
 * Call it on every open root when the setting changes, and on each root as it opens.
 */
export function applyFontRoles(el, settings) {
    for (const role of FONT_ROLES) {
        const keys = FONT_ROLE_KEYS[role];
        const value = resolveFontSource(settings[keys.source], settings[keys.custom]);
        const { variable } = FONT_ROLE_VARIABLES[role];
        if (value)
            el.style.setProperty(variable, value);
        else
            el.style.removeProperty(variable);
    }
}

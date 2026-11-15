import { jsx as _jsx } from "react/jsx-runtime";
// The theme provider (SPEC user story 48): sets `data-flavor` and `data-mode`
// on <html>, which tokens.css keys every flavor × mode on.
import { createContext, useContext, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
/** The flavors tokens.css defines (src/tokens/contract.ts FLAVORS). */
export const FLAVORS = ['capri', 'primary'];
/** What the user picks: a fixed mode, or follow the system appearance. */
export const MODE_CHOICES = ['system', 'light', 'dark'];
export const DEFAULT_THEME = { flavor: 'capri', mode: 'system' };
const DARK_QUERY = '(prefers-color-scheme: dark)';
function subscribeToSystem(onChange) {
    if (typeof matchMedia !== 'function')
        return () => { };
    const query = matchMedia(DARK_QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
}
const systemIsDark = () => typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches;
/** The localStorage key the choice is remembered under. */
export const THEME_STORAGE_KEY = 'lk-theme';
const isTheme = (v) => FLAVORS.includes(v?.flavor) &&
    MODE_CHOICES.includes(v?.mode);
/** The remembered choice, or null when there is none, it is unreadable, or storage is blocked. */
function loadTheme(key) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw === null ? null : JSON.parse(raw);
        return isTheme(parsed) ? { flavor: parsed.flavor, mode: parsed.mode } : null;
    }
    catch {
        return null;
    }
}
function saveTheme(key, theme) {
    try {
        localStorage.setItem(key, JSON.stringify(theme));
    }
    catch {
        // Blocked or full storage: the choice still applies, it just is not remembered.
    }
}
const ThemeContext = createContext(null);
export function ThemeProvider({ children, defaultTheme = DEFAULT_THEME, storageKey = THEME_STORAGE_KEY }) {
    const [theme, setTheme] = useState(() => loadTheme(storageKey) ?? defaultTheme);
    const dark = useSyncExternalStore(subscribeToSystem, systemIsDark, () => false);
    const resolvedMode = theme.mode === 'system' ? (dark ? 'dark' : 'light') : theme.mode;
    useLayoutEffect(() => {
        const html = document.documentElement;
        html.setAttribute('data-flavor', theme.flavor);
        html.setAttribute('data-mode', resolvedMode);
    }, [theme.flavor, resolvedMode]);
    const value = useMemo(() => {
        // Saved only when the user picks, so an untouched app keeps following `defaultTheme`.
        const pick = (next) => {
            setTheme(next);
            saveTheme(storageKey, next);
        };
        return {
            ...theme,
            resolvedMode,
            setFlavor: (flavor) => pick({ ...theme, flavor }),
            setMode: (mode) => pick({ ...theme, mode }),
        };
    }, [theme, resolvedMode, storageKey]);
    // `.Provider`, not `<ThemeContext value>`: the peer range includes React 18.
    return _jsx(ThemeContext.Provider, { value: value, children: children });
}
/** The current theme and its setters. Throws outside a ThemeProvider. */
export function useTheme() {
    const state = useContext(ThemeContext);
    if (!state)
        throw new Error('useTheme must be used inside <ThemeProvider>');
    return state;
}

import { type ReactNode } from 'react';
/** The flavors tokens.css defines (src/tokens/contract.ts FLAVORS). */
export declare const FLAVORS: readonly ["capri", "primary"];
export type Flavor = (typeof FLAVORS)[number];
/** What the user picks: a fixed mode, or follow the system appearance. */
export declare const MODE_CHOICES: readonly ["system", "light", "dark"];
export type ModeChoice = (typeof MODE_CHOICES)[number];
/** The mode in effect once "system" is resolved. */
export type Mode = 'light' | 'dark';
export type Theme = {
    flavor: Flavor;
    mode: ModeChoice;
};
export type ThemeState = Theme & {
    /** The mode tokens.css is showing: `mode`, or the system's when `mode` is "system". */
    resolvedMode: Mode;
    setFlavor: (flavor: Flavor) => void;
    setMode: (mode: ModeChoice) => void;
};
export declare const DEFAULT_THEME: Theme;
/** The localStorage key the choice is remembered under. */
export declare const THEME_STORAGE_KEY = "lk-theme";
export type ThemeProviderProps = {
    children?: ReactNode;
    /** The theme before the user picks one. */
    defaultTheme?: Theme;
    /** Where the choice is remembered (localStorage). */
    storageKey?: string;
};
export declare function ThemeProvider({ children, defaultTheme, storageKey }: ThemeProviderProps): import("react").JSX.Element;
/** The current theme and its setters. Throws outside a ThemeProvider. */
export declare function useTheme(): ThemeState;

import type { ReactNode } from 'react';
export type ThemeSwitchProps = {
    /** Visible label of the flavor control. */
    flavorLabel?: ReactNode;
    /** Visible label of the mode control. */
    modeLabel?: ReactNode;
    className?: string;
};
/** Must sit inside a ThemeProvider (KitRoot carries one). */
export declare function ThemeSwitch({ flavorLabel, modeLabel, className }: ThemeSwitchProps): import("react").JSX.Element;

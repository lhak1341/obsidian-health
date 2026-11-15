export declare const FLAVORS: readonly ["capri", "primary"];
export type Flavor = (typeof FLAVORS)[number];
export declare const MODES: readonly ["light", "dark"];
export type Mode = (typeof MODES)[number];
/** Obsidian's 12 neutral step names. */
export declare const BASE_STEPS: readonly ["00", "05", "10", "20", "25", "30", "35", "40", "50", "60", "70", "100"];
export type BaseStep = (typeof BASE_STEPS)[number];
/** The 8 hues, in chart series order (ticket 013): red comes last. */
export declare const HUES: readonly ["blue", "orange", "green", "purple", "cyan", "pink", "yellow", "red"];
export type Hue = (typeof HUES)[number];
export declare const STATUSES: readonly ["success", "warning", "danger", "info"];
export type Status = (typeof STATUSES)[number];
/** Roles that get a `-soft` tint derived with one recipe. */
export declare const SOFT_TINTED: readonly ["accent", "success", "warning", "danger", "info", "blue", "orange", "green", "purple", "cyan", "pink", "yellow", "red"];
export type SoftTinted = (typeof SOFT_TINTED)[number];
export declare const HEADINGS: readonly ["heading-1", "heading-2", "heading-3", "heading-4", "heading-5", "heading-6"];
/** Roles every flavor × mode defines: colour, shadow, the overlay scrim and the dot (ticket 006 table, 013, 014; kit issue 11). */
export declare const ROLES: readonly ["surface", "surface-sunken", "surface-chrome", "surface-raised", "surface-hover", "surface-active", "text", "text-muted", "text-faint", "text-disabled", "text-on-accent", "border", "border-strong", "focus-ring", "accent", "accent-hover", "success", "warning", "danger", "info", "bold", "italic", "link", "link-external", "code-inline", "highlight", "blue", "orange", "green", "purple", "cyan", "pink", "yellow", "red", ...("blue-soft" | "orange-soft" | "green-soft" | "purple-soft" | "cyan-soft" | "pink-soft" | "yellow-soft" | "red-soft" | "success-soft" | "warning-soft" | "danger-soft" | "info-soft" | "accent-soft")[], "heading-1", "heading-2", "heading-3", "heading-4", "heading-5", "heading-6", "shadow-s", "shadow-l", "scrim", "dot", "paper"];
export type Role = (typeof ROLES)[number];
/** Roles apps get but plugins do not: plugins show the theme's dots (ticket 014). */
export declare const APP_ONLY_ROLES: readonly ["dot", "paper"];
/** Contrast every text-on-fill rule needs (WCAG AA). */
export declare const MIN_TEXT_CONTRAST = 4.5;
/** Spacing on a 4px grid, Obsidian's `--size-4-N` steps. */
export declare const SPACE_STEPS: readonly [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 16, 18];
export declare const RADII: readonly ["s", "m", "l", "xl", "pill"];
export type Radius = (typeof RADII)[number];
/** Mode-independent tokens: spacing, radius, motion, overlay z-index. */
export declare const STATIC_TOKENS: readonly [...("space-2" | "space-12" | "space-8" | "space-4" | "space-6" | "space-1" | "space-3" | "space-5" | "space-9" | "space-10" | "space-16" | "space-18" | "radius-s" | "radius-m" | "radius-l" | "radius-xl" | "radius-pill")[], "duration-fast", "duration-base", "duration-slow", "exit-factor", "ease-standard", "ease-expo-out", "ease-accel", "layer-overlay", "layer-notice", "layer-tooltip"];
export type StaticToken = (typeof STATIC_TOKENS)[number];

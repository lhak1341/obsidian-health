// The token contract's names (wayfinder tickets 006, 012, 013, 014).
// Every token is `--lk-<name>`. Components read semantic roles only.
export const FLAVORS = ['capri', 'primary'];
export const MODES = ['light', 'dark'];
/** Obsidian's 12 neutral step names. */
export const BASE_STEPS = ['00', '05', '10', '20', '25', '30', '35', '40', '50', '60', '70', '100'];
/** The 8 hues, in chart series order (ticket 013): red comes last. */
export const HUES = ['blue', 'orange', 'green', 'purple', 'cyan', 'pink', 'yellow', 'red'];
export const STATUSES = ['success', 'warning', 'danger', 'info'];
/** Roles that get a `-soft` tint derived with one recipe. */
export const SOFT_TINTED = ['accent', ...STATUSES, ...HUES];
export const HEADINGS = ['heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6'];
/** Roles every flavor × mode defines: colour, shadow, the overlay scrim and the dot (ticket 006 table, 013, 014; kit issue 11). */
export const ROLES = [
    'surface',
    'surface-sunken',
    'surface-chrome',
    'surface-raised',
    'surface-hover',
    'surface-active',
    'text',
    'text-muted',
    'text-faint',
    'text-disabled',
    'text-on-accent',
    'border',
    'border-strong',
    'focus-ring',
    'accent',
    'accent-hover',
    ...STATUSES,
    'bold',
    'italic',
    'link',
    'link-external',
    'code-inline',
    'highlight',
    ...HUES,
    ...SOFT_TINTED.map((r) => `${r}-soft`),
    ...HEADINGS,
    'shadow-s',
    'shadow-l',
    'scrim',
    'dot',
    'paper',
];
/** Roles apps get but plugins do not: plugins show the theme's dots (ticket 014). */
export const APP_ONLY_ROLES = ['dot', 'paper'];
/** Contrast every text-on-fill rule needs (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;
/** Spacing on a 4px grid, Obsidian's `--size-4-N` steps. */
export const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 16, 18];
export const RADII = ['s', 'm', 'l', 'xl', 'pill'];
/** Mode-independent tokens: spacing, radius, motion, overlay z-index. */
export const STATIC_TOKENS = [
    ...SPACE_STEPS.map((n) => `space-${n}`),
    ...RADII.map((r) => `radius-${r}`),
    'duration-fast',
    'duration-base',
    'duration-slow',
    'exit-factor',
    'ease-standard',
    'ease-expo-out',
    'ease-accel',
    'layer-overlay',
    'layer-notice',
    'layer-tooltip',
];

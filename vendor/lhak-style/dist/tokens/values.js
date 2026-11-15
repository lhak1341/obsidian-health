// Token values: the one source of record for tokens.css and obsidian.css.
//
// Sources (never memory or code defaults):
// - Capritarius neutrals: Obsidian's default greys (ticket 008, from
//   Capritarius/ref-app.css .theme-light / .theme-dark).
// - Capritarius accent: ticket 008. Hues, code, bold/italic: theme.css
//   `.theme-capri.theme-light` / `.theme-capri.theme-dark`.
// - Primary: theme.css `.theme-primary.theme-light` / `.theme-dark`, plus
//   Obsidian's role mapping in ref-app.css (`--text-normal: base-100` etc.).
//   Three changes, decided with the user while building
//   .scratch/lhak-style-kit/issues/02-token-contract.md (recorded there):
//   light accent darkened from hsl(31 23% 50%) to 44% (white text 3.67 -> 4.58:1);
//   dark text-on-accent is base-00 (white on the gold was 2.09:1);
//   dark `warning` is orange (the gold accent sat 0.023 OKLab from yellow).
// - Shadows, highlight, hover: ref-app.css / theme.css `.theme-light` / `.theme-dark`.
// - Dot: ticket 014. Motion: ticket 012. Spacing and radius: ticket 006.
// - Overlay layer (kit issue 11): scrim is ref-app.css `--background-modifier-cover`
//   (.theme-light / .theme-dark; theme.css leaves it alone, so both flavors share it);
//   z-index from ref-app.css `--layer-modal` (50), `--layer-notice` (60, toasts;
//   kit issue 13) and `--layer-tooltip` (70).
import { HEADINGS, HUES, MIN_TEXT_CONTRAST, SOFT_TINTED } from "./contract.js";
const v = (name) => `var(--lk-${name})`;
/** The one soft-tint recipe (tickets 006, 013); obsidian.css uses it too. */
export const soft = (name) => `color-mix(in oklab, ${v(name)}, ${v('surface')} 85%)`;
export const PRIMITIVES = {
    capri: {
        light: {
            base: {
                '00': '#ffffff',
                '05': '#fcfcfc',
                '10': '#fafafa',
                '20': '#f6f6f6',
                '25': '#efefef',
                '30': '#e4e4e4',
                '35': '#dadada',
                '40': '#bdbdbd',
                '50': '#ababab',
                '60': '#707070',
                '70': '#5c5c5c',
                '100': '#222222',
            },
            hues: {
                red: '#fc0135',
                orange: '#ff7d00',
                yellow: '#ffae00',
                green: '#28a948',
                cyan: '#00ac96',
                blue: '#006bff',
                purple: '#a100f8',
                pink: '#f22782',
            },
            accent: 'oklch(0.565 0.15 25)',
        },
        dark: {
            base: {
                '00': '#1c1c1c',
                '05': '#212121',
                '10': '#232323',
                '20': '#282828',
                '25': '#2e2e2e',
                '30': '#333333',
                '35': '#3f3f3f',
                '40': '#555555',
                '50': '#666666',
                '60': '#999999',
                '70': '#b3b3b3',
                '100': '#dadada',
            },
            hues: {
                red: '#ff3448',
                orange: '#fa7500',
                yellow: '#ffae00',
                green: '#3ad25e',
                cyan: '#29ccc1',
                blue: '#4191ff',
                purple: '#c472fb',
                pink: '#e7006d',
            },
            accent: 'oklch(0.585 0.15 25)',
        },
    },
    primary: {
        light: {
            base: {
                '00': '#fcfaf8',
                '05': '#f8f5f1',
                '10': '#f2ece3',
                '20': '#eee7dd',
                '25': '#ebe3d6',
                '30': '#e4d7c3',
                '35': '#cfb696',
                '40': '#b79d7b',
                '50': '#9d8062',
                '60': '#836b49',
                '70': '#655134',
                '100': '#432e14',
            },
            hues: {
                red: '#cd4242',
                orange: '#d58534',
                yellow: '#de9f0d',
                green: '#4fab77',
                cyan: '#4caeaa',
                blue: '#3079b0',
                purple: '#7d71c1',
                pink: '#c7707d',
            },
            accent: 'hsl(31 23% 44%)',
        },
        dark: {
            base: {
                '00': '#1c1712',
                '05': '#26211c',
                '10': '#2e261f',
                '20': '#342c23',
                '25': '#3b3026',
                '30': '#51402f',
                '35': '#6b563d',
                '40': '#917959',
                '50': '#ab916d',
                '60': '#c7b194',
                '70': '#d7c0a3',
                '100': '#ebdac6',
            },
            hues: {
                red: '#c04e4e',
                orange: '#cb8035',
                yellow: '#e1b243',
                green: '#50c465',
                cyan: '#46a9b4',
                blue: '#3f89b0',
                purple: '#7161c2',
                pink: '#b46464',
            },
            accent: 'hsl(42 79% 51%)',
        },
    },
};
/** Recipes shared by every flavor; a flavor's own roles override them. */
// The hue and accent primitives are roles under their own names (ticket 006),
// so they are written as values here; the neutral scale stays `--lk-base-NN`.
function sharedRoles(mode, p) {
    const hues = Object.fromEntries(HUES.map((h) => [h, p.hues[h]]));
    return {
        // Obsidian's role mapping (ref-app.css body block).
        surface: v('base-00'),
        'surface-sunken': v('base-10'),
        'surface-chrome': v('base-20'),
        'surface-raised': v('surface'),
        'surface-hover': `color-mix(in oklch, ${mode === 'light' ? 'black' : 'white'} 6.7%, transparent)`,
        'surface-active': `color-mix(in oklch, ${v('accent')} 10%, transparent)`,
        text: v('base-100'),
        'text-muted': v('base-70'),
        'text-faint': v('base-50'),
        'text-disabled': `color-mix(in oklch, ${v('text-faint')}, ${v('surface')} 45%)`,
        'text-on-accent': 'white',
        border: v('base-30'),
        'border-strong': v('base-35'),
        'focus-ring': v('base-40'),
        accent: p.accent,
        // Ticket 006 says "derived with color-mix from accent" without a recipe:
        // a step towards the text colour, darker in light mode and lighter in dark.
        'accent-hover': `color-mix(in oklab, ${v('accent')}, ${v('text')} 15%)`,
        success: v('green'),
        warning: v('yellow'),
        danger: v('red'),
        info: v('blue'),
        bold: v('text'),
        italic: v('text'),
        link: v('accent'),
        'link-external': v('link'),
        'code-inline': v('text'),
        highlight: mode === 'light' ? '#ffd100' : '#ffcc44',
        ...hues,
        ...Object.fromEntries(SOFT_TINTED.map((r) => [`${r}-soft`, soft(r)])),
        ...Object.fromEntries(HEADINGS.map((h) => [h, v('text')])),
        'shadow-s': mode === 'light'
            ? '0px 1px 2px rgba(0, 0, 0, 0.028), 0px 3.4px 6.7px rgba(0, 0, 0, 0.042), 0px 15px 30px rgba(0, 0, 0, 0.07)'
            : '0px 1px 2px rgba(0, 0, 0, 0.121), 0px 3.4px 6.7px rgba(0, 0, 0, 0.179), 0px 15px 30px rgba(0, 0, 0, 0.3)',
        'shadow-l': mode === 'light'
            ? '0px 1.8px 7.3px rgba(0, 0, 0, 0.071), 0px 6.3px 24.7px rgba(0, 0, 0, 0.112), 0px 15px 30px rgba(0, 0, 0, 0.1)'
            : '0px 1.8px 7.3px rgba(0, 0, 0, 0.071), 0px 6.3px 24.7px rgba(0, 0, 0, 0.112), 0px 30px 90px rgba(0, 0, 0, 0.2)',
        scrim: mode === 'light' ? 'rgba(220, 220, 220, 0.4)' : 'rgba(10, 10, 10, 0.4)',
        dot: mode === 'light' ? 'rgb(127 127 127 / 6%)' : 'rgb(127 127 127 / 4%)',
        // A background layer for the page surface: `background: var(--lk-paper), <colour>`.
        // Fixed, so one grid spans the viewport and nested page elements line up.
        // The 0.35px soft edge is the prototype's (prototypes/dotted-paper/dots.css).
        paper: `radial-gradient(circle, ${v('dot')} 1.27px, transparent 1.62px) 0 0 / 9px 9px fixed`,
    };
}
const capriHeadings = {
    'heading-1': v('red'),
    'heading-2': v('orange'),
    'heading-3': v('yellow'),
    'heading-4': v('green'),
    'heading-5': v('blue'),
    'heading-6': v('purple'),
};
/** Each flavor's departures from the shared recipes. */
const FLAVOR_ROLES = {
    capri: {
        light: {
            'code-inline': '#bb3e66',
            ...capriHeadings,
        },
        dark: {
            bold: `hsl(from ${v('yellow')} calc(h * 0.9) calc(s * 1.2) l)`,
            italic: `hsl(from ${v('pink')} h calc(s * 1.25) l)`,
            // The accent on the dark surface is only ~3.7:1 (ticket 008).
            link: { lightenAccent: { on: 'surface', minContrast: MIN_TEXT_CONTRAST } },
            'code-inline': '#199be1',
            ...capriHeadings,
        },
    },
    primary: {
        light: {
            surface: v('base-05'),
            bold: 'hsl(4 56% 48%)',
            italic: 'hsl(200 64% 37%)',
            link: 'hsl(40 79% 47%)',
            'link-external': 'hsl(149 50% 39%)',
            'code-inline': 'hsl(4 59% 64%)',
        },
        dark: {
            surface: v('base-10'),
            'surface-sunken': '#2a241e',
            'surface-chrome': v('base-05'),
            border: v('base-25'),
            'text-on-accent': v('base-00'),
            warning: v('orange'),
            bold: 'hsl(4 88% 61%)',
            italic: 'hsl(194 59% 56%)',
            link: 'hsl(42 79% 51%)',
            'link-external': 'hsl(154 57% 42%)',
            'code-inline': 'hsl(4 91% 67%)',
        },
    },
};
export function roleValues(flavor, mode) {
    return { ...sharedRoles(mode, PRIMITIVES[flavor][mode]), ...FLAVOR_ROLES[flavor][mode] };
}
export const STATIC_VALUES = {
    'space-1': '4px',
    'space-2': '8px',
    'space-3': '12px',
    'space-4': '16px',
    'space-5': '20px',
    'space-6': '24px',
    'space-8': '32px',
    'space-9': '36px',
    'space-10': '40px',
    'space-12': '48px',
    'space-16': '64px',
    'space-18': '72px',
    'radius-s': '4px',
    'radius-m': '8px',
    'radius-l': '12px',
    'radius-xl': '16px',
    'radius-pill': '9999px',
    'duration-fast': '100ms',
    'duration-base': '200ms',
    'duration-slow': '300ms',
    'exit-factor': '0.75',
    'ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
    'ease-expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'ease-accel': 'cubic-bezier(0.4, 0, 1, 1)',
    // Every overlay shares one layer and stacks by opening order (Base UI portals
    // each into <body> as it opens); tooltips sit above them all.
    'layer-overlay': '50',
    'layer-notice': '60',
    'layer-tooltip': '70',
};

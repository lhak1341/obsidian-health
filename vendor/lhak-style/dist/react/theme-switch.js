import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cx } from "./cx.js";
import { SegmentedControl } from "./segmented.js";
import { useTheme } from "./theme.js";
const FLAVOR_ITEMS = [
    { value: 'capri', label: 'Capritarius' },
    { value: 'primary', label: 'Primary' },
];
const MODE_ITEMS = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];
/** Must sit inside a ThemeProvider (KitRoot carries one). */
export function ThemeSwitch({ flavorLabel = 'Flavor', modeLabel = 'Mode', className }) {
    const { flavor, mode, setFlavor, setMode } = useTheme();
    return (_jsxs("div", { className: cx('lk-theme-switch', className), children: [_jsx(SegmentedControl, { label: flavorLabel, items: FLAVOR_ITEMS, value: flavor, onValueChange: setFlavor }), _jsx(SegmentedControl, { label: modeLabel, items: MODE_ITEMS, value: mode, onValueChange: setMode })] }));
}

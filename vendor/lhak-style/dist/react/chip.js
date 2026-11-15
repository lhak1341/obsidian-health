import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Chips (SPEC user stories 44, 45): a static chip for a category, a count or a
// status, and a toggle chip on Base UI's Toggle, all with the chip pattern's
// classes (src/styles/chip.css), so they render like the shared pattern.
//
// A category hue shows as a dot or a soft tint, never a solid fill with white
// text. A status chip always carries its icon, named by a word, so status never
// rests on colour alone.
import { Toggle } from '@base-ui/react/toggle';
import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import { cx } from "./cx.js";
/** The contract's category hues (src/tokens/contract.ts `HUES`; chip.test.tsx pins them). */
export const CHIP_HUES = ['blue', 'orange', 'green', 'purple', 'cyan', 'pink', 'yellow', 'red'];
const STATUS = {
    success: { icon: CircleCheck, label: 'Success' },
    warning: { icon: CircleAlert, label: 'Warning' },
    danger: { icon: CircleX, label: 'Error' },
    info: { icon: Info, label: 'Info' },
};
function Count({ count }) {
    if (count == null)
        return null;
    // The space keeps the count a separate word in the accessible name; flex layout hides it.
    return (_jsxs(_Fragment, { children: [' ', _jsx("span", { className: "lk-chip__count", children: count })] }));
}
export function Chip({ hue, tint, status, count, className, children, ...props }) {
    const s = status ? STATUS[status] : undefined;
    return (_jsxs("span", { ...props, className: cx('lk-chip', hue && `lk-chip--${hue}`, hue && tint && 'lk-chip--tint', status && `lk-chip--${status}`, className), children: [hue && !tint && _jsx("span", { className: "lk-chip__dot", "aria-hidden": "true" }), s && _jsx(s.icon, { role: "img", "aria-label": s.label, "aria-hidden": false, strokeWidth: 2, className: "lk-chip__icon" }), children, _jsx(Count, { count: count })] }));
}
/** A chip that turns a filter on and off: a button with `aria-pressed`. */
export function ToggleChip({ count, className, children, ...props }) {
    return (_jsxs(Toggle, { type: "button", ...props, className: cx('lk-chip', 'lk-chip--toggle', className), children: [children, _jsx(Count, { count: count })] }));
}

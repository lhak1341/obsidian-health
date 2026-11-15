import { jsx as _jsx } from "react/jsx-runtime";
import { cx } from "./cx.js";
/** Lucide's default, which every translator icon used before the kit (kit issue 09). */
const STROKE_WIDTH = 2;
export function Icon({ icon: Glyph, step, label, className, ...props }) {
    const a11y = label ? { role: 'img', 'aria-label': label, 'aria-hidden': false } : { 'aria-hidden': true };
    return (_jsx(Glyph, { ...props, ...a11y, strokeWidth: STROKE_WIDTH, className: cx('lk-icon', step && `lk-icon--${step}`, className) }));
}

import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
/** Put this class on the row element whose hover and focus reveal its actions. */
export const ROW_CLASS = 'lk-row';
export function RowActions({ label, className, ...props }) {
    return _jsx("div", { ...props, role: "group", "aria-label": label, className: cx('lk-row-actions', className) });
}
export function RowAction({ icon, label, tone = 'neutral', className, ...props }) {
    return (_jsx(Button, { ...props, variant: "ghost", iconOnly: true, "aria-label": label, title: label, className: cx('lk-row-action', tone === 'danger' && 'lk-row-action--danger', className), children: _jsx(Icon, { icon: icon }) }));
}

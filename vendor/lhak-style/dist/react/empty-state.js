import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Spinner and empty/loading state (SPEC user story 44), with the shared
// patterns' classes (src/styles/spinner.css, empty-state.css).
import { useId } from 'react';
import { cx } from "./cx.js";
export function Spinner({ label, className, ...props }) {
    const a11y = label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true };
    return _jsx("span", { ...props, ...a11y, className: cx('lk-spinner', className) });
}
export function EmptyState({ title, description, icon, action, loading = false, className, ...props }) {
    const titleId = useId();
    const status = loading ? { role: 'status', 'aria-labelledby': titleId } : {};
    return (_jsxs("div", { ...props, ...status, className: cx('lk-empty-state', className), children: [loading ? (_jsx(Spinner, {})) : (icon && (_jsx("span", { className: "lk-empty-state__icon", "aria-hidden": "true", children: icon }))), _jsx("p", { id: titleId, className: "lk-empty-state__title", children: title }), description && _jsx("p", { className: "lk-empty-state__description", children: description }), action && _jsx("div", { className: "lk-empty-state__action", children: action })] }));
}

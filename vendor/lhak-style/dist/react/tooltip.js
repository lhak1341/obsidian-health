import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Tooltip (SPEC user stories 37, 41; kit issue 11): Base UI's Tooltip on the
// overlay layer (src/styles/overlay.css, tooltip.css). Base UI treats a tooltip
// as a visual label only (no role, no aria-describedby), so the kit names the
// trigger itself: with `label`, or with `content` when that is a string.
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cx } from "./cx.js";
export function Tooltip({ content, label, children, side, align, delay, closeDelay, disabled, className }) {
    const name = label ?? (typeof content === 'string' ? content : undefined);
    return (_jsxs(BaseTooltip.Root, { disabled: disabled, children: [_jsx(BaseTooltip.Trigger, { render: children, "aria-label": name, delay: delay, closeDelay: closeDelay }), _jsx(BaseTooltip.Portal, { children: _jsx(BaseTooltip.Positioner, { className: "lk-tooltip__positioner", side: side, align: align, sideOffset: 6, children: _jsx(BaseTooltip.Popup, { className: cx('lk-tooltip', className), children: content }) }) })] }));
}
/**
 * Groups tooltips (a toolbar): once one shows, its neighbours show at once.
 * Optional; a lone tooltip needs none.
 */
export function TooltipProvider(props) {
    return _jsx(BaseTooltip.Provider, { ...props });
}

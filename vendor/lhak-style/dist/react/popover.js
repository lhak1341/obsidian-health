import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Popover (SPEC user stories 37, 41; kit issue 11): Base UI's Popover on the
// overlay layer (src/styles/overlay.css, popover.css). Non-modal: it closes on
// Escape or an outside press and returns focus to its trigger.
import { Popover as BasePopover } from '@base-ui/react/popover';
import { cx } from "./cx.js";
/** The popover's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export function Popover(props) {
    return _jsx(BasePopover.Root, { ...props });
}
/** Opens the popover. Pass `render={<Button />}` for the kit's button look. */
export function PopoverTrigger(props) {
    return _jsx(BasePopover.Trigger, { ...props });
}
/** The floating box, placed next to its trigger (default: below, 4px away). */
export function PopoverPopup({ side, align, sideOffset = 4, title, className, children, ...popup }) {
    return (_jsx(BasePopover.Portal, { children: _jsx(BasePopover.Positioner, { className: "lk-overlay-positioner", side: side, align: align, sideOffset: sideOffset, children: _jsxs(BasePopover.Popup, { ...popup, className: cx('lk-overlay', 'lk-popover', className), children: [title != null && _jsx(BasePopover.Title, { className: "lk-popover__title", children: title }), children] }) }) }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Dropdown menu (SPEC user stories 37, 41; kit issue 12): Base UI's Menu on
// the overlay layer (src/styles/overlay.css, menu.css). Base UI gives it the
// ARIA menu button pattern: arrows move, typeahead jumps, Enter activates,
// Escape closes and returns focus to the trigger.
//
// The items are shared with the context menu (context-menu.tsx): Base UI's
// ContextMenu reuses Menu's Item and Separator parts as they are.
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
/** The menu's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export function Menu(props) {
    return _jsx(BaseMenu.Root, { ...props });
}
/** Opens the menu. Pass `render={<Button />}` for the kit's button look. */
export function MenuTrigger(props) {
    return _jsx(BaseMenu.Trigger, { ...props });
}
/** The floating list of items, placed next to its trigger (default: below, 4px away). */
export function MenuPopup({ side, align = 'start', sideOffset = 4, className, children, ...popup }) {
    return (_jsx(BaseMenu.Portal, { children: _jsx(BaseMenu.Positioner, { className: "lk-overlay-positioner", side: side, align: align, sideOffset: sideOffset, children: _jsx(BaseMenu.Popup, { ...popup, className: cx('lk-overlay', 'lk-menu', className), children: children }) }) }));
}
/** One action. It closes the menu when chosen unless `closeOnClick={false}`. */
export function MenuItem({ icon, variant = 'default', className, children, ...item }) {
    return (_jsxs(BaseMenu.Item, { ...item, className: cx('lk-menu__item', variant === 'danger' && 'lk-menu__item--danger', className), children: [_jsx("span", { className: "lk-menu__item-icon", children: icon && _jsx(Icon, { icon: icon }) }), _jsx("span", { className: "lk-menu__item-label", children: children })] }));
}
/** A line between groups of items. */
export function MenuSeparator({ className }) {
    return _jsx(BaseMenu.Separator, { className: cx('lk-menu__separator', className) });
}

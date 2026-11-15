import { jsx as _jsx } from "react/jsx-runtime";
// Context menu (SPEC user stories 37, 41; kit issue 12): Base UI's
// ContextMenu, opened by right click or long press on its trigger area, at the
// pointer. Its items are the dropdown's (MenuItem, MenuSeparator from
// menu.tsx): Base UI's ContextMenu reuses Menu's parts, so they work
// inside either. Same look (src/styles/menu.css) and keyboard behaviour.
//
// Tab closes it, as the APG menu pattern asks: Base UI's dropdown does so on
// its own, but its context menu kept the menu open (kit issue 12).
import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { createContext, useContext, useRef } from 'react';
import { cx } from "./cx.js";
/** The open root's actions, so the popup can close it on Tab. */
const RootActions = createContext(null);
/** The context menu's root: holds the open state. */
export function ContextMenu({ actionsRef, ...props }) {
    const own = useRef(null);
    const actions = actionsRef ?? own;
    return (_jsx(RootActions.Provider, { value: actions, children: _jsx(BaseContextMenu.Root, { ...props, actionsRef: actions }) }));
}
/**
 * The area a right click opens the menu on. Renders a `<div>`; pass `render`
 * to make an existing element (a row) the area.
 */
export function ContextMenuTrigger(props) {
    return _jsx(BaseContextMenu.Trigger, { ...props });
}
/** The floating list of items, opened at the pointer. */
export function ContextMenuPopup({ className, children, ...popup }) {
    const actions = useContext(RootActions);
    const closeOnTab = (event) => {
        if (event.key === 'Tab')
            actions?.current?.close();
    };
    return (_jsx(BaseContextMenu.Portal, { children: _jsx(BaseContextMenu.Positioner, { className: "lk-overlay-positioner", children: _jsx(BaseContextMenu.Popup, { ...popup, onKeyDown: closeOnTab, className: cx('lk-overlay', 'lk-menu', className), children: children }) }) }));
}

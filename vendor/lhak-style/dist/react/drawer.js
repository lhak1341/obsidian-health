import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Drawer (SPEC user stories 38, 41, 43; kit issue 13): Base UI's Drawer as a
// side sheet on the overlay layer (src/styles/drawer.css). It slides in at the
// slow tier, follows the finger while swiped towards its edge, and a release
// past the threshold runs the exit timing. Modal by default (focus trap,
// scrim); `modal={false}` leaves the page usable beside it, with no scrim.
import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { X } from 'lucide-react';
import { createContext, useContext } from 'react';
import { Button } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
const DrawerContext = createContext({ side: 'right', modal: true });
/** The drawer's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export function Drawer({ side = 'right', modal = true, ...props }) {
    return (_jsx(DrawerContext.Provider, { value: { side, modal }, children: _jsx(BaseDrawer.Root, { ...props, modal: modal, swipeDirection: side }) }));
}
/** Opens the drawer. Pass `render={<Button />}` for the kit's button look. */
export function DrawerTrigger(props) {
    return _jsx(BaseDrawer.Trigger, { ...props });
}
/** Closes the drawer. Pass `render={<Button />}` for the kit's button look. */
export function DrawerClose(props) {
    return _jsx(BaseDrawer.Close, { ...props });
}
/** The scrim (modal only) and the panel: a header (title, close button), then `children`. */
export function DrawerPopup({ title, description, closeLabel = 'Close', className, children, ...popup }) {
    const { side, modal } = useContext(DrawerContext);
    return (_jsxs(BaseDrawer.Portal, { children: [modal && _jsx(BaseDrawer.Backdrop, { className: "lk-scrim lk-drawer__backdrop" }), _jsx(BaseDrawer.Viewport, { className: cx('lk-drawer__viewport', side === 'left' && 'lk-drawer__viewport--left'), children: _jsxs(BaseDrawer.Popup, { ...popup, className: cx('lk-overlay', 'lk-drawer', side === 'left' && 'lk-drawer--left', className), children: [_jsxs("div", { className: "lk-dialog__header", children: [_jsx(BaseDrawer.Title, { className: "lk-drawer__title", children: title }), _jsx(BaseDrawer.Close, { render: _jsx(Button, { variant: "ghost", iconOnly: true, "aria-label": closeLabel }), children: _jsx(Icon, { icon: X }) })] }), description != null && _jsx(BaseDrawer.Description, { className: "lk-dialog__description", children: description }), _jsx(BaseDrawer.Content, { className: "lk-drawer__content", children: children })] }) })] }));
}

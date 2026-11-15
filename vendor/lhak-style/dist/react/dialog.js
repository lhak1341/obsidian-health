import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Dialog (SPEC user stories 38, 41; kit issue 11): Base UI's Dialog on the
// overlay layer (src/styles/overlay.css, dialog.css). Modal: Base UI traps
// focus, closes on Escape and outside press, and returns focus on close.
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { Button } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
/** The dialog's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export function Dialog(props) {
    return _jsx(BaseDialog.Root, { ...props });
}
/** Opens the dialog. Pass `render={<Button />}` for the kit's button look. */
export function DialogTrigger(props) {
    return _jsx(BaseDialog.Trigger, { ...props });
}
/** Closes the dialog. Pass `render={<Button />}` for the kit's button look. */
export function DialogClose(props) {
    return _jsx(BaseDialog.Close, { ...props });
}
/** The scrim and the dialog box: a header (title, close button), then `children`. */
export function DialogPopup({ title, description, closeDisabled, className, children, ...popup }) {
    return (_jsxs(BaseDialog.Portal, { children: [_jsx(BaseDialog.Backdrop, { className: "lk-scrim" }), _jsx(BaseDialog.Viewport, { className: "lk-dialog__viewport", children: _jsxs(BaseDialog.Popup, { ...popup, className: cx('lk-overlay', 'lk-dialog', className), children: [_jsxs("div", { className: "lk-dialog__header", children: [_jsx(BaseDialog.Title, { className: "lk-dialog__title", children: title }), _jsx(BaseDialog.Close, { disabled: closeDisabled, render: _jsx(Button, { variant: "ghost", iconOnly: true, "aria-label": "Close" }), children: _jsx(Icon, { icon: X }) })] }), description != null && (_jsx(BaseDialog.Description, { className: "lk-dialog__description", children: description })), children] }) })] }));
}

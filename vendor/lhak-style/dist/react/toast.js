import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Toast (SPEC user stories 38, 41, 42; kit issue 13): Base UI's Toast stack on
// the overlay layer (src/styles/toast.css). At most 3 at once, 4 s each; the
// stack expands while hovered or focused, and a swipe right or down dismisses.
// Base UI announces each toast through the viewport's polite live region
// ("Notifications"); a toast added with `priority: 'high'` is announced as an
// alert instead.
import { Toast as BaseToast } from '@base-ui/react/toast';
import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react';
import { Button } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
const STATUS = {
    success: { icon: CircleCheck, label: 'Success' },
    error: { icon: CircleX, label: 'Error' },
    warning: { icon: CircleAlert, label: 'Warning' },
    info: { icon: Info, label: 'Info' },
};
const isStatus = (type) => type != null && Object.hasOwn(STATUS, type);
/** Queues toasts from outside React (pass it to `ToastProvider`). */
export const createToastManager = BaseToast.createToastManager;
/** Adds, updates and closes toasts from inside `ToastProvider`. */
export const useToastManager = BaseToast.useToastManager;
/** Holds the toasts and renders the stack in the bottom-right corner. Wrap the app once. */
export function ToastProvider({ children, toastManager, limit = 3, timeout = 4000 }) {
    return (_jsxs(BaseToast.Provider, { toastManager: toastManager, limit: limit, timeout: timeout, children: [children, _jsx(BaseToast.Portal, { children: _jsx(BaseToast.Viewport, { className: "lk-toast__viewport", children: _jsx(ToastList, {}) }) })] }));
}
function ToastList() {
    const { toasts } = BaseToast.useToastManager();
    return toasts.map((toast) => {
        const status = isStatus(toast.type) ? STATUS[toast.type] : undefined;
        return (_jsx(BaseToast.Root, { toast: toast, swipeDirection: ['right', 'down'], className: cx('lk-overlay', 'lk-toast'), children: _jsxs(BaseToast.Content, { className: "lk-toast__content", children: [status && _jsx(Icon, { icon: status.icon, label: status.label, className: cx('lk-toast__status', `lk-toast__status--${toast.type}`) }), _jsxs("div", { className: "lk-toast__text", children: [_jsx(BaseToast.Title, { className: "lk-toast__title" }), _jsx(BaseToast.Description, { className: "lk-toast__description" })] }), _jsx(BaseToast.Close, { render: _jsx(Button, { variant: "ghost", iconOnly: true, "aria-label": "Dismiss" }), children: _jsx(Icon, { icon: X }) })] }) }, toast.id));
    });
}

import { jsx as _jsx } from "react/jsx-runtime";
// Button (SPEC user story 40): Base UI's Button with the button pattern's
// classes (src/styles/button.css), so it renders like the shared pattern.
import { Button as BaseButton } from '@base-ui/react/button';
import { cx } from "./cx.js";
export function Button({ variant = 'secondary', iconOnly = false, className, type = 'button', ...props }) {
    return (_jsx(BaseButton, { type: type, ...props, className: cx('lk-button', variant !== 'secondary' && `lk-button--${variant}`, iconOnly && 'lk-button--icon-only', className) }));
}

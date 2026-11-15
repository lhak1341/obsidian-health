import { jsx as _jsx } from "react/jsx-runtime";
// Text field and textarea (SPEC user story 40), with the text-field pattern's
// classes (src/styles/text-field.css). Label them with a <label> or aria-label.
import { Input } from '@base-ui/react/input';
import { cx } from "./cx.js";
export function TextField({ invalid, className, ...props }) {
    return (_jsx(Input, { ...props, "aria-invalid": invalid || undefined, className: cx('lk-text-field', className) }));
}
export function Textarea({ invalid, className, ...props }) {
    return (_jsx("textarea", { ...props, "aria-invalid": invalid || undefined, className: cx('lk-text-field', 'lk-text-field--multiline', className) }));
}

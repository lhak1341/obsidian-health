import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Progress bar (SPEC user story 44): Base UI's Progress with the kit's classes
// (src/styles/progress.css). A label and the value sit above the track.
import { Progress } from '@base-ui/react/progress';
import { cx } from "./cx.js";
export function ProgressBar({ label, hideLabel = false, valueText, className, ...props }) {
    return (_jsxs(Progress.Root, { ...props, "aria-label": hideLabel ? label : undefined, "aria-valuetext": valueText, className: cx('lk-progress', className), children: [!hideLabel && (_jsxs(_Fragment, { children: [_jsx(Progress.Label, { className: "lk-progress__label", children: label }), _jsx(Progress.Value, { className: "lk-progress__value", children: (formatted) => valueText ?? formatted })] })), _jsx(Progress.Track, { className: "lk-progress__track", children: _jsx(Progress.Indicator, { className: "lk-progress__indicator" }) })] }));
}

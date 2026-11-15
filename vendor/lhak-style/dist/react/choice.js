import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// Checkbox, radio group and switch (SPEC user story 40) on Base UI.
// Checkbox renders the checkbox pattern's classes (src/styles/checkbox.css);
// radio and switch are kit-only (radio.css, switch.css). Given children, each
// wraps itself and them in a .lk-choice <label>, which names it.
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cx } from "./cx.js";
/** Wraps `control` and `children` in a label when there are children. */
function withLabel(control, children) {
    if (children == null)
        return control;
    return (_jsxs("label", { className: "lk-choice", children: [control, children] }));
}
export function Checkbox({ children, className, ...props }) {
    return withLabel(_jsx(BaseCheckbox.Root, { ...props, className: cx('lk-checkbox', className) }), children);
}
export function RadioGroup({ className, ...props }) {
    return _jsx(BaseRadioGroup, { ...props, className: cx('lk-radio-group', className) });
}
export function Radio({ children, className, ...props }) {
    return withLabel(_jsx(BaseRadio.Root, { ...props, className: cx('lk-radio', className) }), children);
}
export function Switch({ children, className, ...props }) {
    return withLabel(_jsx(BaseSwitch.Root, { ...props, className: cx('lk-switch', className), children: _jsx(BaseSwitch.Thumb, { className: "lk-switch__thumb" }) }), children);
}

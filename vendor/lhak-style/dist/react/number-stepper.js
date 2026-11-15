import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Number stepper (SPEC user story 40): Base UI's NumberField as − value +
// (src/styles/number-stepper.css). The input takes the keys (ArrowUp and
// ArrowDown step, Shift for `largeStep`); Base UI names the buttons
// "Increase" and "Decrease" and disables the one at a bound.
import { NumberField } from '@base-ui/react/number-field';
import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
export function NumberStepper({ label, 'aria-label': ariaLabel, id, className, ...root }) {
    const ownId = useId();
    const inputId = id ?? ownId;
    const group = (_jsxs(NumberField.Group, { className: cx('lk-number-stepper', className), children: [_jsx(NumberField.Decrement, { className: "lk-number-stepper__button", children: _jsx(Icon, { icon: Minus }) }), _jsx(NumberField.Input, { "aria-label": ariaLabel, className: "lk-number-stepper__input" }), _jsx(NumberField.Increment, { className: "lk-number-stepper__button", children: _jsx(Icon, { icon: Plus }) })] }));
    return (_jsxs(NumberField.Root, { ...root, id: inputId, className: "lk-number-stepper-field", children: [label != null && (_jsx("label", { htmlFor: inputId, className: "lk-number-stepper-label", children: label })), group] }));
}

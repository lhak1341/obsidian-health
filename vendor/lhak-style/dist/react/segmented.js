import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Segmented control (SPEC user story 44; wayfinder ticket 010): one choice
// from a few, drawn as joined buttons (src/styles/segmented.css). It is Base
// UI's RadioGroup, so it reads as a radio group: arrows move the choice and
// Tab enters at the chosen segment. The theme switch is built from it.
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { useId } from 'react';
import { cx } from "./cx.js";
export function SegmentedControl({ items, label, className, ...props }) {
    const labelId = useId();
    const group = (_jsx(BaseRadioGroup, { ...props, "aria-labelledby": label == null ? undefined : labelId, className: cx('lk-segmented', className), children: items.map((item) => (_jsx(BaseRadio.Root, { value: item.value, disabled: item.disabled, className: "lk-segmented__item", children: item.label }, item.value))) }));
    if (label == null)
        return group;
    return (_jsxs("div", { className: "lk-segmented-field", children: [_jsx("span", { id: labelId, className: "lk-segmented-label", children: label }), group] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Select (SPEC user story 40): Base UI's Select with the kit's classes
// (src/styles/select.css). Single choice from a list of items.
import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
export function Select({ items, label, 'aria-label': ariaLabel, placeholder, className, alignItemWithTrigger = false, id, triggerRef, ...root }) {
    const trigger = (_jsxs(BaseSelect.Trigger, { id: id, ref: triggerRef, "aria-label": ariaLabel, className: cx('lk-select', className), children: [_jsx(BaseSelect.Value, { className: "lk-select__value", placeholder: placeholder }), _jsx(BaseSelect.Icon, { className: "lk-select__icon", children: _jsx(Icon, { icon: ChevronsUpDown }) })] }));
    return (_jsxs(BaseSelect.Root, { ...root, items: items, children: [label == null ? (trigger) : (_jsxs("div", { className: "lk-select-field", children: [_jsx(BaseSelect.Label, { className: "lk-select-label", children: label }), trigger] })), _jsx(BaseSelect.Portal, { children: _jsx(BaseSelect.Positioner, { className: "lk-select__positioner", sideOffset: 4, alignItemWithTrigger: alignItemWithTrigger, children: _jsx(BaseSelect.Popup, { className: "lk-select__popup", children: _jsx(BaseSelect.List, { className: "lk-select__list", children: items.map((item) => (_jsxs(BaseSelect.Item, { value: item.value, disabled: item.disabled, className: "lk-select__item", children: [_jsx(BaseSelect.ItemIndicator, { className: "lk-select__item-indicator", children: _jsx(Icon, { icon: Check }) }), _jsx(BaseSelect.ItemText, { className: "lk-select__item-text", children: item.label })] }, String(item.value)))) }) }) }) })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Combobox (SPEC user stories 37, 41, 49; kit issue 12): Base UI's Combobox,
// a select whose list filters as you type, with an optional Lucide icon per
// item. It is the future icon picker (LEDG). Base UI gives it the ARIA
// combobox pattern: focus stays in the input, arrows move the active option
// (`aria-activedescendant`), Enter chooses, Escape closes.
//
// The input is the text field pattern (text-field.css); the popup sits on the
// overlay layer (overlay.css) and moves like the select's (combobox.css).
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useId, useMemo } from 'react';
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
export function Combobox({ items, label, 'aria-label': ariaLabel, placeholder, empty = 'No matches', className, ...root }) {
    const id = useId();
    const collection = useMemo(() => BaseCombobox.createItems(items, { getValue: (item) => item.value, getLabel: (item) => item.label }), [items]);
    const iconOf = useMemo(() => new Map(items.map((item) => [item.value, item.icon])), [items]);
    const group = (_jsxs(BaseCombobox.InputGroup, { className: cx('lk-combobox', className), children: [_jsx(BaseCombobox.Value, { children: (value) => {
                    const icon = value == null ? undefined : iconOf.get(value);
                    return icon ? (_jsx("span", { className: "lk-combobox__value-icon", children: _jsx(Icon, { icon: icon }) })) : null;
                } }), _jsx(BaseCombobox.Input, { id: id, "aria-label": ariaLabel, placeholder: placeholder, className: "lk-text-field lk-combobox__input" }), _jsx(BaseCombobox.Trigger, { className: "lk-combobox__trigger", "aria-label": "Show options", children: _jsx(Icon, { icon: ChevronsUpDown }) })] }));
    return (_jsxs(BaseCombobox.Root, { ...root, items: collection, children: [label == null ? (group) : (_jsxs("div", { className: "lk-combobox-field", children: [_jsx("label", { htmlFor: id, className: "lk-combobox-label", children: label }), group] })), _jsx(BaseCombobox.Portal, { children: _jsx(BaseCombobox.Positioner, { className: "lk-overlay-positioner", sideOffset: 4, children: _jsxs(BaseCombobox.Popup, { className: "lk-overlay lk-combobox__popup", children: [_jsx(BaseCombobox.Empty, { className: "lk-combobox__empty", children: empty }), _jsx(BaseCombobox.List, { className: "lk-combobox__list", children: (item) => (_jsxs(BaseCombobox.Item, { value: item.value, disabled: item.disabled, className: "lk-combobox__item", children: [_jsx("span", { className: "lk-combobox__item-icon", children: item.icon && _jsx(Icon, { icon: item.icon }) }), _jsx("span", { className: "lk-combobox__item-label", children: item.label }), _jsx(BaseCombobox.ItemIndicator, { className: "lk-combobox__item-indicator", children: _jsx(Icon, { icon: Check }) })] }, String(item.value))) })] }) }) })] }));
}

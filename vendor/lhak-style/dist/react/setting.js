import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Settings rows (SPEC user story 47; kit issue 15): a `SettingGroup` titles a
// section of a settings screen, and each `SettingRow` lays out a label, its
// control and a help line (src/styles/setting.css).
//
// A group can follow another section (`follows`): a switch in its header,
// and while it is on, the group's rows are disabled, because their values
// come from the followed section (the translator's character-only box follows
// the full translation box). The rows sit in a Base UI Fieldset, so `disabled`
// reaches every Base UI control in them, and the native <fieldset> disables
// native buttons; the switch sits outside it.
import { Field } from '@base-ui/react/field';
import { Fieldset } from '@base-ui/react/fieldset';
import { useId } from 'react';
import { Switch } from "./choice.js";
import { cx } from "./cx.js";
export function SettingGroup({ title, description, follows, disabled = false, className, children }) {
    const titleId = useId();
    const descriptionId = useId();
    return (_jsxs("section", { "aria-labelledby": titleId, "aria-describedby": description != null ? descriptionId : undefined, className: cx('lk-setting-group', className), children: [_jsxs("header", { className: "lk-setting-group__header", children: [_jsx("h3", { id: titleId, className: "lk-setting-group__title", children: title }), description != null && (_jsx("p", { id: descriptionId, className: "lk-setting-group__description", children: description })), follows && (_jsx("div", { className: "lk-setting-group__follows", children: _jsx(Switch, { checked: follows.checked, onCheckedChange: follows.onCheckedChange, children: follows.label }) }))] }), _jsx(Fieldset.Root, { disabled: disabled || (follows?.checked ?? false), className: "lk-setting-group__rows", children: children })] }));
}
/**
 * One setting: a Base UI Field, so its label names and its help describes a
 * kit control in it (TextField, Switch, Select, Slider, NumberStepper).
 */
export function SettingRow({ label, help, group = false, disabled, className, children }) {
    if (group)
        return _jsx(SettingGroupRow, { label: label, help: help, disabled: disabled, className: className, children: children });
    return (_jsxs(Field.Root, { disabled: disabled, className: cx('lk-setting-row', className), children: [_jsx(Field.Label, { className: "lk-setting-row__label", children: label }), _jsx("div", { className: "lk-setting-row__control", children: children }), help != null && _jsx(Field.Description, { className: "lk-setting-row__help", children: help })] }));
}
function SettingGroupRow({ label, help, disabled, className, children }) {
    const labelId = useId();
    const helpId = useId();
    return (_jsxs("div", { role: "group", "aria-labelledby": labelId, "aria-describedby": help != null ? helpId : undefined, "data-disabled": disabled || undefined, className: cx('lk-setting-row', className), children: [_jsx("span", { id: labelId, className: "lk-setting-row__label", children: label }), _jsx("div", { className: "lk-setting-row__control", children: children }), help != null && (_jsx("p", { id: helpId, className: "lk-setting-row__help", children: help }))] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Search/filter bar (SPEC user story 44): a search landmark holding a search
// field with a clear button, an optional filter toggle and trailing actions
// (src/styles/search-bar.css). The caller owns the query and whether the
// filter panel is open; the panel itself stays app-side.
import { Toggle } from '@base-ui/react/toggle';
import { Filter, Search, X } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { Button } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
import { TextField } from "./text-field.js";
function setRef(ref, node) {
    if (typeof ref === 'function')
        ref(node);
    else if (ref)
        ref.current = node;
}
export function SearchBar({ label, value, onValueChange, placeholder, inputRef, filter, children, className }) {
    const field = useRef(null);
    const setField = useCallback((node) => {
        field.current = node;
        setRef(inputRef, node);
    }, [inputRef]);
    const clear = () => {
        onValueChange('');
        field.current?.focus();
    };
    // Escape clears a non-empty field and stops there; in an empty field it
    // bubbles on, so the app can close whatever the search sits in.
    const onKeyDown = (e) => {
        if (e.key !== 'Escape' || value === '')
            return;
        e.preventDefault();
        e.stopPropagation();
        onValueChange('');
    };
    const filterName = filter && (filter.active ? `${filter.label} (active)` : filter.label);
    return (_jsxs("div", { role: "search", className: cx('lk-search-bar', className), children: [_jsxs("div", { className: "lk-search-bar__field", children: [_jsx(Icon, { icon: Search, className: "lk-search-bar__glass" }), _jsx(TextField, { type: "search", "aria-label": label, placeholder: placeholder, value: value, onChange: (e) => onValueChange(e.currentTarget.value), onKeyDown: onKeyDown, ref: setField, className: "lk-search-bar__input" }), value !== '' && (_jsx(Button, { variant: "ghost", iconOnly: true, "aria-label": "Clear search", onClick: clear, className: "lk-search-bar__clear", children: _jsx(Icon, { icon: X }) }))] }), filter && (_jsxs(Toggle, { pressed: filter.open, onPressedChange: filter.onOpenChange, render: _jsx(Button, { variant: "ghost", iconOnly: true, "aria-label": filterName, title: filterName, className: "lk-search-bar__filter" }), children: [_jsx(Icon, { icon: Filter }), filter.active && _jsx("span", { className: "lk-search-bar__filter-dot", "aria-hidden": "true" })] })), children] }));
}

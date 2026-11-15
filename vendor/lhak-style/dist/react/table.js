import { jsx as _jsx } from "react/jsx-runtime";
// Table parts (SPEC user story 46; kit issue 15): the header, row and cell an
// app's own table renders through, and a hook that opens one context menu for
// whichever row was right-clicked. The app keeps its data logic and its
// virtualisation: these parts carry the ARIA table roles and the look
// (src/styles/table.css), not the rows' data or their positions.
//
// The rows paint opaque bands of their own (`stripe`, `selected`): a
// virtualised list knows each row's global index, but CSS `:nth-child` sees
// only the rendered slice, and a see-through row lets an app's dotted paper
// show through.
import { useCallback, useRef, useState } from 'react';
import { ROW_CLASS } from "./row-actions.js";
import { cx } from "./cx.js";
/** The table: name it with `aria-label` or `aria-labelledby`. */
export function Table({ rowCount, className, ...props }) {
    return _jsx("div", { role: "table", "aria-rowcount": rowCount, ...props, className: cx('lk-table', className) });
}
/** The header row (row 1), which stays put while the body scrolls. Holds `TableHeaderCell`s. */
export function TableHeader({ className, children, ...props }) {
    return (_jsx("div", { role: "rowgroup", ...props, className: cx('lk-table__header', className), children: _jsx("div", { role: "row", "aria-rowindex": 1, className: "lk-table__header-row", children: children }) }));
}
const alignClass = (align) => align !== 'start' && `lk-table__cell--${align}`;
export function TableHeaderCell({ align = 'start', className, ...props }) {
    return _jsx("div", { role: "columnheader", ...props, className: cx('lk-table__header-cell', alignClass(align), className) });
}
/** The rows' group. Often the app's scroll container: pass its `ref` and `onScroll`. */
export function TableBody({ className, ...props }) {
    return _jsx("div", { role: "rowgroup", ...props, className: cx('lk-table__body', className) });
}
/** One body row. It carries `ROW_CLASS`, so its hover and focus reveal its `RowActions`. */
export function TableRow({ index, stripe, selected = false, className, ...props }) {
    const striped = stripe ?? (index !== undefined && index % 2 === 1);
    return (_jsx("div", { role: "row", "aria-rowindex": index === undefined ? undefined : index + 2, "data-stripe": striped || undefined, "data-selected": selected || undefined, ...props, className: cx('lk-table__row', ROW_CLASS, className) }));
}
export function TableCell({ align = 'start', className, ...props }) {
    return _jsx("div", { role: "cell", ...props, className: cx('lk-table__cell', alignClass(align), className) });
}
/**
 * One context menu for a whole table: wrap the body in `<ContextMenu
 * open onOpenChange>` and `<ContextMenuTrigger>`, and call `openOn(row)` from
 * each row's `onContextMenu`. A virtualised table then mounts one menu, not
 * one per row. A right click on no row (an empty stretch of the body) opens
 * nothing. Long press opens nothing either: it fires no `contextmenu` on the
 * row (inferred from Base UI's touch timer; the apps run on macOS).
 */
export function useRowMenu() {
    // The row's contextmenu handler runs before the trigger's (it bubbles up to
    // it), and the trigger asks to open from its own handler: so the row is
    // waiting here by then, and a click that reached no row finds nothing.
    const pending = useRef(null);
    const [state, setState] = useState({ open: false, row: null });
    const openOn = useCallback((row) => {
        pending.current = { row };
    }, []);
    // A right click on another row while the menu is open asks to open again
    // (Base UI closes on the press outside the popup first; probed in happy-dom).
    const onOpenChange = useCallback((open) => {
        const hit = pending.current;
        pending.current = null;
        if (!open)
            setState((s) => (s.open ? { ...s, open: false } : s));
        else if (hit)
            setState({ open: true, row: hit.row });
    }, []);
    const close = useCallback(() => onOpenChange(false), [onOpenChange]);
    return { row: state.row, open: state.open, onOpenChange, openOn, close };
}

import { type ComponentProps } from 'react';
/** How a cell aligns its content along the row. */
export type TableAlign = 'start' | 'center' | 'end';
export type TableProps = ComponentProps<'div'> & {
    /** Every row, header included, when the app renders only some of them (virtualisation). */
    rowCount?: number;
};
/** The table: name it with `aria-label` or `aria-labelledby`. */
export declare function Table({ rowCount, className, ...props }: TableProps): import("react").JSX.Element;
export type TableHeaderProps = ComponentProps<'div'>;
/** The header row (row 1), which stays put while the body scrolls. Holds `TableHeaderCell`s. */
export declare function TableHeader({ className, children, ...props }: TableHeaderProps): import("react").JSX.Element;
type Aligned = {
    /** Default `start`. */
    align?: TableAlign;
};
export type TableHeaderCellProps = ComponentProps<'div'> & Aligned;
export declare function TableHeaderCell({ align, className, ...props }: TableHeaderCellProps): import("react").JSX.Element;
export type TableBodyProps = ComponentProps<'div'>;
/** The rows' group. Often the app's scroll container: pass its `ref` and `onScroll`. */
export declare function TableBody({ className, ...props }: TableBodyProps): import("react").JSX.Element;
export type TableRowProps = ComponentProps<'div'> & {
    /** The row's place among all body rows (0 for the first), not in the rendered slice. Sets `aria-rowindex`. */
    index?: number;
    /** Paints the tinted band. Default: odd `index`. A grouped view passes the group's parity. */
    stripe?: boolean;
    /** Paints the soft accent over the band. */
    selected?: boolean;
};
/** One body row. It carries `ROW_CLASS`, so its hover and focus reveal its `RowActions`. */
export declare function TableRow({ index, stripe, selected, className, ...props }: TableRowProps): import("react").JSX.Element;
export type TableCellProps = ComponentProps<'div'> & Aligned;
export declare function TableCell({ align, className, ...props }: TableCellProps): import("react").JSX.Element;
export type RowMenu<Row> = {
    /** The row the menu was last opened on (kept while it closes, so its items do not blank out). */
    row: Row | null;
    /** Pass to `<ContextMenu>`. */
    open: boolean;
    /** Pass to `<ContextMenu>`. */
    onOpenChange: (open: boolean) => void;
    /** Call from a row's `onContextMenu`. Stable, so a memoised row can take it as a prop. */
    openOn: (row: Row) => void;
    /** Closes the menu, e.g. after an item's async action settles. */
    close: () => void;
};
/**
 * One context menu for a whole table: wrap the body in `<ContextMenu
 * open onOpenChange>` and `<ContextMenuTrigger>`, and call `openOn(row)` from
 * each row's `onContextMenu`. A virtualised table then mounts one menu, not
 * one per row. A right click on no row (an empty stretch of the body) opens
 * nothing. Long press opens nothing either: it fires no `contextmenu` on the
 * row (inferred from Base UI's touch timer; the apps run on macOS).
 */
export declare function useRowMenu<Row>(): RowMenu<Row>;
export {};

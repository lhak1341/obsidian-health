import { type DayPickerLocale, type DayPickerProps } from '@daypicker/react';
export type CalendarProps = DayPickerProps;
/**
 * A month grid (DayPicker), styled by the kit. Pass DayPicker's props: `mode`, `selected`,
 * `onSelect`, `disabled`, `locale`… A caller's `classNames` join the kit's per slot, and its
 * `components` sit beside the kit's chevron (and may replace it).
 */
export declare function Calendar({ classNames, components, ...props }: CalendarProps): import("react").JSX.Element;
export type DatePickerProps = {
    /** The picked day, or none. */
    value: Date | undefined;
    /** Called with the picked day, or `undefined` when the picked day is clicked again (unless `required`). */
    onValueChange: (value: Date | undefined) => void;
    /** Names the field, e.g. "Due date": the trigger reads "Due date: 14 Nov 2026", the popup "Due date". */
    label: string;
    /** Shown while no day is picked. Default "Pick a date". */
    placeholder?: string;
    /** How the trigger shows the day. Default `{ dateStyle: 'medium' }` in `locale`. */
    format?: Intl.DateTimeFormatOptions;
    /** A DayPicker locale (`@daypicker/react/locale`, e.g. `vi`, `enGB`): the calendar's month
     * and day names and the trigger's text (by its `code`). Default: English, and the runtime's
     * own format on the trigger. */
    locale?: Partial<DayPickerLocale>;
    /** A picked day cannot be cleared. */
    required?: boolean;
    disabled?: boolean;
    /** Days that cannot be picked (DayPicker matchers). */
    disabledDays?: DayPickerProps['disabled'];
    /** The month shown when nothing is picked. Default: today's. */
    defaultMonth?: Date;
    /** Today, for the "today" mark (and tests). Default: now. */
    today?: Date;
    className?: string;
};
/** A button showing the day; it opens a calendar in a popover. */
export declare function DatePicker({ value, onValueChange, label, placeholder, format, locale, required, disabled, disabledDays, defaultMonth, today, className, }: DatePickerProps): import("react").JSX.Element;

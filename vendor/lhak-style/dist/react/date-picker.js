import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Calendar and date picker (SPEC user story 50; kit issue 15): react-day-picker
// 10 (`@daypicker/react`, wayfinder ticket 011) with the kit's classes
// (src/styles/calendar.css) in place of its own stylesheet, so nothing is
// injected (CSP). The picker puts the calendar in the kit's Popover.
//
// Keyboard (DayPicker's grid): arrows move a day or a week, Page Up/Down a
// month, Shift+Page Up/Down a year, Home/End the week's ends; Enter or Space
// picks the day. In the picker, opening focuses the picked day (or today),
// picking closes the popup, and Escape closes it; focus returns to the trigger.
import { DayPicker } from '@daypicker/react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icon.js";
import { Popover, PopoverPopup, PopoverTrigger } from "./popover.js";
const NAV_BUTTON = 'lk-button lk-button--ghost lk-button--icon-only';
/** DayPicker's slots, flags and selection states, as kit classes. Its animation classes are not mapped: the kit does not pass `animate`. */
const CLASS_NAMES = {
    root: 'lk-calendar',
    months: 'lk-calendar__months',
    month: 'lk-calendar__month',
    nav: 'lk-calendar__nav',
    button_previous: NAV_BUTTON,
    button_next: NAV_BUTTON,
    // Rendered but unstyled: the rows need no rule, the Chevron below ignores its class, focus shows by :focus-visible.
    weekdays: '',
    weeks: '',
    week: '',
    footer: '',
    chevron: '',
    month_caption: 'lk-calendar__caption',
    caption_label: 'lk-calendar__caption-label',
    month_grid: 'lk-calendar__grid',
    weekday: 'lk-calendar__weekday',
    day: 'lk-calendar__day',
    day_button: 'lk-calendar__day-button',
    selected: 'lk-calendar__day--selected',
    today: 'lk-calendar__day--today',
    outside: 'lk-calendar__day--outside',
    disabled: 'lk-calendar__day--disabled',
    hidden: 'lk-calendar__day--hidden',
    focused: '',
};
const CHEVRONS = { up: ChevronUp, down: ChevronDown, left: ChevronLeft, right: ChevronRight };
function Chevron({ orientation = 'left' }) {
    return _jsx(Icon, { icon: CHEVRONS[orientation] });
}
/** The kit's class for each slot, joined with the caller's (a caller adds, never replaces). */
function joinClassNames(theirs) {
    if (!theirs)
        return CLASS_NAMES;
    const out = { ...CLASS_NAMES };
    for (const [slot, name] of Object.entries(theirs)) {
        out[slot] = cx(CLASS_NAMES[slot], name) ?? '';
    }
    return out;
}
/**
 * A month grid (DayPicker), styled by the kit. Pass DayPicker's props: `mode`, `selected`,
 * `onSelect`, `disabled`, `locale`… A caller's `classNames` join the kit's per slot, and its
 * `components` sit beside the kit's chevron (and may replace it).
 */
export function Calendar({ classNames, components, ...props }) {
    return (_jsx(DayPicker, { showOutsideDays: true, ...props, classNames: joinClassNames(classNames), components: { Chevron, ...components } }));
}
/** A button showing the day; it opens a calendar in a popover. */
export function DatePicker({ value, onValueChange, label, placeholder = 'Pick a date', format = { dateStyle: 'medium' }, locale, required = false, disabled = false, disabledDays, defaultMonth, today, className, }) {
    const [open, setOpen] = useState(false);
    const text = value ? new Intl.DateTimeFormat(locale?.code, format).format(value) : placeholder;
    const pick = (day) => {
        onValueChange(day);
        setOpen(false);
    };
    // DayPicker types `onSelect` by `required` (a required pick is never undefined), so the
    // two modes are two prop sets; everything else is shared.
    const selection = required
        ? { mode: 'single', required: true, onSelect: (day) => pick(day) }
        : { mode: 'single', onSelect: pick };
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsxs(PopoverTrigger, { disabled: disabled, "aria-label": `${label}: ${text}`, render: _jsx(Button, { className: className }), children: [_jsx(Icon, { icon: CalendarDays }), _jsx("span", { children: text })] }), _jsx(PopoverPopup, { "aria-label": label, children: _jsx(Calendar, { ...selection, autoFocus: true, selected: value, disabled: disabledDays, defaultMonth: value ?? defaultMonth, today: today, locale: locale }) })] }));
}

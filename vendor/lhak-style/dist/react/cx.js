/** Join class names, skipping falsy ones. */
export const cx = (...names) => names.filter(Boolean).join(' ');

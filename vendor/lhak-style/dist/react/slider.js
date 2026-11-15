import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Slider (SPEC user story 40): Base UI's single-thumb Slider with the kit's
// classes (src/styles/slider.css). The thumb holds a native range input,
// which takes focus and the keys (arrows, Shift+arrow for `largeStep`,
// Home, End, PageUp, PageDown).
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cx } from "./cx.js";
export function Slider({ label, 'aria-label': ariaLabel, showValue = false, className, ...root }) {
    const head = label != null || showValue ? (_jsxs("div", { className: "lk-slider__head", children: [label != null && _jsx(BaseSlider.Label, { className: "lk-slider__label", children: label }), showValue && _jsx(BaseSlider.Value, { className: "lk-slider__value" })] })) : null;
    return (_jsxs(BaseSlider.Root, { ...root, className: cx('lk-slider', className), children: [head, _jsx(BaseSlider.Control, { className: "lk-slider__control", children: _jsxs(BaseSlider.Track, { className: "lk-slider__track", children: [_jsx(BaseSlider.Indicator, { className: "lk-slider__indicator" }), _jsx(BaseSlider.Thumb, { "aria-label": ariaLabel, className: "lk-slider__thumb" })] }) })] }));
}

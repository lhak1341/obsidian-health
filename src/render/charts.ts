import type { ResolvedRange, SeriesPoint } from "../core/model";
import { formatRawValue, formatYear } from "./format";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
	return el;
}

function numericPoints(series: SeriesPoint[]): { date: string; value: number }[] {
	return series.filter((point): point is { date: string; value: number } => typeof point.value === "number");
}

export function paddedDomain(values: number[], ratio: number): [number, number] {
	const min = Math.min(...values);
	const max = Math.max(...values);
	const pad = (max - min) * ratio || 1;
	return [min - pad, max + pad];
}

export function scaleX(count: number, x0: number, x1: number): (i: number) => number {
	return (i: number) => x0 + (i * (x1 - x0)) / Math.max(1, count - 1);
}

export function scaleY(min: number, max: number, bottom: number, top: number): (v: number) => number {
	const span = max - min || 1;
	return (v: number) => bottom - ((v - min) / span) * (bottom - top);
}

// `--background-secondary-alt` can compute nearly identical to `--background-primary` in some
// themes, making the reference band invisible. Tinting relative to `--text-faint` instead
// guarantees visible-but-subtle contrast against any background, in either theme.
const BAND_FILL = "color-mix(in srgb, var(--text-faint, #8a8a8a) 16%, transparent)";

function buildBandRect(band: ResolvedRange, y: (v: number) => number, width: number, top: number, bottom: number): SVGRectElement | undefined {
	if (band.low === undefined && band.high === undefined) return undefined;
	const rectTop = band.high !== undefined ? y(band.high) : top;
	const rectBottom = band.low !== undefined ? y(band.low) : bottom;
	return svgEl("rect", { x: 0, y: rectTop.toFixed(1), width, height: Math.max(0, rectBottom - rectTop).toFixed(1), fill: BAND_FILL });
}

function buildSecondaryPath(
	primary: { date: string; value: number }[],
	secondaryPoints: { date: string; value: number }[],
	x: (i: number) => number,
	y: (v: number) => number,
	strokeWidth: number,
): SVGPathElement | undefined {
	const segments = secondaryPoints
		.map((point) => {
			const i = primary.findIndex((p) => p.date === point.date);
			return i < 0 ? null : `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(point.value).toFixed(1)}`;
		})
		.filter((segment): segment is string => segment !== null);
	if (segments.length < 2) return undefined;
	return svgEl("path", { d: segments.join(" "), fill: "none", stroke: "var(--text-faint, #8a8a8a)", "stroke-width": strokeWidth, "stroke-dasharray": "3 2" });
}

export function buildSparkline(series: SeriesPoint[], band: ResolvedRange, dotColor: string, secondary?: SeriesPoint[]): SVGSVGElement {
	const width = 52;
	const height = 20;
	const pad = 2;
	const primary = numericPoints(series);
	const svg = svgEl("svg", { class: "hlth-spk", viewBox: `0 0 ${width} ${height}` });
	if (primary.length === 0) {
		// No numeric reading to place at all (qualitative marker) -- an entirely empty track reads
		// as a big dead gap between the name and value columns. A faint dash gives that stretch some
		// visual weight without implying a trend that isn't there. Right-flush (ending at width-pad,
		// same x as a real trend line's last point) so its end lines up with every other row's
		// sparkline endpoint instead of stopping short in the middle.
		svg.appendChild(svgEl("line", { x1: width - pad - 16, y1: height / 2, x2: width - pad, y2: height / 2, stroke: "var(--text-faint, #8a8a8a)", "stroke-width": 1.3, "stroke-linecap": "round", opacity: 0.5 }));
		return svg;
	}

	if (primary.length === 1) {
		// One reading still places the band + dot -- where it sits inside the reference range is
		// useful on its own, not just a trend that needs a second visit to draw a line between.
		const only = primary[0];
		const allValues = [only.value];
		if (band.low !== undefined) allValues.push(band.low);
		if (band.high !== undefined) allValues.push(band.high);
		const [min, max] = paddedDomain(allValues, 0.18);
		const y = scaleY(min, max, height - pad, pad);

		const bandRect = buildBandRect(band, y, width, pad, height - pad);
		if (bandRect) svg.appendChild(bandRect);

		svg.appendChild(svgEl("circle", { cx: width - pad, cy: y(only.value).toFixed(1), r: 2.4, fill: dotColor }));
		return svg;
	}

	const secondaryPoints = secondary ? numericPoints(secondary) : [];
	const allValues = primary.map((p) => p.value).concat(secondaryPoints.map((p) => p.value));
	if (band.low !== undefined) allValues.push(band.low);
	if (band.high !== undefined) allValues.push(band.high);

	const [min, max] = paddedDomain(allValues, 0.18);
	const x = scaleX(primary.length, pad, width - pad);
	const y = scaleY(min, max, height - pad, pad);

	const bandRect = buildBandRect(band, y, width, pad, height - pad);
	if (bandRect) svg.appendChild(bandRect);

	const secondaryPath = buildSecondaryPath(primary, secondaryPoints, x, y, 1);
	if (secondaryPath) svg.appendChild(secondaryPath);

	const d = primary.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
	svg.appendChild(svgEl("path", { d, fill: "none", stroke: "var(--text-muted, #4a4a4a)", "stroke-width": 1.3, "stroke-linejoin": "round", "stroke-linecap": "round" }));

	const last = primary[primary.length - 1];
	svg.appendChild(svgEl("circle", { cx: x(primary.length - 1).toFixed(1), cy: y(last.value).toFixed(1), r: 2.4, fill: dotColor }));

	return svg;
}

export interface HistoryChartOptions {
	band: ResolvedRange;
	target?: ResolvedRange;
	targetLabel?: string;
	statusColor: string;
	pairFormat?: (primary: number, secondary?: number) => string;
}

export function buildHistoryChart(series: SeriesPoint[], secondary: SeriesPoint[] | undefined, opts: HistoryChartOptions): SVGSVGElement {
	const width = 300;
	const height = 124;
	const padL = 8;
	const padR = 8;
	const padT = 18;
	const padB = 22;

	const primary = numericPoints(series);
	const secondaryPoints = secondary ? numericPoints(secondary) : [];
	const svg = svgEl("svg", { class: "hlth-chart", viewBox: `0 0 ${width} ${height}` });

	const { band, target } = opts;
	const allValues = primary.map((p) => p.value).concat(secondaryPoints.map((p) => p.value));
	if (band.low !== undefined) allValues.push(band.low);
	if (band.high !== undefined) allValues.push(band.high);
	if (target?.low !== undefined) allValues.push(target.low);
	if (target?.high !== undefined) allValues.push(target.high);

	const [min, max] = paddedDomain(allValues, 0.15);
	const x = scaleX(primary.length, padL, width - padR);
	const y = scaleY(min, max, height - padB, padT);

	const bandRect = buildBandRect(band, y, width, padT, height - padB);
	if (bandRect) svg.appendChild(bandRect);

	// A two-bound target (both low and high set) draws a dashed line per bound so the chart
	// matches `targetLabel`'s "low – high" text instead of silently dropping one side -- the label
	// itself is only drawn once, next to the high bound (or the sole bound when only one is set).
	const targetBounds = [target?.low, target?.high].filter((v): v is number => v !== undefined);
	for (const bound of targetBounds) {
		const ty = y(bound);
		svg.appendChild(
			svgEl("line", { x1: 0, y1: ty.toFixed(1), x2: width, y2: ty.toFixed(1), stroke: "var(--color-orange, #ec7500)", "stroke-width": 1, "stroke-dasharray": "4 3", opacity: 0.85 }),
		);
	}
	if (targetBounds.length > 0) {
		const labelValue = targetBounds[targetBounds.length - 1];
		const ty = y(labelValue);
		const label = svgEl("text", { x: width - 4, y: (ty - 4).toFixed(1), "text-anchor": "end", "font-family": "var(--font-monospace, monospace)", "font-size": 9, fill: "var(--color-orange, #ec7500)" });
		label.textContent = opts.targetLabel ?? `target ${formatRawValue(labelValue)}`;
		svg.appendChild(label);
	}

	const secondaryPath = buildSecondaryPath(primary, secondaryPoints, x, y, 1.4);
	if (secondaryPath) svg.appendChild(secondaryPath);

	const linePath = primary.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
	svg.appendChild(svgEl("path", { d: linePath, fill: "none", stroke: "var(--text-muted, #4a4a4a)", "stroke-width": 1.8, "stroke-linejoin": "round", "stroke-linecap": "round" }));

	primary.forEach((point, i) => {
		const last = i === primary.length - 1;
		svg.appendChild(svgEl("circle", { cx: x(i).toFixed(1), cy: y(point.value).toFixed(1), r: last ? 3.4 : 2.4, fill: last ? opts.statusColor : "var(--text-faint, #8a8a8a)" }));

		const tick = svgEl("text", {
			x: last ? width - padR : x(i).toFixed(1),
			y: height - 6,
			"text-anchor": last ? "end" : "middle",
			"font-family": "var(--font-monospace, monospace)",
			"font-size": 9,
			fill: "var(--text-faint, #8a8a8a)",
		});
		tick.textContent = formatYear(point.date);
		svg.appendChild(tick);

		// Every point gets its value labeled, not just the latest -- the latest stands out (bold,
		// status color, right-clamped like its tick) while older points stay small and faint so the
		// trend line itself is still the dominant visual, not a wall of numbers.
		const secondaryAtPoint = secondaryPoints.find((p) => p.date === point.date)?.value;
		const label = svgEl("text", {
			x: last ? Math.min(x(i), width - padR).toFixed(1) : x(i).toFixed(1),
			y: (y(point.value) - 8).toFixed(1),
			"text-anchor": last ? "end" : "middle",
			"font-family": "var(--font-interface, sans-serif)",
			"font-weight": last ? 700 : 500,
			"font-size": last ? 10 : 8.5,
			fill: last ? opts.statusColor : "var(--text-faint, #8a8a8a)",
		});
		label.textContent = opts.pairFormat ? opts.pairFormat(point.value, secondaryAtPoint) : formatRawValue(point.value);
		svg.appendChild(label);
	});

	return svg;
}

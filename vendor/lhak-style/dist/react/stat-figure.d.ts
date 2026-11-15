import { type NumberFlowProps } from '@number-flow/react';
/**
 * NumberFlow's props without its timings. Reduce motion is NumberFlow's own
 * `respectMotionPreference` (on): the number changes without animating.
 */
export type StatFigureProps = Omit<NumberFlowProps, 'transformTiming' | 'spinTiming' | 'opacityTiming' | 'respectMotionPreference'>;
export declare function StatFigure(props: StatFigureProps): import("react").JSX.Element;

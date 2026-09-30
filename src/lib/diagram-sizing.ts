/**
 * Scale math for in-article diagrams: how large a diagram is drawn by default,
 * and how far a reader may zoom it with the resize handle.
 * A scale of 1 is the diagram's natural (designed) size.
 */

export interface DiagramSize {
  width: number;
  height: number;
}

export interface ScaleRange {
  fit: number;
  min: number;
  max: number;
}

const MAX_FIT_HEIGHT = 720;
const MIN_FIT_HEIGHT = 320;
const FIT_VIEWPORT_RATIO = 0.75;
const MIN_HEIGHT = 160;
const KEYBOARD_STEPS_PER_UNIT = 10;

/**
 * `fit` never enlarges: templates are set in 12–24px type, and stretching a narrow one across the
 * column inflates it far past the body text. It shrinks to the column and to three quarters of the
 * viewport, so a diagram never pushes the text around it off screen.
 * Zooming in stops once the diagram fills the column, or at natural size if it is wider than the column.
 */
export function getScaleRange(natural: DiagramSize, availableWidth: number, viewportHeight: number): ScaleRange {
  const heightCap = Math.max(MIN_FIT_HEIGHT, Math.min(MAX_FIT_HEIGHT, viewportHeight * FIT_VIEWPORT_RATIO));
  const fillWidth = availableWidth / natural.width;
  const fit = Math.min(1, fillWidth, heightCap / natural.height);
  return { fit, min: Math.min(fit, MIN_HEIGHT / natural.height), max: Math.max(1, fillWidth) };
}

export function clampScale(scale: number, { min, max }: ScaleRange): number {
  return Math.min(max, Math.max(min, scale));
}

/** Moves to the next 10% mark in `direction`, so keyboard steps land on round percentages. */
export function stepScale(scale: number, direction: 1 | -1, range: ScaleRange): number {
  const steps = scale * KEYBOARD_STEPS_PER_UNIT;
  const next = direction > 0 ? Math.floor(steps + 1e-6) + 1 : Math.ceil(steps - 1e-6) - 1;
  return clampScale(next / KEYBOARD_STEPS_PER_UNIT, range);
}

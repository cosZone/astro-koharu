/**
 * Spring physics for sliding indicators (the nav pill, the segmented thumb).
 *
 * An indicator is modelled by its center and width, each on its own spring, so retargeting
 * mid-flight keeps its momentum. While it moves it stretches in proportion to its speed, leaning
 * toward where it is heading; the stretch is capped relative to its width, so a long jump reads
 * as a quick elongated glide instead of smearing across the bar, and it melts away on arrival.
 */

export interface Span {
  left: number;
  right: number;
}

export interface Spring {
  stiffness: number;
  damping: number;
}

export interface GlideFeel {
  center: Spring;
  width: Spring;
  /** Extra length in px per px/s of center speed. */
  stretch: number;
  /** Upper bound of the extra length, as a fraction of the current width. */
  maxStretch: number;
}

export interface GlideState {
  center: number;
  centerVelocity: number;
  width: number;
  widthVelocity: number;
}

export const GLIDE_FEELS = {
  /** Snappy with a barely visible settle and a liquid stretch in flight. */
  lively: {
    center: { stiffness: 520, damping: 37 },
    width: { stiffness: 520, damping: 42 },
    stretch: 0.02,
    maxStretch: 0.25,
  },
  /** Critically damped, rigid glide. */
  subtle: {
    center: { stiffness: 420, damping: 41 },
    width: { stiffness: 420, damping: 41 },
    stretch: 0,
    maxStretch: 0,
  },
} as const satisfies Record<string, GlideFeel>;

const STEP_SECONDS = 1 / 240;
const MAX_ELAPSED_SECONDS = 1 / 15;
const REST_DISTANCE = 0.25;
const REST_SPEED = 4;
const STRETCH_LEAN = 0.7;

export function glideAt(span: Span): GlideState {
  return { center: (span.left + span.right) / 2, centerVelocity: 0, width: span.right - span.left, widthVelocity: 0 };
}

/**
 * Advance both springs by `elapsedMs` toward `target` using fixed semi-implicit Euler steps.
 * Long frames (a background tab, a stalled main thread) are clamped so the pill never teleports
 * through a huge integration step.
 */
export function stepGlide(state: GlideState, target: Span, feel: GlideFeel, elapsedMs: number): GlideState {
  const targetCenter = (target.left + target.right) / 2;
  const targetWidth = target.right - target.left;
  const elapsed = Math.min(Math.max(elapsedMs, 0) / 1000, MAX_ELAPSED_SECONDS);
  const steps = Math.max(1, Math.round(elapsed / STEP_SECONDS));
  const dt = elapsed / steps;
  let { center, centerVelocity, width, widthVelocity } = state;
  for (let i = 0; i < steps; i++) {
    centerVelocity += (feel.center.stiffness * (targetCenter - center) - feel.center.damping * centerVelocity) * dt;
    center += centerVelocity * dt;
    widthVelocity += (feel.width.stiffness * (targetWidth - width) - feel.width.damping * widthVelocity) * dt;
    width += widthVelocity * dt;
  }
  return { center, centerVelocity, width, widthVelocity };
}

export function isGlideAtRest(state: GlideState, target: Span): boolean {
  return (
    Math.abs(state.center - (target.left + target.right) / 2) < REST_DISTANCE &&
    Math.abs(state.width - (target.right - target.left)) < REST_DISTANCE &&
    Math.abs(state.centerVelocity) < REST_SPEED &&
    Math.abs(state.widthVelocity) < REST_SPEED
  );
}

/** Edges to paint for `state`, stretched along the direction of travel. */
export function glideSpan(state: GlideState, feel: GlideFeel): Span {
  const width = Math.max(state.width, 0);
  const stretch = Math.min(Math.abs(state.centerVelocity) * feel.stretch, width * feel.maxStretch);
  const ahead = stretch * STRETCH_LEAN;
  const behind = stretch - ahead;
  const half = width / 2;
  return state.centerVelocity >= 0
    ? { left: state.center - half - behind, right: state.center + half + ahead }
    : { left: state.center - half - ahead, right: state.center + half + behind };
}

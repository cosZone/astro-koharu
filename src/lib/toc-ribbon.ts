/**
 * Geometry of the TOC ribbon — pure, DOM-free.
 *
 * The ribbon runs down each row's lane and steps between lanes with rounded folds placed in the
 * gap between two rows, so a row's own stretch of ribbon is straight and lies inside the row.
 * Along with the SVG path it keeps a sampled lookup table, so the per-frame glide maps lengths to
 * points (and y to lengths) without querying the SVG.
 */

export interface RibbonRow {
  /** Lane x of the row */
  x: number;
  top: number;
  bottom: number;
}

export interface RibbonPoint {
  x: number;
  y: number;
}

export interface Ribbon {
  /** SVG path data */
  d: string;
  length: number;
  /** Ribbon length at each row's top and bottom edge */
  starts: number[];
  ends: number[];
  pointAt(length: number): RibbonPoint;
  lengthAt(y: number): number;
}

const FOLD_RADIUS = 6;
/** How far the ribbon runs past the last row */
const TAIL = 4;
const CURVE_STEPS = 8;

/** Index of the first entry not below `value` in an ascending list, clamped to the last index */
function lowerBound(values: number[], value: number): number {
  let low = 0;
  let high = values.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Builds the ribbon through `rows`, which must be in visual order with non-overlapping boxes. */
export function buildRibbon(rows: RibbonRow[]): Ribbon {
  const xs: number[] = [];
  const ys: number[] = [];
  const lengths: number[] = [];
  const commands: string[] = [];

  const sample = (x: number, y: number) => {
    const last = xs.length - 1;
    lengths.push(last < 0 ? 0 : lengths[last] + Math.hypot(x - xs[last], y - ys[last]));
    xs.push(x);
    ys.push(y);
  };
  const line = (x: number, y: number) => {
    commands.push(`L ${x} ${y}`);
    sample(x, y);
  };
  const curve = (cx: number, cy: number, x: number, y: number) => {
    commands.push(`Q ${cx} ${cy} ${x} ${y}`);
    const x0 = xs[xs.length - 1];
    const y0 = ys[ys.length - 1];
    for (let step = 1; step <= CURVE_STEPS; step++) {
      const t = step / CURVE_STEPS;
      const u = 1 - t;
      sample(u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y);
    }
  };

  if (rows.length > 0) {
    commands.push(`M ${rows[0].x} ${rows[0].top}`);
    sample(rows[0].x, rows[0].top);
  }
  for (let index = 1; index < rows.length; index++) {
    const from = rows[index - 1];
    const to = rows[index];
    const delta = to.x - from.x;
    if (Math.abs(delta) < 0.5) continue;
    // A fold never climbs above where the ribbon already is: a section still unfolding can leave
    // almost no room between two folds, which then shrink down to a square step.
    const y = ys[ys.length - 1];
    const middle = Math.max((from.bottom + Math.max(to.top, from.bottom)) / 2, y);
    const radius = Math.min(FOLD_RADIUS, Math.abs(delta) / 2, middle - y);
    const direction = Math.sign(delta);
    line(from.x, middle - radius);
    if (radius > 0.5) {
      curve(from.x, middle, from.x + direction * radius, middle);
      line(to.x - direction * radius, middle);
      curve(to.x, middle, to.x, middle + radius);
    } else {
      line(to.x, middle);
    }
  }
  const last = rows.at(-1);
  if (last) line(last.x, Math.max(last.bottom, ys[ys.length - 1]) + TAIL);

  const length = lengths.at(-1) ?? 0;

  const pointAt = (at: number): RibbonPoint => {
    if (xs.length === 0) return { x: 0, y: 0 };
    const index = lowerBound(lengths, at);
    if (index === 0 || lengths[index] < at) return { x: xs[index], y: ys[index] };
    const span = lengths[index] - lengths[index - 1];
    const t = span > 0 ? (at - lengths[index - 1]) / span : 1;
    return { x: xs[index - 1] + (xs[index] - xs[index - 1]) * t, y: ys[index - 1] + (ys[index] - ys[index - 1]) * t };
  };

  const lengthAt = (y: number): number => {
    if (ys.length === 0) return 0;
    const index = lowerBound(ys, y);
    if (index === 0 || ys[index] < y) return lengths[index];
    const span = ys[index] - ys[index - 1];
    const t = span > 0 ? (y - ys[index - 1]) / span : 0;
    return lengths[index - 1] + (lengths[index] - lengths[index - 1]) * t;
  };

  return {
    d: commands.join(' '),
    length,
    starts: rows.map((row) => lengthAt(row.top)),
    ends: rows.map((row) => lengthAt(row.bottom)),
    pointAt,
    lengthAt,
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRibbon } from './toc-ribbon';

const near = (actual: number, expected: number, tolerance = 0.05) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

/** chapter, two subsections one lane in, then the next chapter */
const rows = [
  { x: 10, top: 0, bottom: 38 },
  { x: 26, top: 46, bottom: 78 },
  { x: 26, top: 78, bottom: 110 },
  { x: 10, top: 118, bottom: 156 },
];

test('an empty ribbon has no path and maps everything to its origin', () => {
  const ribbon = buildRibbon([]);
  assert.equal(ribbon.d, '');
  assert.equal(ribbon.length, 0);
  assert.deepEqual(ribbon.pointAt(10), { x: 0, y: 0 });
  assert.equal(ribbon.lengthAt(10), 0);
});

test('a single row runs straight down its lane past the bottom edge', () => {
  const ribbon = buildRibbon([{ x: 10, top: 0, bottom: 38 }]);
  assert.equal(ribbon.d, 'M 10 0 L 10 42');
  assert.equal(ribbon.length, 42);
  assert.deepEqual(ribbon.starts, [0]);
  assert.deepEqual(ribbon.ends, [38]);
});

test('rows keep their own straight stretch and fold only in the gaps', () => {
  const ribbon = buildRibbon(rows);
  assert.match(ribbon.d, /^M 10 0 L 10 36 Q 10 42 16 42 L 20 42 Q 26 42 26 48 L 26 108 Q 26 114 20 114/);
  for (const [index, row] of rows.entries()) {
    const start = ribbon.pointAt(ribbon.starts[index]);
    const end = ribbon.pointAt(ribbon.ends[index]);
    near(start.y, row.top);
    near(end.y, row.bottom);
    // Away from the fold ends, the row's stretch is in its lane
    near(ribbon.pointAt((ribbon.starts[index] + ribbon.ends[index]) / 2).x, row.x);
  }
});

test('each row picks up where the previous one ends', () => {
  const ribbon = buildRibbon(rows);
  for (let index = 1; index < rows.length; index++) {
    assert.ok(ribbon.starts[index] >= ribbon.ends[index - 1]);
  }
  // Rows that touch share an edge
  near(ribbon.starts[2], ribbon.ends[1]);
});

test('lengths and points round-trip along the whole ribbon', () => {
  const ribbon = buildRibbon(rows);
  for (let length = 0; length <= ribbon.length; length += 3) {
    const point = ribbon.pointAt(length);
    const back = ribbon.lengthAt(point.y);
    // A y on a horizontal run maps to the start of the run, so compare positions, not lengths
    near(ribbon.pointAt(back).y, point.y);
  }
});

test('the ribbon never climbs, even when folds have no room between them', () => {
  const squeezed = buildRibbon([
    { x: 10, top: 0, bottom: 38 },
    { x: 26, top: 40, bottom: 41 },
    { x: 10, top: 42, bottom: 80 },
  ]);
  let previous = Number.NEGATIVE_INFINITY;
  for (let length = 0; length <= squeezed.length; length += 0.5) {
    const { y } = squeezed.pointAt(length);
    assert.ok(y >= previous - 1e-9, `ribbon climbs at length ${length}`);
    previous = y;
  }
});

test('lengths outside the ribbon clamp to its ends', () => {
  const ribbon = buildRibbon(rows);
  assert.deepEqual(ribbon.pointAt(-5), { x: 10, y: 0 });
  assert.deepEqual(ribbon.pointAt(ribbon.length + 5), { x: 10, y: 160 });
  assert.equal(ribbon.lengthAt(-20), 0);
  assert.equal(ribbon.lengthAt(500), ribbon.length);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { containBox, flipFromOrigin, intersectsViewport } from './lightbox-flip';

const stage = { centerX: 500, centerY: 400, maxWidth: 900, maxHeight: 640 };

test('containBox letterboxes a tall image inside a wide box', () => {
  const box = containBox({ left: 0, top: 0, width: 400, height: 200 }, 100, 200);
  assert.deepEqual(box, { left: 150, top: 0, width: 100, height: 200 });
});

test('containBox leaves the box alone for unknown natural sizes', () => {
  const input = { left: 10, top: 20, width: 300, height: 200 };
  assert.deepEqual(containBox(input, 0, 0), input);
});

test('an origin already at the final lightbox box needs no transform', () => {
  // 800×400 natural fits the stage unscaled, centered at (500, 400).
  const flip = flipFromOrigin({ left: 100, top: 200, width: 800, height: 400 }, 800, 400, stage);
  assert.deepEqual(flip, { x: 0, y: 0, scale: 1 });
});

test('the transform moves the center onto the origin and scales to its width', () => {
  // 1800×900 natural is fitted to 900×450 by the stage's max width.
  const flip = flipFromOrigin({ left: 0, top: 0, width: 300, height: 150 }, 1800, 900, stage);
  assert.deepEqual(flip, { x: -350, y: -325, scale: 300 / 900 });
});

test('small images are never upscaled by the stage', () => {
  const flip = flipFromOrigin({ left: 450, top: 375, width: 100, height: 50 }, 200, 100, stage);
  assert.deepEqual(flip, { x: 0, y: 0, scale: 0.5 });
});

test('degenerate inputs yield no transform', () => {
  assert.equal(flipFromOrigin({ left: 0, top: 0, width: 0, height: 0 }, 100, 100, stage), null);
  assert.equal(flipFromOrigin({ left: 0, top: 0, width: 100, height: 100 }, 0, 100, stage), null);
});

test('intersectsViewport detects boxes fully outside the viewport', () => {
  assert.equal(intersectsViewport({ left: 10, top: 10, width: 50, height: 50 }, 800, 600), true);
  assert.equal(intersectsViewport({ left: 10, top: -80, width: 50, height: 50 }, 800, 600), false);
  assert.equal(intersectsViewport({ left: 10, top: 700, width: 50, height: 50 }, 800, 600), false);
});

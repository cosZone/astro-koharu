import assert from 'node:assert/strict';
import test from 'node:test';
import { clampScale, getScaleRange, stepScale } from './diagram-sizing';

const COLUMN = 910;
const VIEWPORT = 900;

test('getScaleRange keeps a narrow diagram at natural size instead of stretching it across the column', () => {
  const range = getScaleRange({ width: 423, height: 524 }, COLUMN, VIEWPORT);
  assert.equal(range.fit, 1);
  assert.equal(range.max, COLUMN / 423);
  assert.equal(range.min, 160 / 524);
});

test('getScaleRange shrinks a wide diagram to the column and lets it zoom back to natural size', () => {
  const range = getScaleRange({ width: 3315, height: 526 }, COLUMN, VIEWPORT);
  assert.equal(range.fit, COLUMN / 3315);
  assert.equal(range.min, range.fit);
  assert.equal(range.max, 1);
});

test('getScaleRange caps a tall diagram at three quarters of the viewport', () => {
  const range = getScaleRange({ width: 400, height: 1500 }, COLUMN, VIEWPORT);
  assert.equal(range.fit, (VIEWPORT * 0.75) / 1500);
  assert.equal(range.min, 160 / 1500);
});

test('getScaleRange bounds the height cap on very large and very short viewports', () => {
  const tall = { width: 400, height: 1500 };
  assert.equal(getScaleRange(tall, COLUMN, 2000).fit, 720 / 1500);
  assert.equal(getScaleRange(tall, COLUMN, 390).fit, 320 / 1500);
});

test('getScaleRange never lets min exceed fit for short diagrams', () => {
  const range = getScaleRange({ width: 676, height: 142 }, COLUMN, VIEWPORT);
  assert.equal(range.fit, 1);
  assert.equal(range.min, 1);
});

test('clampScale keeps a scale inside the range', () => {
  const range = { fit: 1, min: 0.5, max: 2 };
  assert.equal(clampScale(0.1, range), 0.5);
  assert.equal(clampScale(1.4, range), 1.4);
  assert.equal(clampScale(3, range), 2);
});

test('stepScale moves to the next 10% mark and stays in range', () => {
  const range = { fit: 1, min: 0.25, max: 2 };
  assert.equal(stepScale(0.86, 1, range), 0.9);
  assert.equal(stepScale(0.86, -1, range), 0.8);
  assert.equal(stepScale(0.9, 1, range), 1);
  assert.equal(stepScale(0.3, -1, range), 0.25);
  assert.equal(stepScale(1.95, 1, range), 2);
});

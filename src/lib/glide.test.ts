import assert from 'node:assert/strict';
import test from 'node:test';
import { GLIDE_FEELS, type GlideFeel, type GlideState, glideAt, glideSpan, isGlideAtRest, type Span, stepGlide } from './glide';

const FRAME_MS = 1000 / 60;

function run(from: Span, to: Span, feel: GlideFeel, maxMs = 1500) {
  let state = glideAt(from);
  const startCenter = (from.left + from.right) / 2;
  const distance = (to.left + to.right) / 2 - startCenter;
  let elapsed = 0;
  let overshoot = 0;
  let longest = 0;
  while (elapsed < maxMs) {
    state = stepGlide(state, to, feel, FRAME_MS);
    elapsed += FRAME_MS;
    const span = glideSpan(state, feel);
    longest = Math.max(longest, span.right - span.left);
    overshoot = Math.max(overshoot, (state.center - startCenter - distance) * Math.sign(distance));
    if (isGlideAtRest(state, to)) return { state, elapsed, overshoot, longest };
  }
  return { state, elapsed: Number.POSITIVE_INFINITY, overshoot, longest };
}

const near = { left: 0, right: 80 };
const next = { left: 90, right: 170 };
const far = { left: 400, right: 470 };

test('glideAt rests on the span it starts from', () => {
  assert.deepEqual(glideAt(next), { center: 130, centerVelocity: 0, width: 80, widthVelocity: 0 });
  assert.deepEqual(glideSpan(glideAt(next), GLIDE_FEELS.lively), next);
});

test('both feels settle on the target well within half a second', () => {
  for (const feel of Object.values(GLIDE_FEELS)) {
    for (const target of [next, far]) {
      const { state, elapsed } = run(near, target, feel);
      assert.ok(elapsed < 550, `settled after ${elapsed}ms`);
      assert.ok(Math.abs(state.center - (target.left + target.right) / 2) < 0.25);
    }
  }
});

test('the subtle glide never overshoots or stretches', () => {
  const { overshoot, longest } = run(near, far, GLIDE_FEELS.subtle);
  assert.ok(overshoot <= 0.01, `overshoot ${overshoot}px`);
  assert.ok(longest <= 80 + 1e-9, `longest ${longest}px`);
});

test('the lively glide settles with at most a hairline of overshoot', () => {
  for (const target of [next, far]) {
    const distance = (target.left + target.right) / 2 - 40;
    const { overshoot } = run(near, target, GLIDE_FEELS.lively);
    assert.ok(overshoot > 0 && overshoot < distance * 0.01, `overshoot ${overshoot}px over ${distance}px`);
  }
});

test('the lively stretch is capped relative to the width however far it travels', () => {
  const { longest } = run(near, { left: 2000, right: 2080 }, GLIDE_FEELS.lively);
  assert.ok(longest <= 80 * (1 + GLIDE_FEELS.lively.maxStretch) + 1e-9, `longest ${longest}px`);
  assert.ok(longest > 90, 'a long glide visibly stretches');
});

test('the stretch leans toward the direction of travel', () => {
  const moving: GlideState = { center: 100, centerVelocity: 500, width: 80, widthVelocity: 0 };
  const right = glideSpan(moving, GLIDE_FEELS.lively);
  assert.ok(right.right - 140 > 60 - right.left, 'leading edge reaches further ahead');
  const left = glideSpan({ ...moving, centerVelocity: -500 }, GLIDE_FEELS.lively);
  assert.ok(60 - left.left > left.right - 140, 'mirrored when moving left');
});

test('retargeting mid-flight keeps the momentum', () => {
  let state = glideAt(near);
  for (let i = 0; i < 4; i++) state = stepGlide(state, far, GLIDE_FEELS.lively, FRAME_MS);
  const retargeted = stepGlide(state, next, GLIDE_FEELS.lively, 0.001);
  assert.ok(Math.abs(retargeted.centerVelocity - state.centerVelocity) < 1);
  assert.ok(retargeted.centerVelocity > 0);
});

test('a stalled frame is clamped instead of integrating a huge step', () => {
  const stalled = stepGlide(glideAt(near), far, GLIDE_FEELS.lively, 5000);
  const clamped = stepGlide(glideAt(near), far, GLIDE_FEELS.lively, 1000 / 15);
  assert.deepEqual(stalled, clamped);
  assert.ok(Number.isFinite(stalled.center) && stalled.center < 435);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundLightboxTransform,
  clampLightboxScale,
  LIGHTBOX_IDENTITY,
  lightboxPanBounds,
  pointDistance,
  pointMidpoint,
  resolveLightboxSwipe,
  zoomLightboxAt,
} from './lightbox-gestures';

const geometry = { viewportWidth: 400, viewportHeight: 600, imageWidth: 360, imageHeight: 480, rotation: 0 };

test('scale stays within the fitted image and 500%, including invalid input', () => {
  assert.equal(clampLightboxScale(0.5), 1);
  assert.equal(clampLightboxScale(9), 5);
  assert.equal(clampLightboxScale(Number.NaN), 1);
});

test('zooming at an off-center point keeps the same image pixel under that point', () => {
  const zoom = zoomLightboxAt({ scale: 2, translateX: 20, translateY: -10 }, 4, { x: 100, y: 50 });
  assert.deepEqual(zoom, { scale: 4, translateX: -60, translateY: -70 });
  assert.equal((100 - zoom.translateX) / zoom.scale, (100 - 20) / 2);
  assert.equal((50 - zoom.translateY) / zoom.scale, (50 + 10) / 2);
});

test('pinching follows the midpoint as well as the distance between fingers', () => {
  const startA = { x: -100, y: 0 };
  const startB = { x: 100, y: 0 };
  const nextA = { x: -150, y: 80 };
  const nextB = { x: 250, y: 80 };
  const scale = pointDistance(nextA, nextB) / pointDistance(startA, startB);
  assert.deepEqual(zoomLightboxAt(LIGHTBOX_IDENTITY, scale, pointMidpoint(startA, startB), pointMidpoint(nextA, nextB)), {
    scale: 2,
    translateX: 50,
    translateY: 80,
  });
});

test('pan is bounded by image edges and recentered on any axis that still fits', () => {
  assert.deepEqual(boundLightboxTransform({ scale: 2, translateX: 1000, translateY: -1000 }, geometry), {
    scale: 2,
    translateX: 160,
    translateY: -180,
  });
  assert.equal(boundLightboxTransform({ scale: 1, translateX: 50, translateY: 60 }, geometry), LIGHTBOX_IDENTITY);
  assert.deepEqual(boundLightboxTransform({ scale: 2, translateX: 20, translateY: 50 }, { ...geometry, imageWidth: 100 }), {
    scale: 2,
    translateX: 0,
    translateY: 50,
  });
});

test('rotation swaps the pan bounds for a non-square image', () => {
  const bounds = lightboxPanBounds(2, { ...geometry, rotation: 90 });
  assert.ok(Math.abs(bounds.x - 280) < 0.001);
  assert.ok(Math.abs(bounds.y - 60) < 0.001);
});

test('slow horizontal swipes navigate in the finger direction and quick short flicks also work', () => {
  const viewport = { width: 400, height: 600 };
  assert.deepEqual(resolveLightboxSwipe({ x: -100, y: 10 }, 500, viewport), { type: 'navigate', direction: 1 });
  assert.deepEqual(resolveLightboxSwipe({ x: 40, y: 0 }, 60, viewport), { type: 'navigate', direction: -1 });
  assert.equal(resolveLightboxSwipe({ x: 40, y: 0 }, 500, viewport), null);
});

test('only a deliberate downward swipe dismisses; diagonal, upward and tiny motion do nothing', () => {
  const viewport = { width: 400, height: 600 };
  assert.deepEqual(resolveLightboxSwipe({ x: 5, y: 120 }, 500, viewport), { type: 'dismiss' });
  assert.deepEqual(resolveLightboxSwipe({ x: 0, y: 40 }, 60, viewport), { type: 'dismiss' });
  assert.equal(resolveLightboxSwipe({ x: 0, y: -200 }, 100, viewport), null);
  assert.equal(resolveLightboxSwipe({ x: 100, y: 100 }, 100, viewport), null);
  assert.equal(resolveLightboxSwipe({ x: 5, y: 5 }, 1, viewport), null);
});

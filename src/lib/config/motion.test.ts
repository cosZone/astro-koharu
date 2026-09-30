import assert from 'node:assert/strict';
import test from 'node:test';
import { isMotionLevel, MOTION_DEFAULTS, normalizeMotionConfig } from './motion';

test('an absent section resolves to the lively defaults', () => {
  assert.deepEqual(normalizeMotionConfig(undefined), MOTION_DEFAULTS);
  assert.deepEqual(normalizeMotionConfig(null), MOTION_DEFAULTS);
  assert.deepEqual(normalizeMotionConfig({}), MOTION_DEFAULTS);
  assert.equal(MOTION_DEFAULTS.level, 'lively');
});

test('defaults are applied per field', () => {
  const resolved = normalizeMotionConfig({ level: 'subtle' });
  assert.equal(resolved.level, 'subtle');
  assert.equal(resolved.heroPetals, true);
  assert.equal(resolved.clickBurst, true);
});

test('explicit false disables the sakura effects', () => {
  const resolved = normalizeMotionConfig({ heroPetals: false, clickBurst: false });
  assert.equal(resolved.heroPetals, false);
  assert.equal(resolved.clickBurst, false);
});

test('unknown levels and wrongly typed flags fall back to the default', () => {
  const resolved = normalizeMotionConfig({ level: 'wild', heroPetals: 'yes', clickBurst: 1 } as never);
  assert.deepEqual(resolved, MOTION_DEFAULTS);
});

test('isMotionLevel accepts exactly the three levels', () => {
  for (const level of ['lively', 'subtle', 'reduced']) assert.equal(isMotionLevel(level), true);
  for (const value of ['off', '', null, undefined, 1]) assert.equal(isMotionLevel(value), false);
});

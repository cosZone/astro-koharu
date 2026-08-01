import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT_DEFAULTS, normalizeContentConfig } from './content';

test('an absent section resolves to the full default table', () => {
  assert.deepEqual(normalizeContentConfig(undefined), CONTENT_DEFAULTS);
  assert.deepEqual(normalizeContentConfig(null), CONTENT_DEFAULTS);
  assert.deepEqual(normalizeContentConfig({}), CONTENT_DEFAULTS);
});

test('defaults are applied per field, not per section', () => {
  const resolved = normalizeContentConfig({ enableMath: false });
  assert.equal(resolved.enableMath, false);
  assert.equal(resolved.addBlankTarget, true);
  assert.equal(resolved.enhanceCodeBlock, true);
  assert.equal(resolved.previewCacheTime, 30);
  assert.equal(resolved.postCardImagePosition, 'alternating');
});

test('shoka features default on and encrypted blocks default off', () => {
  const resolved = normalizeContentConfig({});
  assert.equal(resolved.enableShokaContainers, true);
  assert.equal(resolved.enableShokaEffects, true);
  assert.equal(resolved.enableShokaHexoTags, true);
  assert.equal(resolved.enableQuiz, true);
  assert.equal(resolved.enableEncryptedBlock, false);
});

test('explicit false wins for every boolean flag', () => {
  const allFalse = Object.fromEntries(
    Object.entries(CONTENT_DEFAULTS).flatMap(([key, value]) => (typeof value === 'boolean' ? [[key, false]] : [])),
  );
  const resolved = normalizeContentConfig(allFalse);
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'boolean') assert.equal(value, false, `${key} should be false`);
  }
});

test('wrongly typed values fall back to the default', () => {
  const resolved = normalizeContentConfig({
    enableMath: 'yes',
    previewCacheTime: '30',
    postCardImagePosition: 'middle',
  } as never);
  assert.equal(resolved.enableMath, true);
  assert.equal(resolved.previewCacheTime, 30);
  assert.equal(resolved.postCardImagePosition, 'alternating');
});

test('accepts valid overrides for non-boolean fields', () => {
  const resolved = normalizeContentConfig({ previewCacheTime: 0, postCardImagePosition: 'left' });
  assert.equal(resolved.previewCacheTime, 0);
  assert.equal(resolved.postCardImagePosition, 'left');
});

test('negative cache times are rejected', () => {
  assert.equal(normalizeContentConfig({ previewCacheTime: -1 }).previewCacheTime, 30);
});

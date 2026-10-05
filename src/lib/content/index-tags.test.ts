import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tagTier, tierTags } from './index-tags';

test('log tiers keep a few staple tags prominent and the long tail calm', () => {
  assert.deepEqual(
    [1, 2, 4, 5, 8, 12, 26, 35, 61].map((count) => tagTier(count, 61)),
    [0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
});
test('equal counts share a tier, name breaks ties, empty and uniform clouds are safe', () => {
  assert.deepEqual(tierTags({}), []);
  assert.deepEqual(
    tierTags({ z: 1, a: 1 }).map(({ tag, tier }) => [tag, tier]),
    [
      ['a', 0],
      ['z', 0],
    ],
  );
  assert.deepEqual(
    tierTags({ z: 5, a: 5 }).map(({ tag, tier }) => [tag, tier]),
    [
      ['a', 4],
      ['z', 4],
    ],
  );
  assert.deepEqual(
    tierTags({ a: 2, b: 2, c: 20 }).map(({ tier }) => tier),
    [4, 1, 1],
  );
});

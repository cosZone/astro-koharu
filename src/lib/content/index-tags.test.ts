import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tierTags } from './index-tags';

test('quantile tiers give repeated tags weight while keeping singletons in tier zero', () => {
  const input = { single: 1, a: 2, b: 3, c: 4, d: 5, e: 6, f: 7, g: 8, h: 9 };
  assert.deepEqual(
    tierTags(input).map(({ count, tier }) => [count, tier]),
    [
      [9, 4],
      [8, 4],
      [7, 3],
      [6, 3],
      [5, 2],
      [4, 2],
      [3, 1],
      [2, 1],
      [1, 0],
    ],
  );
  assert.equal(input.a, 2);
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
      ['a', 2],
      ['z', 2],
    ],
  );
  assert.deepEqual(
    tierTags({ a: 2, b: 2, c: 20 }).map(({ tier }) => tier),
    [4, 1, 1],
  );
});

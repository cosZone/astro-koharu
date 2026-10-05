import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bucketPostsByMonth, groupPostsByYear, monthIntensity } from './index-groups';

const post = (id: string, date: string) => ({ id, data: { date: new Date(date) } });
test('buckets follow site timezone at year/month boundaries and keep newest first', () => {
  const posts = [
    post('old', '2023-12-31T15:59:59Z'),
    post('new', '2023-12-31T16:00:00Z'),
    post('latest', '2024-01-03T00:00:00Z'),
  ];
  const buckets = bucketPostsByMonth(posts, 'Asia/Shanghai');
  assert.deepEqual(
    buckets.map(({ key, posts }) => [key, posts.map(({ id }) => id)]),
    [
      ['2024-01', ['latest', 'new']],
      ['2023-12', ['old']],
    ],
  );
  assert.deepEqual(
    posts.map(({ id }) => id),
    ['old', 'new', 'latest'],
  );
  assert.deepEqual(
    groupPostsByYear(posts, 'Asia/Shanghai').map(({ year, posts }) => [year, posts.length]),
    [
      [2024, 2],
      [2023, 1],
    ],
  );
  assert.deepEqual(bucketPostsByMonth([], 'UTC'), []);
  assert.deepEqual(groupPostsByYear([], 'UTC'), []);
});
test('monthly intensity has five bounded tiers, including zero and a single post', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 5, 6, 10, 13, 34, 99].map((count) => monthIntensity(count, 37)),
    [0, 1, 1, 2, 2, 3, 3, 4, 4, 4],
  );
  assert.equal(monthIntensity(1, 1), 4);
  assert.equal(monthIntensity(5, 0), 0);
});

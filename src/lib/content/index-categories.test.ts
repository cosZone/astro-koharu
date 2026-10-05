import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryTrail, postsInCategoryPath } from './index-categories';

test('category paths include descendants but distinguish branches with the same leaf name', () => {
  const posts = [
    { data: { categories: [['Notes', 'Web', 'React']] } },
    { data: { categories: [['Work', 'Web']] } },
    { data: { categories: ['Tools'] } },
    { data: {} },
  ];
  assert.equal(postsInCategoryPath(posts, ['Notes']).length, 1);
  assert.equal(postsInCategoryPath(posts, ['Notes', 'Web']).length, 1);
  assert.equal(postsInCategoryPath(posts, ['Tools']).length, 1);
  assert.equal(postsInCategoryPath(posts, ['Web']).length, 0);
  assert.equal(postsInCategoryPath(posts, []).length, 0);
  assert.equal(posts.length, 4);
});
test('breadcrumb ancestry includes every level and has a safe missing-category result', () => {
  const tree = [{ name: 'Notes', children: [{ name: 'Web', children: [{ name: 'React' }] }] }];
  assert.deepEqual(categoryTrail(tree, 'React'), ['Notes', 'Web', 'React']);
  assert.deepEqual(categoryTrail(tree, 'Notes'), ['Notes']);
  assert.deepEqual(categoryTrail(tree, 'Missing'), []);
});

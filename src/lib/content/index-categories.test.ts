import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryAtPath, postsInCategoryPath } from './index-categories';

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
test('category routing resolves the full ancestry when different branches share names', () => {
  const firstWeb = { name: 'Web', children: [{ name: 'React' }] };
  const secondWeb = { name: 'Web', children: [{ name: 'CSS' }] };
  const tree = [
    { name: 'Notes', children: [firstWeb] },
    { name: 'Work', children: [secondWeb] },
  ];
  assert.equal(categoryAtPath(tree, ['Notes', 'Web']), firstWeb);
  assert.equal(categoryAtPath(tree, ['Work', 'Web']), secondWeb);
  assert.equal(categoryAtPath(tree, ['Work', 'Web', 'CSS']), secondWeb.children[0]);
  assert.equal(categoryAtPath(tree, ['Work', 'Web', 'React']), null);
  assert.equal(categoryAtPath(tree, ['Web']), null);
  assert.equal(categoryAtPath(tree, []), null);
});

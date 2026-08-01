import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHeadingTree, collectExpandableIds, getSiblingIds, type Heading, revealPath } from './toc';

/**
 * h2 a
 *   h3 a1
 *     h4 a1x
 *   h3 a2
 *     h4 a2x
 * h2 b
 *   h3 b1
 * h2 c
 */
const flat = [
  { id: 'a', text: 'A', level: 2 },
  { id: 'a1', text: 'A1', level: 3 },
  { id: 'a1x', text: 'A1x', level: 4 },
  { id: 'a2', text: 'A2', level: 3 },
  { id: 'a2x', text: 'A2x', level: 4 },
  { id: 'b', text: 'B', level: 2 },
  { id: 'b1', text: 'B1', level: 3 },
  { id: 'c', text: 'C', level: 2 },
];

const tree = (): Heading[] => buildHeadingTree(flat);

const ids = (set: Set<string>) => [...set].sort();

test('buildHeadingTree nests by level and links parents', () => {
  const headings = tree();
  assert.deepEqual(
    headings.map((h) => h.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    headings[0].children.map((h) => h.id),
    ['a1', 'a2'],
  );
  assert.equal(headings[0].children[0].children[0].id, 'a1x');
  assert.equal(headings[0].children[0].parent?.id, 'a');
  assert.equal(headings[2].children.length, 0);
});

test('getSiblingIds only reports siblings that own children', () => {
  const headings = tree();
  assert.deepEqual(getSiblingIds(headings[0], headings), ['b']);
  assert.deepEqual(getSiblingIds(headings[0].children[0], headings), ['a2']);
  assert.deepEqual(getSiblingIds(headings[2], headings), ['a', 'b']);
});

test('revealPath opens the full ancestor path of a nested target', () => {
  assert.deepEqual(ids(revealPath(tree(), 'a1x', new Set())), ['a', 'a1']);
});

test('revealPath opens the target itself when it has children', () => {
  assert.deepEqual(ids(revealPath(tree(), 'a1', new Set())), ['a', 'a1']);
});

test('revealPath closes child-bearing siblings at every level it touches', () => {
  const next = revealPath(tree(), 'a2x', new Set(['a', 'a1', 'b']));
  assert.deepEqual(ids(next), ['a', 'a2']);
});

test('revealPath keeps unrelated expanded branches that are not siblings on the path', () => {
  const headings = tree();
  const next = revealPath(headings, 'b1', new Set(['a', 'a1']));
  // `a` is a sibling of `b` and gets closed; `a1` is not on any touched level
  assert.deepEqual(ids(next), ['a1', 'b']);
});

test('revealPath is idempotent and preserves reference identity', () => {
  const headings = tree();
  const first = revealPath(headings, 'a1x', new Set());
  const second = revealPath(headings, 'a1x', first);
  assert.equal(second, first);
});

test('a childless top-level target is a no-op', () => {
  const headings = tree();
  const current = new Set(['a', 'a1']);
  assert.equal(revealPath(headings, 'c', current), current);
});

test('a childless nested target opens its ancestors but not itself', () => {
  assert.deepEqual(ids(revealPath(tree(), 'b1', new Set())), ['b']);
  assert.deepEqual(ids(revealPath(tree(), 'a1x', new Set())), ['a', 'a1']);
});

test('an unknown target is a no-op', () => {
  const headings = tree();
  const current = new Set(['a']);
  assert.equal(revealPath(headings, 'missing', current), current);
  assert.equal(revealPath(headings, '', current), current);
});

test('revealPath on an empty tree is a no-op', () => {
  const current = new Set<string>();
  assert.equal(revealPath([], 'a', current), current);
});

test('collectExpandableIds returns every heading that owns children', () => {
  assert.deepEqual(ids(collectExpandableIds(tree())), ['a', 'a1', 'a2', 'b']);
  assert.equal(collectExpandableIds([]).size, 0);
});

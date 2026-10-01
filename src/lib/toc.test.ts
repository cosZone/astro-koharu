import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHeadingTree,
  chapterIndexOf,
  collectExpandableIds,
  flattenHeadings,
  getSiblingIds,
  type Heading,
  locateReading,
  readingLineAt,
  revealPath,
  stripRepeatedOrdinal,
  tocNumberLabel,
} from './toc';

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

test('a childless top-level target closes the other chapters', () => {
  const headings = tree();
  // `a1` sits inside the closed chapter, as with any branch off the touched levels
  assert.deepEqual(ids(revealPath(headings, 'c', new Set(['a', 'a1']))), ['a1']);
  assert.deepEqual(ids(revealPath(headings, 'c', new Set(['a', 'b']))), []);
});

test('a childless top-level target keeps the reference when no chapter is open', () => {
  const headings = tree();
  const current = new Set(['a1']);
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

test('flattenHeadings lists every heading in document order', () => {
  assert.deepEqual(
    flattenHeadings(tree()).map((h) => h.id),
    flat.map((h) => h.id),
  );
});

test('chapterIndexOf reports the top-level section of any heading', () => {
  const headings = tree();
  assert.equal(chapterIndexOf(headings, 'a'), 1);
  assert.equal(chapterIndexOf(headings, 'a2x'), 1);
  assert.equal(chapterIndexOf(headings, 'b1'), 2);
  assert.equal(chapterIndexOf(headings, 'c'), 3);
});

test('tocNumberLabel pads chapters and dots subsections', () => {
  assert.equal(tocNumberLabel([6]), '06');
  assert.equal(tocNumberLabel([12]), '12');
  assert.equal(tocNumberLabel([6, 1]), '6.1');
  assert.equal(tocNumberLabel([2, 3, 4]), '2.3.4');
  assert.equal(tocNumberLabel([]), '');
});

test('stripRepeatedOrdinal drops an ordinal that repeats the TOC number', () => {
  assert.equal(stripRepeatedOrdinal('1. Markdown 插件配置开始弃用', 1), 'Markdown 插件配置开始弃用');
  assert.equal(stripRepeatedOrdinal('3、总结', 3), '总结');
  assert.equal(stripRepeatedOrdinal('2) Setup', 2), 'Setup');
  assert.equal(stripRepeatedOrdinal('4：配置', 4), '配置');
  assert.equal(stripRepeatedOrdinal(' 1. Intro', 1), 'Intro');
  assert.equal(stripRepeatedOrdinal('1.总结', 1), '总结');
  assert.equal(stripRepeatedOrdinal('2．はじめに', 2), 'はじめに');
});

test('stripRepeatedOrdinal keeps every other leading number', () => {
  assert.equal(stripRepeatedOrdinal('2. react-tweet', 1), '2. react-tweet');
  assert.equal(stripRepeatedOrdinal('10. Foo', 1), '10. Foo');
  assert.equal(stripRepeatedOrdinal('1.5 版本说明', 1), '1.5 版本说明');
  assert.equal(stripRepeatedOrdinal('1 Password', 1), '1 Password');
  assert.equal(stripRepeatedOrdinal('1.', 1), '1.');
  // Versions, file names and times start with a number that is not an ordinal
  assert.equal(stripRepeatedOrdinal('2.x 迁移指南', 2), '2.x 迁移指南');
  assert.equal(stripRepeatedOrdinal('3.js 入门', 3), '3.js 入门');
  assert.equal(stripRepeatedOrdinal('1.Intro', 1), '1.Intro');
  assert.equal(stripRepeatedOrdinal('2:30 会议', 2), '2:30 会议');
});

test('chapterIndexOf is 0 for an unknown heading or an empty tree', () => {
  assert.equal(chapterIndexOf(tree(), 'missing'), 0);
  assert.equal(chapterIndexOf([], 'a'), 0);
});

test('readingLineAt rides the offset line until the last screen of scroll', () => {
  // viewport 800, document scrolls to 3000
  assert.equal(readingLineAt(0, 800, 3000, 120), 120);
  assert.equal(readingLineAt(2200, 800, 3000, 120), 2320);
});

test('readingLineAt sweeps to the viewport bottom over the last screen', () => {
  assert.equal(readingLineAt(2600, 800, 3000, 120), 2600 + 120 + 340);
  assert.equal(readingLineAt(3000, 800, 3000, 120), 3800);
});

test('readingLineAt treats a page that cannot scroll as fully in view', () => {
  assert.equal(readingLineAt(0, 800, 0, 120), 800);
});

const starts = [100, 400, 1000];
const end = 1600;

test('locateReading is -1 above the first section', () => {
  assert.deepEqual(locateReading(starts, end, 50), { index: -1, progress: 0 });
  assert.deepEqual(locateReading([], end, 500), { index: -1, progress: 0 });
});

test('locateReading reports the fraction of the current section above the line', () => {
  assert.deepEqual(locateReading(starts, end, 250), { index: 0, progress: 0.5 });
  assert.deepEqual(locateReading(starts, end, 400), { index: 1, progress: 0 });
  assert.deepEqual(locateReading(starts, end, 1300), { index: 2, progress: 0.5 });
});

test('locateReading clamps the last section at the end of the article', () => {
  assert.deepEqual(locateReading(starts, end, 2000), { index: 2, progress: 1 });
});

test('locateReading counts an empty section as read', () => {
  assert.deepEqual(locateReading([100, 100], 300, 100), { index: 1, progress: 0 });
  assert.deepEqual(locateReading([100], 100, 100), { index: 0, progress: 1 });
});

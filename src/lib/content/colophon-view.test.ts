import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeColophonConfig } from '../config/colophon';
import { resolvePostColophon } from './colophon';
import { colophonFilterChips, colophonSealRows, resolveMarkFilter, rowHasMark } from './colophon-view';

const config = normalizeColophonConfig({
  groups: {
    authorship: { label: '执笔', exclusive: true },
    notice: { label: '阅读提示' },
  },
  marks: {
    handwritten: { group: 'authorship', icon: 'ri:quill-pen-line', label: '手写' },
    spoiler: { group: 'notice', icon: 'ri:eye-off-line', label: '含剧透' },
    outdated: { group: 'notice', icon: 'ri:hourglass-line', label: '可能已过时' },
    'late-night': { icon: 'ri:moon-clear-line', label: '深夜写的' },
  },
});

test('seal rows group marks by first appearance and keep ungrouped marks in a trailing unlabeled row', () => {
  const { items } = resolvePostColophon(
    [
      'spoiler',
      'late-night',
      { id: 'handwritten', note: '一个字一个字敲的' },
      'outdated',
      { icon: 'fa6-solid:cat', label: '猫猫审阅过' },
    ],
    config,
  );
  assert.deepEqual(colophonSealRows(items), [
    { label: '阅读提示', marks: [{ label: '含剧透' }, { label: '可能已过时' }] },
    { label: '执笔', marks: [{ label: '手写', note: '一个字一个字敲的' }] },
    { marks: [{ label: '深夜写的' }, { label: '猫猫审阅过' }] },
  ]);
  assert.deepEqual(colophonSealRows([]), []);
});

test('filter chips list only carried marks in dictionary order with per-post counts', () => {
  const chips = colophonFilterChips(config.marks, [['outdated', 'handwritten'], [], ['outdated', 'outdated'], ['gone']]);
  assert.deepEqual(chips, [
    { id: 'handwritten', icon: 'ri:quill-pen-line', label: '手写', count: 1 },
    { id: 'outdated', icon: 'ri:hourglass-line', label: '可能已过时', count: 2 },
  ]);
  assert.deepEqual(colophonFilterChips(config.marks, [[], []]), []);
});

test('mark filter accepts only available ids', () => {
  assert.equal(resolveMarkFilter('spoiler', ['spoiler']), 'spoiler');
  assert.equal(resolveMarkFilter(' spoiler ', ['spoiler']), 'spoiler');
  assert.equal(resolveMarkFilter('gone', ['spoiler']), '');
  assert.equal(resolveMarkFilter(null, ['spoiler']), '');
});

test('rows match a mark by exact id, and every row matches no filter', () => {
  assert.equal(rowHasMark('ai-cowrite spoiler', 'spoiler'), true);
  assert.equal(rowHasMark('ai-cowrite', 'ai'), false);
  assert.equal(rowHasMark(undefined, 'spoiler'), false);
  assert.equal(rowHasMark(undefined, ''), true);
});

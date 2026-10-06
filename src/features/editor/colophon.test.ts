import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeColophonConfig } from '@lib/config/colophon';
import { customColophonCount, type EditorColophonGroup, selectExclusiveColophon, toggleColophonMark } from './colophon';
import { buildEditorColophon, resolveBundledIcon } from './colophon-dictionary';
import { parseEditorDocument, updateEditorList } from './document';

const authorship: EditorColophonGroup = {
  id: 'authorship',
  label: '执笔',
  exclusive: true,
  marks: [
    { id: 'handwritten', label: '手写' },
    { id: 'ai-lead', label: 'AI 主笔' },
  ],
};
const notice: EditorColophonGroup = {
  id: 'notice',
  label: '提示',
  exclusive: false,
  marks: [{ id: 'spoiler', label: '含剧透' }],
};

function apply(source: string, edit: Parameters<typeof updateEditorList>[2]) {
  return updateEditorList(source, 'colophon', edit);
}

test('exclusive groups replace the sibling in place and keep notes, one-off entries and comments', () => {
  const source = [
    '---',
    'title: 甲 # 标题注释',
    'colophon:',
    '  - id: spoiler',
    '    note: 第三季 # 剧透说明',
    '  - handwritten',
    '  - { icon: ri:cup-line, label: 一口气写完 }',
    '---',
    '正文',
  ].join('\n');
  const data = parseEditorDocument(source).data;
  const switched = apply(source, selectExclusiveColophon(data.colophon, authorship, 'ai-lead'));
  assert.deepEqual(parseEditorDocument(switched).data.colophon, [
    { id: 'spoiler', note: '第三季' },
    'ai-lead',
    { icon: 'ri:cup-line', label: '一口气写完' },
  ]);
  assert.match(switched, /# 剧透说明/);
  assert.match(switched, /# 标题注释/);
  assert.match(switched, /\{ icon: ri:cup-line, label: 一口气写完 \}/);
  assert.equal(parseEditorDocument(switched).body, '正文');

  const cleared = apply(switched, selectExclusiveColophon(parseEditorDocument(switched).data.colophon, authorship, null));
  assert.deepEqual(parseEditorDocument(cleared).data.colophon, [
    { id: 'spoiler', note: '第三季' },
    { icon: 'ri:cup-line', label: '一口气写完' },
  ]);
});

test('re-selecting the active exclusive mark keeps its note', () => {
  const value = [{ id: 'handwritten', note: '凌晨' }];
  assert.deepEqual(selectExclusiveColophon(value, authorship, 'handwritten'), { remove: [] });
});

test('toggles append plain ids, remove every reference, and drop the key once empty', () => {
  const source = '---\ntitle: 甲\ntags: []\n---\n';
  const added = apply(source, toggleColophonMark(undefined, 'spoiler'));
  assert.deepEqual(parseEditorDocument(added).data.colophon, ['spoiler']);
  const flow = '---\ncolophon: [handwritten, spoiler, { id: spoiler, note: 再次 }]\ntitle: 甲\n---\n';
  const removed = apply(flow, toggleColophonMark(parseEditorDocument(flow).data.colophon, 'spoiler'));
  assert.equal(removed, '---\ncolophon: [ handwritten ]\ntitle: 甲\n---\n');
  const emptied = apply(removed, toggleColophonMark(['handwritten'], 'handwritten'));
  assert.equal(emptied, '---\ntitle: 甲\n---\n');
});

test('a scalar colophon value is treated as a one-entry list', () => {
  const source = '---\ncolophon: handwritten\n---\n';
  const edited = apply(source, toggleColophonMark('handwritten', 'spoiler'));
  assert.deepEqual(parseEditorDocument(edited).data.colophon, ['handwritten', 'spoiler']);
});

test('entries outside the dictionary are counted for the panel note', () => {
  assert.equal(
    customColophonCount(
      ['handwritten', 'retired', { icon: 'ri:cup-line', label: '杯' }, { id: 'spoiler' }],
      [authorship, notice],
    ),
    2,
  );
});

test('the site dictionary is grouped for the panel with offline icon bodies', () => {
  const config = normalizeColophonConfig({
    groups: { authorship: { label: '执笔', exclusive: true }, empty: { label: '空' } },
    marks: {
      handwritten: { group: 'authorship', icon: 'ri:quill-pen-line', label: '手写', description: '自己敲的' },
      loose: { icon: 'ri:cup-line', label: '一口气' },
    },
  });
  const groups = buildEditorColophon(config);
  assert.deepEqual(
    groups.map((group) => [group.id, group.exclusive, group.marks.map((mark) => mark.id)]),
    [
      ['authorship', true, ['handwritten']],
      ['', false, ['loose']],
    ],
  );
  assert.match(groups[0].marks[0].icon?.body ?? '', /<path/);
  assert.equal(groups[0].marks[0].description, '自己敲的');
  assert.equal(groups[0].defaultLabel, undefined);
  assert.equal(buildEditorColophon({ ...config, defaults: ['handwritten'] })[0].defaultLabel, '手写');
  assert.deepEqual(buildEditorColophon(normalizeColophonConfig({ enabled: false })), []);
  assert.equal(resolveBundledIcon('ri:not-an-icon'), undefined);
  assert.equal(resolveBundledIcon('unknown:icon'), undefined);
});

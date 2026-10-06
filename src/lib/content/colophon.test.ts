import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeColophonConfig } from '../config/colophon';
import { colophonItemsAt, colophonMarkIds, FALLBACK_COLOPHON_ICON, resolvePostColophon } from './colophon';

const config = normalizeColophonConfig({
  groups: {
    authorship: { label: '执笔', exclusive: true, placement: ['meta', 'seal', 'card'] },
    notice: { label: '阅读提示', placement: ['meta', 'banner'] },
  },
  marks: {
    handwritten: { group: 'authorship', icon: 'ri:quill-pen-line', label: '手写' },
    'ai-cowrite': { group: 'authorship', icon: 'ri:sparkling-2-line', label: '与 AI 合写', description: '我主笔。' },
    spoiler: { group: 'notice', icon: 'ri:eye-off-line', label: '含剧透', tone: 'warn' },
  },
});

test('posts without colophon, or a disabled config, resolve to nothing', () => {
  assert.deepEqual(resolvePostColophon(undefined, config), { items: [], warnings: [] });
  assert.deepEqual(resolvePostColophon([], config), { items: [], warnings: [] });
  assert.deepEqual(resolvePostColophon(['spoiler'], normalizeColophonConfig(undefined)), { items: [], warnings: [] });
});

test('resolves ids and notes in frontmatter order, carrying group and dictionary fields', () => {
  const { items, warnings } = resolvePostColophon(
    [{ id: 'spoiler', note: ' 含《我推的孩子》第二季剧透 ' }, 'ai-cowrite', 'spoiler'],
    config,
  );
  assert.deepEqual(warnings, []);
  assert.deepEqual(
    items.map((item) => [item.id, item.group?.id, item.note, item.tone]),
    [
      ['spoiler', 'notice', '含《我推的孩子》第二季剧透', 'warn'],
      ['ai-cowrite', 'authorship', undefined, 'muted'],
    ],
  );
  assert.equal(items[1].description, '我主笔。');
});

test('unknown ids and exclusive conflicts are skipped with warnings', () => {
  const { items, warnings } = resolvePostColophon(['ai-cowrite', 'handwritten', 'typo'], config);
  assert.deepEqual(colophonMarkIds(items), ['ai-cowrite']);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /exclusive and already has "ai-cowrite"/);
  assert.match(warnings[1], /unknown colophon mark "typo"/);
});

test('one-off marks get stable ids, default placement and a fallback for unusable icons', () => {
  const { items, warnings } = resolvePostColophon(
    [
      'handwritten',
      { icon: 'fa6-solid:cat', label: '猫猫审阅过', note: '踩过键盘' },
      { icon: 'mdi:cat', label: '橘猫', placement: 'seal' },
      { icon: 'ri:eye-line', label: ' ' },
    ],
    config,
  );
  assert.deepEqual(
    items.map((item) => [item.id, item.custom, item.icon, item.placement]),
    [
      ['handwritten', false, 'ri:quill-pen-line', ['meta', 'seal', 'card']],
      ['custom-1', true, 'fa6-solid:cat', ['meta', 'seal']],
      ['custom-2', true, FALLBACK_COLOPHON_ICON, ['seal']],
    ],
  );
  assert.equal(items[1].note, '踩过键盘');
  assert.equal(warnings.length, 2);
  assert.deepEqual(colophonMarkIds(items), ['handwritten']);
});

test('defaults fill empty groups ahead of the post marks; colophon: [] opts out', () => {
  const withDefault = { ...config, defaults: ['handwritten'] };
  const ids = (entries?: Parameters<typeof resolvePostColophon>[0]) =>
    resolvePostColophon(entries, withDefault).items.map((item) => item.id);
  assert.deepEqual(ids(undefined), ['handwritten']);
  assert.deepEqual(ids(['spoiler']), ['handwritten', 'spoiler']);
  assert.deepEqual(ids(['ai-cowrite', 'spoiler']), ['ai-cowrite', 'spoiler']);
  assert.deepEqual(ids([{ id: 'handwritten', note: '纸笔' }]), ['handwritten']);
  assert.deepEqual(ids([]), []);
  assert.deepEqual(resolvePostColophon(undefined, { ...withDefault, enabled: false }).items, []);
});

test('filters items by placement', () => {
  const { items } = resolvePostColophon(['handwritten', 'spoiler'], config);
  assert.deepEqual(
    colophonItemsAt(items, 'banner').map((item) => item.id),
    ['spoiler'],
  );
  assert.deepEqual(
    colophonItemsAt(items, 'card').map((item) => item.id),
    ['handwritten'],
  );
});

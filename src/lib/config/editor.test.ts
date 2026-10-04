import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEditorConfig, resolveEditorNavigation } from './editor';
import type { RouterItem, WritingRoomConfig } from './types';

test('writing room requires explicit opt-in, including configs from before the switch existed', () => {
  for (const raw of [undefined, {}, { enabled: false }]) {
    assert.deepEqual(normalizeEditorConfig(raw), { enabled: false });
  }
  assert.deepEqual(normalizeEditorConfig({ enabled: true }), { enabled: true });
});

test('invalid editor settings fail instead of accidentally enabling the writing room', () => {
  for (const raw of [null, [], true, { enabled: 'false' }, { enabled: 1 }]) {
    assert.throws(() => normalizeEditorConfig(raw as unknown as WritingRoomConfig), /Editor configuration error/);
  }
});

test('disabled editor removes old direct links and empty groups without changing unrelated navigation', () => {
  const items: RouterItem[] = [
    { name: '首页', path: '/' },
    { name: '写作室', path: '/editor/', localeIndependent: true },
    { name: '编辑', children: [{ name: '预览', path: '/editor/preview?mode=article' }] },
    {
      name: '工具',
      children: [
        { name: '写作室', path: '/editor' },
        { name: '歌单', path: '/music' },
      ],
    },
    { name: '外部写作室', path: 'https://example.com/editor' },
    { name: '教程', path: '/editor-guide' },
  ];
  const snapshot = structuredClone(items);
  const result = resolveEditorNavigation(items, { enabled: false });
  assert.deepEqual(
    result.map((item) => item.name),
    ['首页', '工具', '外部写作室', '教程'],
  );
  assert.deepEqual(
    result[1].children?.map((item) => item.path),
    ['/music'],
  );
  assert.deepEqual(items, snapshot);
});

test('enabled editor preserves customized navigation and locale-independent links', () => {
  const items: RouterItem[] = [{ name: '我的写作室', path: '/editor', icon: 'ri:edit-box-line', localeIndependent: true }];
  assert.deepEqual(resolveEditorNavigation(items, { enabled: true }), items);
});

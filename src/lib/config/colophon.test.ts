import assert from 'node:assert/strict';
import test from 'node:test';
import { localizeColophonConfig, normalizeColophonConfig } from './colophon';
import { isOpenInEditorAvailable, normalizePostActionsConfig, POST_ACTIONS_DEFAULTS } from './post-actions';

const raw = {
  groups: {
    authorship: { label: '执笔', exclusive: true, placement: ['meta', 'seal', 'card'] },
    notice: { label: '阅读提示', placement: 'banner' },
  },
  marks: {
    handwritten: { group: 'authorship', icon: 'ri:quill-pen-line', label: '手写', description: '自己写的。' },
    spoiler: { group: 'notice', icon: 'ri:eye-off-line', label: '含剧透', tone: 'warn', placement: ['meta', 'banner'] },
    loose: { icon: 'fa6-solid:cat', label: '猫' },
  },
};

test('a missing or disabled section turns every colophon surface off', () => {
  for (const value of [undefined, null, { enabled: false, marks: { x: { icon: 'nope', label: 'x' } } }]) {
    assert.deepEqual(normalizeColophonConfig(value), { enabled: false, groups: [], marks: [], defaults: [] });
  }
});

test('keeps YAML key order and resolves placement from mark, then group, then default', () => {
  const config = normalizeColophonConfig(raw);
  assert.equal(config.enabled, true);
  assert.deepEqual(
    config.groups.map((group) => [group.id, group.exclusive, group.placement]),
    [
      ['authorship', true, ['meta', 'seal', 'card']],
      ['notice', false, ['banner']],
    ],
  );
  assert.deepEqual(
    config.marks.map((mark) => [mark.id, mark.tone, mark.placement]),
    [
      ['handwritten', 'muted', ['meta', 'seal', 'card']],
      ['spoiler', 'warn', ['meta', 'banner']],
      ['loose', 'muted', ['meta', 'seal']],
    ],
  );
  assert.equal(config.marks[0].description, '自己写的。');
  assert.equal('group' in config.marks[2], false);
});

test('rejects icons that astro-icon cannot bundle', () => {
  for (const icon of ['mdi:cat', 'cat', 'ri:', 'ri:a:b']) {
    assert.throws(() => normalizeColophonConfig({ marks: { x: { icon, label: 'x' } } }), /is not available/);
  }
});

test('rejects malformed groups and marks', () => {
  assert.throws(() => normalizeColophonConfig([]), /must be an object/);
  assert.throws(() => normalizeColophonConfig({ enabled: 'yes' }), /must be a boolean/);
  assert.throws(() => normalizeColophonConfig({ groups: [] }), /"groups" must be a map/);
  assert.throws(() => normalizeColophonConfig({ marks: [] }), /"marks" must be a map/);
  assert.throws(() => normalizeColophonConfig({ groups: { g: { label: ' ' } } }), /non-empty string/);
  assert.throws(() => normalizeColophonConfig({ groups: { g: { label: 'g', exclusive: 1 } } }), /must be a boolean/);
  assert.throws(
    () => normalizeColophonConfig({ marks: { x: { icon: 'ri:eye-line', label: 'x', group: 'nope' } } }),
    /unknown group/,
  );
  assert.throws(() => normalizeColophonConfig({ marks: { x: { icon: 'ri:eye-line', label: 'x', tone: 'loud' } } }), /tone/);
  assert.throws(
    () => normalizeColophonConfig({ marks: { x: { icon: 'ri:eye-line', label: 'x', placement: ['footer'] } } }),
    /must be one of/,
  );
});

test('defaults must reference known marks, at most one per group', () => {
  assert.deepEqual(normalizeColophonConfig({ ...raw, defaults: ['handwritten', 'handwritten'] }).defaults, ['handwritten']);
  assert.deepEqual(normalizeColophonConfig({ ...raw, defaults: 'loose' }).defaults, ['loose']);
  assert.deepEqual(normalizeColophonConfig(raw).defaults, []);
  assert.throws(() => normalizeColophonConfig({ ...raw, defaults: ['nope'] }), /unknown mark "nope"/);
  const twoAuthors = {
    ...raw,
    marks: { ...raw.marks, other: { group: 'authorship', icon: 'ri:eye-line', label: '另一个' } },
    defaults: ['handwritten', 'other'],
  };
  assert.throws(() => normalizeColophonConfig(twoAuthors), /more than one mark of group "authorship"/);
});

test('localization overrides labels and keeps untranslated text', () => {
  const config = normalizeColophonConfig(raw);
  const en = localizeColophonConfig(config, {
    groups: { authorship: 'Written by' },
    marks: { handwritten: { label: 'Handwritten' }, spoiler: { description: 'Later plot points.' } },
  });
  assert.equal(en.groups[0].label, 'Written by');
  assert.equal(en.groups[1].label, '阅读提示');
  assert.deepEqual([en.marks[0].label, en.marks[0].description], ['Handwritten', '自己写的。']);
  assert.deepEqual([en.marks[1].label, en.marks[1].description], ['含剧透', 'Later plot points.']);
  assert.equal(localizeColophonConfig(config, undefined), config);
});

test('post actions apply field defaults and validate modes', () => {
  assert.deepEqual(normalizePostActionsConfig(undefined), POST_ACTIONS_DEFAULTS);
  assert.deepEqual(normalizePostActionsConfig({ copyMarkdown: false, openInEditor: 'everyone' }), {
    copyMarkdown: false,
    downloadMarkdown: true,
    openInEditor: 'everyone',
  });
  assert.throws(() => normalizePostActionsConfig({ openInEditor: true }), /must be one of/);
  assert.throws(() => normalizePostActionsConfig({ downloadMarkdown: 'no' }), /must be a boolean/);
  assert.throws(() => normalizePostActionsConfig([]), /must be an object/);
});

test('open in writing room needs the editor and respects the mode', () => {
  const everyone = normalizePostActionsConfig({ openInEditor: 'everyone' });
  const dev = normalizePostActionsConfig({ openInEditor: 'dev' });
  const off = normalizePostActionsConfig({ openInEditor: 'off' });
  assert.equal(isOpenInEditorAvailable(everyone, false, true), false);
  assert.equal(isOpenInEditorAvailable(everyone, true, false), true);
  assert.equal(isOpenInEditorAvailable(dev, true, false), false);
  assert.equal(isOpenInEditorAvailable(dev, true, true), true);
  assert.equal(isOpenInEditorAvailable(off, true, true), false);
});

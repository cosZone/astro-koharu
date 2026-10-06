import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeColophonConfig } from '../../../src/lib/config/colophon';
import { collectColophon, getColophonChoiceSteps } from './colophon-choices';
import { generatePostFrontmatter } from './new-operations';

const config = normalizeColophonConfig({
  groups: {
    authorship: { label: '执笔', exclusive: true },
    notice: { label: '阅读提示' },
    empty: { label: '空', exclusive: true },
  },
  marks: {
    handwritten: { group: 'authorship', icon: 'ri:quill-pen-line', label: '手写', description: '自己敲的' },
    'ai-lead': { group: 'authorship', icon: 'ri:sparkling-2-fill', label: 'AI 主笔' },
    spoiler: { group: 'notice', icon: 'ri:eye-off-line', label: '含剧透' },
    'late-night': { icon: 'ri:moon-clear-line', label: '深夜写的' },
  },
});

test('exclusive groups become single choices and the rest one multi-select', () => {
  const steps = getColophonChoiceSteps(config);
  assert.deepEqual(
    steps.map((step) => [step.id, step.label, step.exclusive, step.options.map((option) => option.label)]),
    [
      ['colophon-group:authorship', '落款 · 执笔', true, ['手写', 'AI 主笔']],
      ['colophon-marks', '落款 · 其他标记', false, ['阅读提示 / 含剧透', '深夜写的']],
    ],
  );
  assert.equal(steps[0].options[0].hint, '自己敲的');
  assert.deepEqual(getColophonChoiceSteps(normalizeColophonConfig(undefined)), []);
});

test('a single non-exclusive group names the multi-select after itself', () => {
  const steps = getColophonChoiceSteps(
    normalizeColophonConfig({
      groups: { notice: { label: '阅读提示' } },
      marks: { spoiler: { group: 'notice', icon: 'ri:eye-off-line', label: '含剧透' } },
    }),
  );
  assert.deepEqual(
    steps.map((step) => [step.label, step.options.map((option) => option.label)]),
    [['落款 · 阅读提示', ['含剧透']]],
  );
});

test('picks are collected in step order, ignoring stale ids, and written only when chosen', () => {
  const steps = getColophonChoiceSteps(config);
  const colophon = collectColophon(steps, {
    'colophon-marks': ['late-night', 'spoiler', 'gone'],
    'colophon-group:authorship': ['handwritten'],
  });
  assert.deepEqual(colophon, ['handwritten', 'late-night', 'spoiler']);

  const base = { title: '甲', categories: '随笔', tags: [], draft: false };
  assert.match(
    generatePostFrontmatter({ ...base, colophon }),
    /\ncolophon:\n {2}- handwritten\n {2}- late-night\n {2}- spoiler\n/,
  );
  assert.doesNotMatch(generatePostFrontmatter({ ...base, colophon: [] }), /colophon/);
  assert.doesNotMatch(generatePostFrontmatter(base), /colophon/);
});

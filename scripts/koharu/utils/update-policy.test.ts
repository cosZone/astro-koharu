import assert from 'node:assert/strict';
import test from 'node:test';

import { USER_CONTENT_PREFIXES } from '../constants/backup';
import {
  classifyConflicts,
  decideDowngrade,
  isUserContentPath,
  normalizeTag,
  parseCommits,
  parseConflictStatusLines,
  parseRevListCounts,
  planCleanRemovals,
  planConflictResolution,
  planStrategyCommands,
  resolveConflictOutcome,
  resolveTargetRef,
  selectUpdateStrategy,
  type UpdateStrategy,
} from './update-policy';

const PREFIXES = ['src/content/blog', 'config', 'public/img'];

test('the real backup contract classifies posts and config as user content', () => {
  assert.ok(USER_CONTENT_PREFIXES.includes('src/content/blog'));
  assert.ok(USER_CONTENT_PREFIXES.includes('config'));
  assert.equal(isUserContentPath('src/content/blog/post.md', USER_CONTENT_PREFIXES), true);
  assert.equal(isUserContentPath('src/components/Post.tsx', USER_CONTENT_PREFIXES), false);
});

test('user content paths match whole segments only', () => {
  const cases: Array<[string, boolean]> = [
    ['config', true],
    ['config/site.yaml', true],
    ['configuration/site.yaml', false],
    ['src/content/blog', true],
    ['src/content/blog/note/a.md', true],
    ['src/content/blog-archive/a.md', false],
    ['package.json', false],
  ];

  for (const [filePath, expected] of cases) {
    assert.equal(isUserContentPath(filePath, PREFIXES), expected, filePath);
  }
});

test('strategy selection prefers rebase, then downgrade, then clean', () => {
  const cases: Array<{ input: Parameters<typeof selectUpdateStrategy>[0]; expected: UpdateStrategy }> = [
    { input: { normalizedTag: null }, expected: 'merge' },
    { input: { normalizedTag: null, clean: true }, expected: 'clean' },
    { input: { normalizedTag: 'v1.0.0', isDowngrade: true }, expected: 'downgrade' },
    { input: { normalizedTag: 'v1.0.0', isDowngrade: true, clean: true }, expected: 'downgrade' },
    { input: { normalizedTag: 'v1.0.0', isDowngrade: true, rebase: true }, expected: 'rebase' },
    { input: { normalizedTag: null, rebase: true, clean: true }, expected: 'rebase' },
    // A downgrade without an explicit tag has no ref to check out.
    { input: { normalizedTag: null, isDowngrade: true }, expected: 'merge' },
  ];

  for (const { input, expected } of cases) {
    assert.equal(selectUpdateStrategy(input), expected, JSON.stringify(input));
  }
});

test('downgrade detection requires an explicit tag that HEAD is ahead of', () => {
  const cases: Array<{ normalizedTag: string | null; aheadCount: number; behindCount: number; expected: boolean }> = [
    { normalizedTag: 'v1.0.0', aheadCount: 3, behindCount: 0, expected: true },
    { normalizedTag: 'v1.0.0', aheadCount: 3, behindCount: 2, expected: false },
    { normalizedTag: 'v1.0.0', aheadCount: 0, behindCount: 0, expected: false },
    { normalizedTag: null, aheadCount: 3, behindCount: 0, expected: false },
  ];

  for (const { expected, ...input } of cases) {
    assert.equal(decideDowngrade(input), expected, JSON.stringify(input));
  }
});

test('target ref falls back to upstream main and normalizes tags', () => {
  assert.deepEqual(resolveTargetRef(), { normalizedTag: null, targetRef: 'upstream/main' });
  assert.deepEqual(resolveTargetRef('2.1.0'), { normalizedTag: 'v2.1.0', targetRef: 'v2.1.0' });
  assert.deepEqual(resolveTargetRef('v2.1.0'), { normalizedTag: 'v2.1.0', targetRef: 'v2.1.0' });
  assert.equal(normalizeTag('3.0.0'), 'v3.0.0');
});

test('each strategy plans its own git commands', () => {
  const context = { targetRef: 'v2.0.0', normalizedTag: 'v2.0.0', versionInfo: 'v2.0.0' };

  assert.deepEqual(
    planStrategyCommands('rebase', context).map((command) => command.args),
    ['rebase v2.0.0'],
  );
  assert.deepEqual(
    planStrategyCommands('downgrade', context).map((command) => command.args),
    ['checkout v2.0.0 -- .'],
  );
  assert.deepEqual(
    planStrategyCommands('clean', context).map((command) => command.args),
    ['merge -s ours --no-ff --allow-unrelated-histories v2.0.0 -m "chore: clean update to v2.0.0"', 'checkout v2.0.0 -- .'],
  );
  assert.deepEqual(
    planStrategyCommands('merge', { targetRef: 'upstream/main', normalizedTag: null, versionInfo: 'v6.1.0' }).map(
      (command) => command.args,
    ),
    ['merge --no-ff --allow-unrelated-histories upstream/main -m "chore: merge upstream theme v6.1.0"'],
  );
});

test('conflict planning only auto-resolves user content in a regular merge', () => {
  const conflictFiles = ['src/content/blog/post.md', 'src/components/Post.tsx', 'config/site.yaml'];
  const cases: Array<{
    name: string;
    strategy: UpdateStrategy;
    conflictFiles: string[];
    autoResolveFiles: string[];
    manualFiles: string[];
    canAutoComplete: boolean;
    isRebaseConflict: boolean;
  }> = [
    {
      name: 'no conflicts',
      strategy: 'merge',
      conflictFiles: [],
      autoResolveFiles: [],
      manualFiles: [],
      canAutoComplete: true,
      isRebaseConflict: false,
    },
    {
      name: 'user content only',
      strategy: 'merge',
      conflictFiles: ['src/content/blog/post.md', 'config/site.yaml'],
      autoResolveFiles: ['src/content/blog/post.md', 'config/site.yaml'],
      manualFiles: [],
      canAutoComplete: true,
      isRebaseConflict: false,
    },
    {
      name: 'theme files only',
      strategy: 'merge',
      conflictFiles: ['src/components/Post.tsx'],
      autoResolveFiles: [],
      manualFiles: ['src/components/Post.tsx'],
      canAutoComplete: true,
      isRebaseConflict: false,
    },
    {
      name: 'mixed conflicts',
      strategy: 'merge',
      conflictFiles,
      autoResolveFiles: ['src/content/blog/post.md', 'config/site.yaml'],
      manualFiles: ['src/components/Post.tsx'],
      canAutoComplete: true,
      isRebaseConflict: false,
    },
    {
      name: 'rebase conflicts stay manual',
      strategy: 'rebase',
      conflictFiles,
      autoResolveFiles: [],
      manualFiles: conflictFiles,
      canAutoComplete: false,
      isRebaseConflict: true,
    },
    {
      name: 'clean conflicts stay manual',
      strategy: 'clean',
      conflictFiles,
      autoResolveFiles: [],
      manualFiles: conflictFiles,
      canAutoComplete: false,
      isRebaseConflict: false,
    },
    {
      name: 'downgrade conflicts stay manual',
      strategy: 'downgrade',
      conflictFiles,
      autoResolveFiles: [],
      manualFiles: conflictFiles,
      canAutoComplete: false,
      isRebaseConflict: false,
    },
  ];

  for (const testCase of cases) {
    const plan = planConflictResolution({
      strategy: testCase.strategy,
      conflictFiles: testCase.conflictFiles,
      userContentPrefixes: PREFIXES,
    });
    assert.deepEqual(
      plan,
      {
        autoResolveFiles: testCase.autoResolveFiles,
        manualFiles: testCase.manualFiles,
        canAutoComplete: testCase.canAutoComplete,
        isRebaseConflict: testCase.isRebaseConflict,
      },
      testCase.name,
    );
  }
});

test('auto-resolution failures fall back to manual resolution', () => {
  const plan = planConflictResolution({
    strategy: 'merge',
    conflictFiles: ['src/content/blog/a.md', 'src/content/blog/b.md', 'src/pages/index.astro'],
    userContentPrefixes: PREFIXES,
  });

  assert.deepEqual(resolveConflictOutcome(plan, []), {
    autoResolvedFiles: ['src/content/blog/a.md', 'src/content/blog/b.md'],
    manualFiles: ['src/pages/index.astro'],
    canCommit: false,
  });

  assert.deepEqual(resolveConflictOutcome(plan, ['src/content/blog/b.md']), {
    autoResolvedFiles: ['src/content/blog/a.md'],
    manualFiles: ['src/pages/index.astro', 'src/content/blog/b.md'],
    canCommit: false,
  });

  const userOnly = planConflictResolution({
    strategy: 'merge',
    conflictFiles: ['src/content/blog/a.md'],
    userContentPrefixes: PREFIXES,
  });
  assert.deepEqual(resolveConflictOutcome(userOnly, []), {
    autoResolvedFiles: ['src/content/blog/a.md'],
    manualFiles: [],
    canCommit: true,
  });
  assert.equal(resolveConflictOutcome(userOnly, ['src/content/blog/a.md']).canCommit, false);

  const rebase = planConflictResolution({ strategy: 'rebase', conflictFiles: [], userContentPrefixes: PREFIXES });
  assert.equal(resolveConflictOutcome(rebase, []).canCommit, false);
});

test('clean mode deletes only theme files that upstream removed', () => {
  const plan = planCleanRemovals({
    localFiles: [
      'src/content/blog/post.md',
      'config/site.yaml',
      'src/components/Removed.tsx',
      'src/components/Kept.tsx',
      'public/img/photo.png',
      'legacy/theme.css',
    ],
    upstreamFiles: ['src/components/Kept.tsx', 'src/components/New.tsx'],
    userContentPrefixes: PREFIXES,
  });

  assert.deepEqual(plan.filesToRemove, ['src/components/Removed.tsx', 'legacy/theme.css']);
  assert.deepEqual(plan.commands, [{ args: `rm --quiet -- 'src/components/Removed.tsx' 'legacy/theme.css'`, safe: true }]);
});

test('clean mode batches removals and quotes shell-hostile names', () => {
  const localFiles = Array.from({ length: 5 }, (_, index) => `theme/file-${index}.css`);
  const plan = planCleanRemovals({ localFiles, upstreamFiles: [], userContentPrefixes: PREFIXES, batchSize: 2 });

  assert.equal(plan.commands.length, 3);
  assert.deepEqual(
    plan.commands.map((command) => command.args),
    [
      `rm --quiet -- 'theme/file-0.css' 'theme/file-1.css'`,
      `rm --quiet -- 'theme/file-2.css' 'theme/file-3.css'`,
      `rm --quiet -- 'theme/file-4.css'`,
    ],
  );

  const quoted = planCleanRemovals({
    localFiles: [`theme/it's.css`],
    upstreamFiles: [],
    userContentPrefixes: PREFIXES,
  });
  assert.equal(quoted.commands[0].args, `rm --quiet -- 'theme/it'\\''s.css'`);

  assert.deepEqual(planCleanRemovals({ localFiles: [], upstreamFiles: [], userContentPrefixes: PREFIXES }), {
    filesToRemove: [],
    commands: [],
  });
});

test('conflict classification splits user content from theme files', () => {
  assert.deepEqual(classifyConflicts(['config/site.yaml', 'astro.config.mjs'], PREFIXES), {
    userFiles: ['config/site.yaml'],
    themeFiles: ['astro.config.mjs'],
  });
});

test('git output parsers tolerate empty and malformed output', () => {
  assert.deepEqual(parseRevListCounts(null), { aheadCount: 0, behindCount: 0 });
  assert.deepEqual(parseRevListCounts('2\t7'), { aheadCount: 2, behindCount: 7 });
  assert.deepEqual(parseRevListCounts('x\ty'), { aheadCount: 0, behindCount: 0 });

  assert.deepEqual(parseCommits(''), []);
  assert.deepEqual(parseCommits('abc123|feat: thing|2 days ago|dev'), [
    { hash: 'abc123', message: 'feat: thing', date: '2 days ago', author: 'dev' },
  ]);

  assert.deepEqual(parseConflictStatusLines(['UU config/site.yaml', ' M src/a.ts', 'AA b.ts', 'DD c.ts', '?? d.ts']), [
    'config/site.yaml',
    'b.ts',
    'c.ts',
  ]);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import type { GitStatusInfo, UpdateInfo, UpdateOptions } from '../constants/update';
import { createInitialState, selectUpdatePresentation, updateReducer } from './update-reducer';

const options: UpdateOptions = {
  checkOnly: false,
  skipBackup: false,
  force: false,
  rebase: false,
  dryRun: false,
  clean: false,
};

const cleanGitStatus: GitStatusInfo = {
  currentBranch: 'main',
  isClean: true,
  uncommittedCount: 0,
  uncommittedFiles: [],
};

const downgradeInfo: UpdateInfo = {
  hasUpstream: true,
  behindCount: 0,
  aheadCount: 1,
  commits: [],
  localCommits: [],
  currentVersion: '6.0.0',
  latestVersion: '4.2.1',
  isDowngrade: true,
};

test('captures the current pnpm pin before an update can check out a legacy package.json', () => {
  let state = updateReducer(createInitialState(options), {
    type: 'GIT_CHECKED',
    payload: cleanGitStatus,
    packageManager: 'pnpm@10.28.2',
  });

  assert.equal(state.status, 'fetching');

  state = updateReducer(state, { type: 'FETCHED', payload: downgradeInfo });
  state = updateReducer(state, { type: 'BACKUP_SKIP' });
  state = updateReducer(state, { type: 'UPDATE_CONFIRM' });
  state = updateReducer(state, {
    type: 'MERGED',
    payload: { success: true, hasConflict: false, conflictFiles: [] },
  });

  assert.equal(state.status, 'installing');
  assert.equal(state.packageManager, 'pnpm@10.28.2');
});

test('rebase and clean modes reach the forced backup step even with --skip-backup --force', () => {
  for (const mode of [{ rebase: true }, { clean: true }] as const) {
    const state = updateReducer(
      updateReducer(createInitialState({ ...options, ...mode, skipBackup: true, force: true }), {
        type: 'GIT_CHECKED',
        payload: cleanGitStatus,
        packageManager: 'pnpm@10.28.2',
      }),
      { type: 'FETCHED', payload: { ...downgradeInfo, isDowngrade: false, behindCount: 2, latestVersion: '6.2.0' } },
    );

    assert.equal(state.status, 'backup-confirm');
    assert.equal(selectUpdatePresentation(state).forceBackup, true);
    // Skipping is refused in these modes.
    assert.equal(updateReducer(state, { type: 'BACKUP_SKIP' }).status, 'backup-confirm');
  }
});

test('presentation derives labels, warnings and notes from one place', () => {
  const base = createInitialState(options);

  const upgrade = { ...base, updateInfo: { ...downgradeInfo, isDowngrade: false, latestVersion: '6.2.0' } };
  assert.equal(selectUpdatePresentation(upgrade).modeLabel, '更新');
  assert.equal(selectUpdatePresentation(upgrade).confirmMessage, '确认更新到最新版本？');
  assert.equal(selectUpdatePresentation(upgrade).strategyNote, '将使用 merge 合并上游更新');
  assert.equal(selectUpdatePresentation(upgrade).showRebaseWarning, false);

  const downgrade = { ...base, updateInfo: downgradeInfo, options: { ...options, targetTag: 'v4.2.1' } };
  const downgradePresentation = selectUpdatePresentation(downgrade);
  assert.equal(downgradePresentation.modeLabel, '版本回退');
  assert.equal(downgradePresentation.confirmMessage, '确认回退到版本 v4.2.1？');
  assert.equal(downgradePresentation.showDowngradeWarning, true);
  assert.equal(downgradePresentation.showUnbackedDowngradeWarning, true);
  assert.equal(selectUpdatePresentation({ ...downgrade, backupFile: 'backup.tar.gz' }).showUnbackedDowngradeWarning, false);

  const clean = { ...base, options: { ...options, clean: true }, needsMigration: true };
  const cleanPresentation = selectUpdatePresentation(clean);
  assert.equal(cleanPresentation.modeLabel, 'Clean 模式更新');
  assert.equal(cleanPresentation.forcedBackupModeLabel, 'Clean');
  assert.equal(cleanPresentation.strategyNote, '将使用 clean 模式：替换所有主题文件，还原用户内容');
  // Clean mode already removes conflicts, so the migration hint is redundant.
  assert.equal(cleanPresentation.showMigrationHint, false);
  assert.equal(selectUpdatePresentation({ ...base, needsMigration: true }).showMigrationHint, true);

  const rebase = { ...base, options: { ...options, rebase: true }, updateInfo: downgradeInfo };
  const rebasePresentation = selectUpdatePresentation(rebase);
  assert.equal(rebasePresentation.modeLabel, 'Rebase');
  assert.equal(rebasePresentation.forcedBackupModeLabel, 'Rebase');
  assert.equal(rebasePresentation.showRebaseWarning, true);
  assert.equal(rebasePresentation.showDowngradeWarning, false);
  assert.equal(rebasePresentation.strategyNote, null);
});

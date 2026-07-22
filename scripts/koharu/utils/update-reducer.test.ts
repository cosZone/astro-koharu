import assert from 'node:assert/strict';
import test from 'node:test';
import type { GitStatusInfo, UpdateInfo, UpdateOptions } from '../constants/update';
import { createInitialState, updateReducer } from './update-reducer';

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

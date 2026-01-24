import { MAIN_BRANCH, type UpdateAction, type UpdateOptions, type UpdateState } from '../constants/update';

/**
 * 更新流程状态机 Reducer
 * 所有状态转换逻辑集中在此处，易于理解和测试
 */
export function updateReducer(state: UpdateState, action: UpdateAction): UpdateState {
  const { status, options } = state;

  // 通用错误处理：任何状态都可以转换到 error
  if (action.type === 'ERROR') {
    return { ...state, status: 'error', error: action.error };
  }

  switch (status) {
    case 'checking': {
      if (action.type !== 'GIT_CHECKED') return state;
      const { payload: gitStatus } = action;

      // 分支检查 - 非 main 分支仅警告，不阻止更新
      const branchWarning =
        gitStatus.currentBranch !== MAIN_BRANCH
          ? `当前在 ${gitStatus.currentBranch} 分支，建议在 ${MAIN_BRANCH} 分支执行更新`
          : '';

      // 工作区脏检查
      if (!gitStatus.isClean && !options.force) {
        return { ...state, status: 'dirty-warning', gitStatus, branchWarning };
      }

      return { ...state, status: 'fetching', gitStatus, branchWarning };
    }

    case 'fetching': {
      if (action.type !== 'FETCHED') return state;
      const { payload: updateInfo } = action;

      // 版本号相同时不需要更新（squash merge 后 commit 不同但版本相同）
      const versionsMatch = updateInfo.currentVersion === updateInfo.latestVersion && updateInfo.latestVersion !== 'unknown';

      // 升级：behindCount > 0
      // 降级：isDowngrade && aheadCount > 0
      const hasChanges =
        !versionsMatch && (updateInfo.behindCount > 0 || (updateInfo.isDowngrade && updateInfo.aheadCount > 0));

      if (!hasChanges) {
        return { ...state, status: 'up-to-date', updateInfo };
      }

      // Rebase 模式强制备份（忽略 skipBackup 和 force）
      const nextStatus = options.rebase ? 'backup-confirm' : options.skipBackup || options.force ? 'preview' : 'backup-confirm';
      return { ...state, status: nextStatus, updateInfo };
    }

    case 'backup-confirm': {
      if (action.type === 'BACKUP_CONFIRM') {
        return { ...state, status: 'backing-up' };
      }
      if (action.type === 'BACKUP_SKIP') {
        return { ...state, status: 'preview' };
      }
      return state;
    }

    case 'backing-up': {
      if (action.type === 'BACKUP_DONE') {
        return { ...state, status: 'preview', backupFile: action.backupFile };
      }
      return state;
    }

    case 'preview': {
      if (action.type === 'UPDATE_CONFIRM') {
        return { ...state, status: 'merging' };
      }
      // UPDATE_CANCEL 由组件直接调用 onComplete，不经过 reducer
      return state;
    }

    case 'merging': {
      if (action.type !== 'MERGED') return state;
      const { payload: result } = action;

      if (result.hasConflict) {
        return { ...state, status: 'conflict', mergeResult: result };
      }
      if (!result.success) {
        return { ...state, status: 'error', error: result.error || '合并失败' };
      }
      return { ...state, status: 'installing', mergeResult: result };
    }

    case 'installing': {
      if (action.type === 'INSTALLED') {
        return { ...state, status: 'done' };
      }
      return state;
    }

    // 终态：不处理任何 action
    case 'dirty-warning':
    case 'done':
    case 'conflict':
    case 'up-to-date':
    case 'error':
      return state;

    default:
      return state;
  }
}

/** 创建初始状态 */
export function createInitialState(options: UpdateOptions): UpdateState {
  return {
    status: 'checking',
    gitStatus: null,
    updateInfo: null,
    mergeResult: null,
    backupFile: '',
    error: '',
    branchWarning: '',
    options,
  };
}

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
      const { payload: updateInfo, needsMigration } = action;

      // 版本号相同时不需要更新
      const versionsMatch = updateInfo.currentVersion === updateInfo.latestVersion && updateInfo.latestVersion !== 'unknown';

      // 升级：behindCount > 0
      // 降级：isDowngrade && aheadCount > 0
      const hasChanges =
        !versionsMatch && (updateInfo.behindCount > 0 || (updateInfo.isDowngrade && updateInfo.aheadCount > 0));

      if (!hasChanges) {
        return { ...state, status: 'up-to-date', updateInfo };
      }

      // Rebase 和 clean 模式强制备份（忽略 skipBackup 和 force）
      const forceBackup = options.rebase || options.clean;
      const nextStatus = forceBackup ? 'backup-confirm' : options.skipBackup || options.force ? 'preview' : 'backup-confirm';
      return { ...state, status: nextStatus, updateInfo, needsMigration: needsMigration ?? false };
    }

    case 'backup-confirm': {
      if (action.type === 'BACKUP_CONFIRM') {
        return { ...state, status: 'backing-up' };
      }
      // Rebase 和 clean 模式下不允许跳过备份（防御性检查）
      if (action.type === 'BACKUP_SKIP' && !options.rebase && !options.clean) {
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
      // Clean 模式：合并成功后需要还原用户内容
      if (options.clean) {
        return { ...state, status: 'clean-restoring', mergeResult: result };
      }
      return { ...state, status: 'installing', mergeResult: result };
    }

    case 'clean-restoring': {
      if (action.type === 'CLEAN_RESTORED') {
        return { ...state, status: 'installing', restoredFiles: action.restoredFiles };
      }
      return state;
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
    needsMigration: false,
    restoredFiles: [],
  };
}

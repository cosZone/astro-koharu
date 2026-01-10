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

      // 分支检查
      if (gitStatus.currentBranch !== MAIN_BRANCH) {
        return {
          ...state,
          status: 'error',
          error: `仅支持在 ${MAIN_BRANCH} 分支执行更新，当前分支: ${gitStatus.currentBranch}`,
        };
      }

      // 工作区脏检查
      if (!gitStatus.isClean && !options.force) {
        return { ...state, status: 'dirty-warning', gitStatus };
      }

      return { ...state, status: 'fetching', gitStatus };
    }

    case 'fetching': {
      if (action.type !== 'FETCHED') return state;
      const { payload: updateInfo } = action;

      if (updateInfo.behindCount === 0) {
        return { ...state, status: 'up-to-date', updateInfo };
      }

      // 决定下一步：备份确认 or 预览
      const nextStatus = options.skipBackup || options.force ? 'preview' : 'backup-confirm';
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
    options,
  };
}

import { MAIN_BRANCH, type UpdateAction, type UpdateOptions, type UpdateState } from '../constants/update';

/** Rebase 和 clean 模式重写工作区，备份不可跳过（忽略 skipBackup 和 force） */
export function shouldForceBackup(options: UpdateOptions): boolean {
  return options.rebase || options.clean;
}

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

      return { ...state, status: 'fetching', gitStatus, packageManager: action.packageManager, branchWarning };
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

      const nextStatus = shouldForceBackup(options) || !(options.skipBackup || options.force) ? 'backup-confirm' : 'preview';
      return { ...state, status: nextStatus, updateInfo, needsMigration: needsMigration ?? false };
    }

    case 'backup-confirm': {
      if (action.type === 'BACKUP_CONFIRM') {
        return { ...state, status: 'backing-up' };
      }
      // Rebase 和 clean 模式下不允许跳过备份（防御性检查）
      if (action.type === 'BACKUP_SKIP' && !shouldForceBackup(options)) {
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

/** Everything the update screen needs to render, derived once instead of in JSX conditions. */
export interface UpdatePresentation {
  /** 操作标签，用于进度与完成提示 */
  modeLabel: string;
  confirmMessage: string;
  /** 备份不可跳过 */
  forceBackup: boolean;
  /** 强制备份界面里的模式名 */
  forcedBackupModeLabel: string;
  /** 确认界面下方的策略说明 */
  strategyNote: string | null;
  showRebaseWarning: boolean;
  showDowngradeWarning: boolean;
  showUnbackedDowngradeWarning: boolean;
  showMigrationHint: boolean;
}

/** 生成确认提示文字 */
function getConfirmMessage(options: UpdateOptions, latestVersion: string, isDowngrade: boolean): string {
  const target = options.targetTag ? `版本 v${latestVersion}` : '最新版本';
  if (options.rebase) return `确认执行 rebase 到${options.targetTag ? target : '上游最新'}？（历史将被重写）`;
  if (options.clean) return `确认执行 clean 模式更新到${target}？`;
  if (isDowngrade) return `确认回退到版本 v${latestVersion}？`;
  return `确认更新到${target}？`;
}

function getModeLabel(options: UpdateOptions, isDowngrade: boolean): string {
  if (options.rebase) return 'Rebase';
  if (options.clean) return 'Clean 模式更新';
  if (isDowngrade) return '版本回退';
  return '更新';
}

function getStrategyNote(options: UpdateOptions, isDowngrade: boolean): string | null {
  if (options.clean) return '将使用 clean 模式：替换所有主题文件，还原用户内容';
  if (!options.rebase && !isDowngrade) return '将使用 merge 合并上游更新';
  return null;
}

export function selectUpdatePresentation(state: UpdateState): UpdatePresentation {
  const { options, updateInfo, backupFile, needsMigration } = state;
  const isDowngrade = updateInfo?.isDowngrade ?? false;

  return {
    modeLabel: getModeLabel(options, isDowngrade),
    confirmMessage: getConfirmMessage(options, updateInfo?.latestVersion ?? 'unknown', isDowngrade),
    forceBackup: shouldForceBackup(options),
    forcedBackupModeLabel: options.rebase ? 'Rebase' : 'Clean',
    strategyNote: getStrategyNote(options, isDowngrade),
    showRebaseWarning: options.rebase,
    showDowngradeWarning: isDowngrade && !options.rebase,
    showUnbackedDowngradeWarning: isDowngrade && !options.rebase && !backupFile,
    showMigrationHint: needsMigration && !options.rebase && !options.clean,
  };
}

/** 创建初始状态 */
export function createInitialState(options: UpdateOptions): UpdateState {
  return {
    status: 'checking',
    gitStatus: null,
    packageManager: '',
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

/** Upstream 远程仓库名称 */
export const UPSTREAM_REMOTE = 'upstream';

/** Upstream 仓库 URL */
export const UPSTREAM_URL = 'https://github.com/cosZone/astro-koharu.git';

/** 主分支名称 */
export const MAIN_BRANCH = 'main';

/** Commit 信息 */
export interface CommitInfo {
  hash: string;
  message: string;
  date: string;
  author: string;
}

/** Git 状态信息 */
export interface GitStatusInfo {
  /** 当前分支 */
  currentBranch: string;
  /** 工作区是否干净 */
  isClean: boolean;
  /** 未提交的文件数 */
  uncommittedCount: number;
  /** 未暂存的文件列表 */
  uncommittedFiles: string[];
}

/** 更新状态信息 */
export interface UpdateInfo {
  /** 是否已配置 upstream */
  hasUpstream: boolean;
  /** 本地落后于 upstream 的提交数 */
  behindCount: number;
  /** 本地领先于 upstream 的提交数 */
  aheadCount: number;
  /** 新提交列表 */
  commits: CommitInfo[];
  /** 当前版本 */
  currentVersion: string;
  /** 最新版本 */
  latestVersion: string;
}

/** 合并结果 */
export interface MergeResult {
  success: boolean;
  /** 是否有冲突 */
  hasConflict: boolean;
  /** 冲突文件列表 */
  conflictFiles: string[];
  /** 错误信息 */
  error?: string;
}

// ============ 状态机类型 ============

/** 更新流程状态 */
export type UpdateStatus =
  | 'checking' // 检查 Git 状态
  | 'dirty-warning' // 工作区有未提交更改
  | 'backup-confirm' // 确认备份
  | 'backing-up' // 正在备份
  | 'fetching' // 获取更新
  | 'preview' // 显示更新预览
  | 'merging' // 合并中
  | 'installing' // 安装依赖
  | 'done' // 完成
  | 'conflict' // 有冲突
  | 'up-to-date' // 已是最新
  | 'error'; // 错误

/** 更新流程配置选项 */
export interface UpdateOptions {
  checkOnly: boolean;
  skipBackup: boolean;
  force: boolean;
}

/** 状态机 State */
export interface UpdateState {
  status: UpdateStatus;
  gitStatus: GitStatusInfo | null;
  updateInfo: UpdateInfo | null;
  mergeResult: MergeResult | null;
  backupFile: string;
  error: string;
  options: UpdateOptions;
}

/** 状态机 Action */
export type UpdateAction =
  | { type: 'GIT_CHECKED'; payload: GitStatusInfo }
  | { type: 'FETCHED'; payload: UpdateInfo }
  | { type: 'BACKUP_CONFIRM' }
  | { type: 'BACKUP_SKIP' }
  | { type: 'BACKUP_DONE'; backupFile: string }
  | { type: 'UPDATE_CONFIRM' }
  | { type: 'MERGED'; payload: MergeResult }
  | { type: 'INSTALLED' }
  | { type: 'ERROR'; error: string };

/** Upstream 远程仓库名称 */
export const UPSTREAM_REMOTE = 'upstream';

/** Upstream 仓库 URL */
export const UPSTREAM_URL = 'https://github.com/cosZone/astro-koharu.git';

/** GitHub 仓库路径 (用于 API 调用) */
export const GITHUB_REPO = 'cosZone/astro-koharu';

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
  /** 新提交列表（升级时为新增提交，降级时为将移除的提交） */
  commits: CommitInfo[];
  /** 本地领先的提交列表（rebase 时将被重放的提交） */
  localCommits: CommitInfo[];
  /** 当前版本 */
  currentVersion: string;
  /** 最新版本（或目标版本） */
  latestVersion: string;
  /** 是否为降级操作 */
  isDowngrade: boolean;
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
  /** 是否为 rebase 冲突 */
  isRebaseConflict?: boolean;
  /** 被自动解决的用户内容冲突文件 */
  autoResolvedFiles?: string[];
  /** Clean 模式合并前的 commit SHA（用于还原失败时回滚） */
  preCleanSha?: string;
}

/** GitHub Release 信息 */
export interface ReleaseInfo {
  /** Tag 名称，如 "v2.2.0" */
  tagName: string;
  /** Release 页面 URL */
  url: string;
  /** Release Notes (Markdown) */
  body: string | null;
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
  | 'clean-restoring' // clean 模式还原用户内容
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
  /** 指定更新到的目标版本 tag (如 "v2.1.0" 或 "2.1.0") */
  targetTag?: string;
  /** 使用 rebase 模式（重写历史） */
  rebase: boolean;
  /** 预览操作（不实际执行） */
  dryRun: boolean;
  /** 使用 clean 模式（替换所有主题文件，还原用户内容） */
  clean: boolean;
}

/** 状态机 State */
export interface UpdateState {
  status: UpdateStatus;
  gitStatus: GitStatusInfo | null;
  updateInfo: UpdateInfo | null;
  mergeResult: MergeResult | null;
  backupFile: string;
  error: string;
  /** 非 main 分支警告信息 */
  branchWarning: string;
  options: UpdateOptions;
  /** 首次从 squash merge 迁移到 regular merge 的标志 */
  needsMigration: boolean;
  /** Clean 模式还原的文件路径列表 */
  restoredFiles: string[];
}

/** 状态机 Action */
export type UpdateAction =
  | { type: 'GIT_CHECKED'; payload: GitStatusInfo }
  | { type: 'FETCHED'; payload: UpdateInfo; needsMigration?: boolean }
  | { type: 'BACKUP_CONFIRM' }
  | { type: 'BACKUP_SKIP' }
  | { type: 'BACKUP_DONE'; backupFile: string }
  | { type: 'UPDATE_CONFIRM' }
  | { type: 'MERGED'; payload: MergeResult }
  | { type: 'CLEAN_RESTORED'; restoredFiles: string[] }
  | { type: 'INSTALLED' }
  | { type: 'ERROR'; error: string };

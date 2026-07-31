import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { USER_CONTENT_PREFIXES } from '../constants/backup';
import { PACKAGE_JSON_PATH, PROJECT_ROOT } from '../constants/paths';
import {
  type GitStatusInfo,
  MAIN_BRANCH,
  type MergeResult,
  UPSTREAM_REMOTE,
  UPSTREAM_URL,
  type UpdateInfo,
} from '../constants/update';
import {
  addRemote,
  fetchRemote,
  getCurrentBranch,
  getHeadSha,
  getRemoteUrl,
  getStatusLines,
  git,
  gitSafe,
  hasRef,
  keepOursAndStage,
  normalizeRemoteUrl,
  parseGitLines,
  runGitCommands,
  showFile,
} from './git-porcelain';
import {
  decideDowngrade,
  normalizeTag,
  parseCommits,
  parseConflictStatusLines,
  parseRevListCounts,
  planCleanFinalizeCommands,
  planCleanRemovals,
  planConflictResolution,
  planDowngradeCommit,
  planStrategyCommands,
  resolveConflictOutcome,
  resolveTargetRef,
  selectUpdateStrategy,
} from './update-policy';
import { getVersion } from './version';

/**
 * Executor for the update flow: it reads repository state through
 * `git-porcelain.ts`, asks `update-policy.ts` what to do, and runs the result.
 */

export interface PackageManagerInstallCommand {
  command: string;
  args: string[];
}

function parsePackageManager(packageManager: unknown): string {
  if (typeof packageManager !== 'string' || !/^pnpm@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageManager)) {
    throw new Error('package.json 必须声明精确的 packageManager，例如 pnpm@10.28.2');
  }

  return packageManager;
}

/** Build an install command that cannot fall back to the caller's older pnpm binary. */
export function getPackageManagerInstallCommand(
  packageManager: unknown,
  fallbackPackageManager?: unknown,
): PackageManagerInstallCommand {
  const exactPackageManager = parsePackageManager(packageManager === undefined ? fallbackPackageManager : packageManager);

  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['--yes', exactPackageManager, 'install'],
  };
}

/** Read the pnpm pin before an update can replace package.json with a legacy version. */
export function readProjectPackageManager(): string {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as { packageManager?: unknown };
  return parsePackageManager(packageJson.packageManager);
}

export interface EnsureUpstreamOptions {
  allowAdd?: boolean;
}

export interface EnsureUpstreamResult {
  existed: boolean;
  success: boolean;
  reason?: 'mismatch' | 'missing' | 'add-failed';
  currentUrl?: string;
}

/**
 * 检查 Git 状态
 */
export function checkGitStatus(): GitStatusInfo {
  const currentBranch = getCurrentBranch();
  const uncommittedFiles = getStatusLines();

  return {
    currentBranch,
    isClean: uncommittedFiles.length === 0,
    uncommittedCount: uncommittedFiles.length,
    uncommittedFiles: uncommittedFiles.map((line) => line.slice(3)), // Remove status prefix
  };
}

export function hasUpstreamRemote(): boolean {
  return Boolean(getRemoteUrl(UPSTREAM_REMOTE));
}

export function hasUpstreamTrackingRef(): boolean {
  return hasRef(`refs/remotes/${UPSTREAM_REMOTE}/${MAIN_BRANCH}`);
}

export function getUpstreamRemoteUrl(): string | null {
  return getRemoteUrl(UPSTREAM_REMOTE);
}

export function addUpstreamRemote(): boolean {
  return addRemote(UPSTREAM_REMOTE, UPSTREAM_URL);
}

/**
 * 确保 upstream remote 已配置
 */
export function ensureUpstreamRemote(options: EnsureUpstreamOptions = {}): EnsureUpstreamResult {
  const allowAdd = options.allowAdd ?? true;
  const currentUrl = getUpstreamRemoteUrl();
  if (currentUrl) {
    if (normalizeRemoteUrl(UPSTREAM_URL) !== normalizeRemoteUrl(currentUrl)) {
      return { existed: true, success: false, reason: 'mismatch', currentUrl };
    }
    return { existed: true, success: true, currentUrl };
  }
  if (!allowAdd) {
    return { existed: false, success: false, reason: 'missing' };
  }
  const success = addUpstreamRemote();
  return success ? { existed: false, success: true } : { existed: false, success: false, reason: 'add-failed' };
}

export function fetchUpstream(): boolean {
  return fetchRemote(UPSTREAM_REMOTE);
}

function readVersionFromRef(ref: string): string | null {
  const packageJsonContent = showFile(ref, 'package.json');
  if (!packageJsonContent) return null;
  try {
    const packageJson = JSON.parse(packageJsonContent);
    return typeof packageJson.version === 'string' ? packageJson.version : null;
  } catch {
    return null;
  }
}

/**
 * 获取更新信息
 * @param targetTag 可选的目标版本 tag，不指定时更新到 upstream/main
 */
export function getUpdateInfo(targetTag?: string): UpdateInfo {
  if (!hasUpstreamRemote()) {
    return {
      hasUpstream: false,
      behindCount: 0,
      aheadCount: 0,
      commits: [],
      localCommits: [],
      currentVersion: getVersion(),
      latestVersion: 'unknown',
      isDowngrade: false,
    };
  }

  const { normalizedTag, targetRef } = resolveTargetRef(targetTag);
  const { aheadCount, behindCount } = parseRevListCounts(gitSafe(`rev-list --left-right --count HEAD...${targetRef}`));
  const isDowngrade = decideDowngrade({ normalizedTag, aheadCount, behindCount });

  const commitFormat = '%h|%s|%ar|%an';
  // 降级列出将被移除的 commits，升级列出新增的 commits
  const commitsRange = isDowngrade ? `${targetRef}..HEAD` : `HEAD..${targetRef}`;
  const commits = parseCommits(gitSafe(`log ${commitsRange} --pretty=format:"${commitFormat}" --no-merges`) || '');
  // 本地领先于 target 的 commits（rebase 时将被重放）
  const localCommits = parseCommits(gitSafe(`log ${targetRef}..HEAD --pretty=format:"${commitFormat}" --no-merges`) || '');

  const latestVersion = normalizedTag
    ? normalizedTag.replace(/^v/, '')
    : (readVersionFromRef(`${UPSTREAM_REMOTE}/${MAIN_BRANCH}`) ?? 'unknown');

  return {
    hasUpstream: true,
    behindCount,
    aheadCount,
    commits,
    localCommits,
    currentVersion: getVersion(),
    latestVersion,
    isDowngrade,
  };
}

/** 合并操作选项 */
export interface MergeOptions {
  /** 目标版本 tag（如 "v2.1.0"），不指定时使用 upstream/main */
  targetTag?: string;
  /** 是否为降级操作，降级时使用 checkout + commit 保留历史 */
  isDowngrade?: boolean;
  /** 使用 rebase 模式：将本地提交重放到目标引用之上（重写历史） */
  rebase?: boolean;
  /** 使用 clean 模式：替换所有主题文件，后续从备份还原用户内容 */
  clean?: boolean;
}

/** 获取目标版本信息用于 commit message */
function getVersionInfo(targetRef: string, normalizedTag: string | null): string {
  if (normalizedTag) return normalizedTag;
  const version = readVersionFromRef(targetRef);
  return version ? `v${version}` : 'latest';
}

function getConflictFiles(): string[] {
  const diffFiles = parseGitLines(gitSafe('diff --name-only --diff-filter=U'));
  if (diffFiles.length > 0) return [...new Set(diffFiles)];
  return parseConflictStatusLines(getStatusLines());
}

/** Clean 模式：删除上游已移除的非用户内容文件 */
function removeDeletedUpstreamFiles(targetRef: string): void {
  const plan = planCleanRemovals({
    localFiles: parseGitLines(gitSafe('ls-files')),
    upstreamFiles: parseGitLines(gitSafe(`ls-tree -r --name-only ${targetRef}`)),
    userContentPrefixes: USER_CONTENT_PREFIXES,
  });
  runGitCommands(plan.commands);
}

/**
 * 执行合并、降级、rebase 或 clean 操作
 *
 * @param options - 合并选项
 * @returns 合并结果，包含成功状态、冲突信息等
 */
export function mergeUpstream(options: MergeOptions = {}): MergeResult {
  const { normalizedTag, targetRef } = resolveTargetRef(options.targetTag);
  const strategy = selectUpdateStrategy({ normalizedTag, ...options });

  try {
    if (strategy === 'clean') {
      // 保存合并前 SHA，用于还原失败时回滚
      const preCleanSha = getHeadSha();
      runGitCommands(
        planStrategyCommands(strategy, { targetRef, normalizedTag, versionInfo: getVersionInfo(targetRef, normalizedTag) }),
      );
      removeDeletedUpstreamFiles(targetRef);
      // 暂存覆盖后的文件状态（用户内容将在 clean-restoring 阶段还原）
      runGitCommands(planCleanFinalizeCommands());
      return { success: true, hasConflict: false, conflictFiles: [], preCleanSha };
    }

    runGitCommands(
      planStrategyCommands(strategy, { targetRef, normalizedTag, versionInfo: getVersionInfo(targetRef, normalizedTag) }),
    );
    if (strategy === 'downgrade' && normalizedTag && getStatusLines().length > 0) {
      runGitCommands([planDowngradeCommit(normalizedTag)]);
    }

    return { success: true, hasConflict: false, conflictFiles: [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 降级不会留下可解决的冲突状态
    if (strategy === 'downgrade') {
      return { success: false, hasConflict: false, conflictFiles: [], error: errorMessage };
    }

    const conflictFiles = getConflictFiles();
    if (conflictFiles.length === 0) {
      return { success: false, hasConflict: false, conflictFiles: [], error: errorMessage };
    }

    const plan = planConflictResolution({ strategy, conflictFiles, userContentPrefixes: USER_CONTENT_PREFIXES });
    const failedFiles = plan.autoResolveFiles.filter((file) => !keepOursAndStage(file));
    const outcome = resolveConflictOutcome(plan, failedFiles);

    if (outcome.canCommit) {
      try {
        git('commit --no-edit');
        return {
          success: true,
          hasConflict: false,
          conflictFiles: [],
          autoResolvedFiles: outcome.autoResolvedFiles,
        };
      } catch {
        // commit 失败，仍然返回冲突
      }
    }

    return {
      success: false,
      hasConflict: true,
      conflictFiles: outcome.manualFiles,
      autoResolvedFiles: outcome.autoResolvedFiles.length > 0 ? outcome.autoResolvedFiles : undefined,
      isRebaseConflict: plan.isRebaseConflict || undefined,
    };
  }
}

/**
 * 检测是否已有 upstream merge commit（用于首次迁移提示）
 *
 * 检查最近 20 个 merge commit，看是否有某个 parent 可从 upstream/main 到达。
 * 如果有 → 之前已有 regular merge → 无需迁移。
 * 如果没有 → 可能一直用 squash merge → 需要迁移提示。
 */
export function hasUpstreamMergeHistory(): boolean {
  if (!hasUpstreamTrackingRef()) return false;
  for (const line of parseGitLines(gitSafe('log --merges --format=%P -20 HEAD'))) {
    // 跳过第一个 parent（本分支），检查后续 parent 是否在 upstream 历史中
    // 注意: merge-base --is-ancestor 用 exit code 表示结果，gitSafe 失败时返回 null
    for (const parent of line.split(' ').slice(1)) {
      if (gitSafe(`merge-base --is-ancestor ${parent} ${UPSTREAM_REMOTE}/${MAIN_BRANCH}`) !== null) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 安装依赖（异步）
 */
export function installDeps(
  fallbackPackageManager: unknown,
  onOutput?: (data: string) => void,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let installCommand: PackageManagerInstallCommand;
    try {
      const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as { packageManager?: unknown };
      installCommand = getPackageManagerInstallCommand(packageJson.packageManager, fallbackPackageManager);
    } catch (error) {
      resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }

    const child = spawn(installCommand.command, installCommand.args, {
      cwd: PROJECT_ROOT,
      shell: false,
    });

    let stderr = '';

    child.stdout?.on('data', (data) => {
      onOutput?.(data.toString());
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      onOutput?.(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `Exit code: ${code}` });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/** 检查 tag 是否存在于本地 */
export function tagExists(tag: string): boolean {
  return hasRef(`refs/tags/${normalizeTag(tag)}`);
}

/** 获取最近的 tags 列表 */
export function listRecentTags(limit = 5): string[] {
  return parseGitLines(gitSafe('tag --sort=-creatordate --list "v*"')).slice(0, limit);
}

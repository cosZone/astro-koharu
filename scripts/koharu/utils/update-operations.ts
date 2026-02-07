import { execSync, spawn } from 'node:child_process';
import { BACKUP_ITEMS } from '../constants/backup';
import { PROJECT_ROOT } from '../constants/paths';
import {
  type CommitInfo,
  GITHUB_REPO,
  type GitStatusInfo,
  MAIN_BRANCH,
  type MergeResult,
  type ReleaseInfo,
  UPSTREAM_REMOTE,
  UPSTREAM_URL,
  type UpdateInfo,
} from '../constants/update';
import { restoreBackup } from './restore-operations';
import { getVersion } from './version';

/**
 * 执行 Git 命令
 */
function git(args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      throw new Error((error as { stderr: string }).stderr || error.message);
    }
    throw error;
  }
}

/**
 * 安全执行 Git 命令（不抛出异常）
 */
function gitSafe(args: string): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function normalizeRemoteUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('ssh://')) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.hostname}${parsed.pathname.replace(/\.git$/, '')}`;
    } catch {
      return trimmed.replace(/\.git$/, '');
    }
  }
  const scpMatch = trimmed.match(/^[^@]+@([^:]+):(.+)$/);
  if (scpMatch) {
    return `${scpMatch[1]}${scpMatch[2].replace(/\.git$/, '')}`;
  }
  return trimmed.replace(/\.git$/, '');
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
  const currentBranch = git('rev-parse --abbrev-ref HEAD');
  const statusOutput = gitSafe('status --porcelain') || '';
  const uncommittedFiles = statusOutput.split('\n').filter((line) => line.trim().length > 0);

  return {
    currentBranch,
    isClean: uncommittedFiles.length === 0,
    uncommittedCount: uncommittedFiles.length,
    uncommittedFiles: uncommittedFiles.map((line) => line.slice(3)), // Remove status prefix
  };
}

/**
 * 检查是否已配置 upstream remote
 */
export function hasUpstreamRemote(): boolean {
  return Boolean(gitSafe(`remote get-url ${UPSTREAM_REMOTE}`));
}

export function hasUpstreamTrackingRef(): boolean {
  return Boolean(gitSafe(`show-ref --verify refs/remotes/${UPSTREAM_REMOTE}/${MAIN_BRANCH}`));
}

export function getUpstreamRemoteUrl(): string | null {
  return gitSafe(`remote get-url ${UPSTREAM_REMOTE}`);
}

/**
 * 添加 upstream remote
 */
export function addUpstreamRemote(): boolean {
  try {
    git(`remote add ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * 确保 upstream remote 已配置
 */
export function ensureUpstreamRemote(options: EnsureUpstreamOptions = {}): EnsureUpstreamResult {
  const allowAdd = options.allowAdd ?? true;
  const currentUrl = getUpstreamRemoteUrl();
  if (currentUrl) {
    const expected = normalizeRemoteUrl(UPSTREAM_URL);
    const actual = normalizeRemoteUrl(currentUrl);
    if (expected !== actual) {
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

/**
 * 从 upstream 获取最新代码
 */
export function fetchUpstream(): boolean {
  try {
    git(`fetch ${UPSTREAM_REMOTE}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * 解析提交信息
 */
function parseCommits(output: string): CommitInfo[] {
  if (!output.trim()) return [];

  return output
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      // Format: hash|message|date|author
      const [hash, message, date, author] = line.split('|');
      return { hash, message, date, author };
    });
}

/**
 * 规范化版本号为带 v 前缀的格式
 */
function normalizeTag(tag: string): string {
  return tag.startsWith('v') ? tag : `v${tag}`;
}

/**
 * 获取更新信息
 * @param targetTag 可选的目标版本 tag，不指定时更新到 upstream/main
 */
export function getUpdateInfo(targetTag?: string): UpdateInfo {
  const hasUpstream = hasUpstreamRemote();

  if (!hasUpstream) {
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

  // 确定目标引用：指定 tag 或 upstream/main
  const normalizedTag = targetTag ? normalizeTag(targetTag) : null;
  const targetRef = normalizedTag || `${UPSTREAM_REMOTE}/${MAIN_BRANCH}`;

  // Get ahead/behind counts
  const revList = gitSafe(`rev-list --left-right --count HEAD...${targetRef}`) || '0\t0';
  const [aheadStr, behindStr] = revList.split('\t');
  const aheadCount = Number.parseInt(aheadStr, 10) || 0;
  const behindCount = Number.parseInt(behindStr, 10) || 0;

  // 判断是否为降级操作：指定 tag 且 HEAD 在目标之前（aheadCount > 0, behindCount === 0）
  const isDowngrade = Boolean(normalizedTag && aheadCount > 0 && behindCount === 0);

  // Get commits
  const commitFormat = '%h|%s|%ar|%an';
  let commits: CommitInfo[];

  if (isDowngrade) {
    // 降级：获取将被移除的 commits（从目标到 HEAD 的 commits）
    const commitsOutput = gitSafe(`log ${targetRef}..HEAD --pretty=format:"${commitFormat}" --no-merges`) || '';
    commits = parseCommits(commitsOutput);
  } else {
    // 升级：获取新增的 commits（从 HEAD 到目标的 commits）
    const commitsOutput = gitSafe(`log HEAD..${targetRef} --pretty=format:"${commitFormat}" --no-merges`) || '';
    commits = parseCommits(commitsOutput);
  }

  // 获取本地领先于 target 的 commits（rebase 时将被重放）
  const localCommitsOutput = gitSafe(`log ${targetRef}..HEAD --pretty=format:"${commitFormat}" --no-merges`) || '';
  const localCommits = parseCommits(localCommitsOutput);

  // 获取目标版本号
  let parsedVersion = 'unknown';
  if (normalizedTag) {
    // 使用 tag 名作为版本号（去掉 v 前缀）
    parsedVersion = normalizedTag.replace(/^v/, '');
  } else {
    // Try to get latest version from upstream package.json
    const packageJsonContent = gitSafe(`show ${UPSTREAM_REMOTE}/${MAIN_BRANCH}:package.json`);
    if (packageJsonContent) {
      try {
        const packageJson = JSON.parse(packageJsonContent);
        if (packageJson.version) {
          parsedVersion = packageJson.version;
        }
      } catch {
        // JSON parse failed, keep 'unknown'
      }
    }
  }

  return {
    hasUpstream: true,
    behindCount,
    aheadCount,
    commits,
    localCommits,
    currentVersion: getVersion(),
    latestVersion: parsedVersion,
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

/**
 * 获取目标版本信息用于 commit message
 */
function getVersionInfo(targetRef: string, normalizedTag: string | null): string {
  if (normalizedTag) return normalizedTag;
  const packageJsonContent = gitSafe(`show ${targetRef}:package.json`);
  if (packageJsonContent) {
    try {
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson.version) return `v${packageJson.version}`;
    } catch {
      // JSON parse failed
    }
  }
  return 'latest';
}

/**
 * 用户内容路径前缀列表（从 BACKUP_ITEMS 的 required 项获取）
 */
const USER_CONTENT_PREFIXES = BACKUP_ITEMS.filter((item) => item.required).map((item) => item.src);

/**
 * 判断文件是否属于用户内容
 */
function isUserContent(filePath: string): boolean {
  return USER_CONTENT_PREFIXES.some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`));
}

/**
 * 将冲突文件分为用户内容和主题文件
 */
function classifyConflicts(files: string[]): { userFiles: string[]; themeFiles: string[] } {
  const userFiles: string[] = [];
  const themeFiles: string[] = [];
  for (const file of files) {
    if (isUserContent(file)) {
      userFiles.push(file);
    } else {
      themeFiles.push(file);
    }
  }
  return { userFiles, themeFiles };
}

/**
 * 对用户内容文件自动使用 --ours 解决冲突
 * 如果 checkout 成功但 add 失败，用 checkout -m 恢复冲突状态
 * @returns 解决失败的文件列表
 */
function autoResolveUserContent(files: string[]): string[] {
  const failed: string[] = [];
  for (const file of files) {
    const checkoutOk = gitSafe(`checkout --ours -- "${file}"`) !== null;
    const addOk = checkoutOk && gitSafe(`add -- "${file}"`) !== null;
    if (!addOk) {
      // checkout 成功但 add 失败时，恢复冲突标记以便用户手动解决
      if (checkoutOk) {
        gitSafe(`checkout -m -- "${file}"`);
      }
      failed.push(file);
    }
  }
  return failed;
}

/**
 * Clean 模式：删除上游已移除的非用户内容文件
 */
function removeDeletedUpstreamFiles(targetRef: string): void {
  const localFiles = gitSafe('ls-files') || '';
  const upstreamFiles = gitSafe(`ls-tree -r --name-only ${targetRef}`) || '';

  const localSet = new Set(
    localFiles
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean),
  );
  const upstreamSet = new Set(
    upstreamFiles
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean),
  );

  const filesToRemove: string[] = [];
  for (const file of localSet) {
    if (!upstreamSet.has(file) && !isUserContent(file)) {
      filesToRemove.push(file);
    }
  }

  if (filesToRemove.length > 0) {
    // 分批执行 git rm，避免参数过长超过 ARG_MAX 限制
    const BATCH_SIZE = 100;
    for (let i = 0; i < filesToRemove.length; i += BATCH_SIZE) {
      const chunk = filesToRemove.slice(i, i + BATCH_SIZE);
      const batch = chunk.map((f) => `'${f.replaceAll("'", "'\\''")}'`).join(' ');
      gitSafe(`rm --quiet -- ${batch}`);
    }
  }
}

/**
 * Clean 模式：从备份还原用户内容并 amend 到 merge commit
 * @param preCleanSha 合并前的 commit SHA，还原失败时回滚到此状态
 */
export function cleanRestore(backupPath: string, preCleanSha?: string): string[] {
  try {
    const restored = restoreBackup(backupPath);
    git('add -A');
    git('commit --amend --no-edit');
    return restored;
  } catch (error) {
    // 还原失败，回滚到合并前的状态以保护用户数据
    if (preCleanSha) {
      gitSafe(`reset --hard ${preCleanSha}`);
    }
    throw error;
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
  const merges = gitSafe('log --merges --format=%P -20 HEAD');
  if (!merges) return false;
  for (const line of merges.trim().split('\n')) {
    if (!line.trim()) continue;
    const parents = line.trim().split(' ');
    // 跳过第一个 parent（本分支），检查后续 parent 是否在 upstream 历史中
    // 注意: merge-base --is-ancestor 用 exit code 表示结果（0=是祖先，1=不是）
    // gitSafe 在 exit code 非零时返回 null，所以 !== null 等价于 "是祖先"
    for (const parent of parents.slice(1)) {
      if (gitSafe(`merge-base --is-ancestor ${parent} ${UPSTREAM_REMOTE}/${MAIN_BRANCH}`) !== null) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 执行合并、降级、rebase 或 clean 操作
 *
 * @param options - 合并选项
 * @returns 合并结果，包含成功状态、冲突信息等
 */
export function mergeUpstream(options: MergeOptions = {}): MergeResult {
  const { targetTag, isDowngrade, rebase, clean } = options;
  const normalizedTag = targetTag ? normalizeTag(targetTag) : null;
  const targetRef = normalizedTag || `${UPSTREAM_REMOTE}/${MAIN_BRANCH}`;

  try {
    if (rebase) {
      // Rebase 模式：将本地提交重放到目标引用之上
      git(`rebase ${targetRef}`);
    } else if (isDowngrade && normalizedTag) {
      // 降级使用 checkout + commit 保留提交历史
      git(`checkout ${normalizedTag} -- .`);
      const status = gitSafe('status --porcelain') || '';
      if (status.trim().length > 0) {
        git(`commit -m "Downgrade to ${normalizedTag}"`);
      }
    } else if (clean) {
      // Clean 模式：merge -s ours 记录 merge-base，然后用上游文件覆盖
      // 保存合并前 SHA，用于还原失败时回滚
      const preCleanSha = git('rev-parse HEAD');
      const versionInfo = getVersionInfo(targetRef, normalizedTag);
      git(`merge -s ours --no-ff --allow-unrelated-histories ${targetRef} -m "chore: clean update to ${versionInfo}"`);
      git(`checkout ${targetRef} -- .`);
      removeDeletedUpstreamFiles(targetRef);
      // 暂存覆盖后的文件状态（用户内容将在 clean-restoring 阶段还原）
      git('add -A');
      git('commit --amend --no-edit');
      return {
        success: true,
        hasConflict: false,
        conflictFiles: [],
        preCleanSha,
      };
    } else {
      // 默认使用 regular merge 保留 merge-base 信息
      const versionInfo = getVersionInfo(targetRef, normalizedTag);
      git(`merge --no-ff --allow-unrelated-histories ${targetRef} -m "chore: merge upstream theme ${versionInfo}"`);
    }
    return {
      success: true,
      hasConflict: false,
      conflictFiles: [],
    };
  } catch (error) {
    // 降级可能产生冲突
    if (isDowngrade) {
      return {
        success: false,
        hasConflict: false,
        conflictFiles: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const conflictFiles = getConflictFiles();

    if (conflictFiles.length > 0) {
      // Regular merge 冲突时的智能处理：自动解决用户内容冲突
      if (!rebase && !clean) {
        const { userFiles, themeFiles } = classifyConflicts(conflictFiles);
        if (userFiles.length > 0) {
          const failedFiles = autoResolveUserContent(userFiles);
          // 解决失败的用户文件视为主题文件冲突，需要用户手动处理
          if (failedFiles.length > 0) {
            themeFiles.push(...failedFiles);
          }
        }
        const resolvedFiles = userFiles.filter((f) => !themeFiles.includes(f));
        // 如果只有用户内容冲突且全部自动解决，自动完成合并
        if (themeFiles.length === 0) {
          try {
            git('commit --no-edit');
            return {
              success: true,
              hasConflict: false,
              conflictFiles: [],
              autoResolvedFiles: resolvedFiles,
            };
          } catch {
            // commit 失败，仍然返回冲突
          }
        }
        // 还有主题文件冲突，需要用户手动解决
        return {
          success: false,
          hasConflict: true,
          conflictFiles: themeFiles,
          autoResolvedFiles: resolvedFiles.length > 0 ? resolvedFiles : undefined,
        };
      }

      return {
        success: false,
        hasConflict: true,
        conflictFiles,
        isRebaseConflict: rebase,
      };
    }

    return {
      success: false,
      hasConflict: false,
      conflictFiles: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getConflictFiles(): string[] {
  const diffOutput = gitSafe('diff --name-only --diff-filter=U') || '';
  const diffFiles = diffOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (diffFiles.length > 0) {
    return Array.from(new Set(diffFiles));
  }

  const statusOutput = gitSafe('status --porcelain') || '';
  const statusFiles = statusOutput
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .filter((line) => {
      const status = line.slice(0, 2);
      return status.includes('U') || status === 'AA' || status === 'DD';
    })
    .map((line) => line.slice(3));

  return Array.from(new Set(statusFiles));
}

/**
 * 中止合并
 */
export function abortMerge(): boolean {
  try {
    git('merge --abort');
    return true;
  } catch {
    return false;
  }
}

/**
 * 中止 rebase
 */
export function abortRebase(): boolean {
  try {
    git('rebase --abort');
    return true;
  } catch {
    return false;
  }
}

/**
 * 安装依赖（异步）
 */
export function installDeps(onOutput?: (data: string) => void): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['install'], {
      cwd: PROJECT_ROOT,
      shell: true,
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

/**
 * 检查 tag 是否存在于 upstream remote
 */
export function tagExists(tag: string): boolean {
  const normalizedTag = normalizeTag(tag);
  return Boolean(gitSafe(`show-ref --verify refs/tags/${normalizedTag}`));
}

/**
 * 获取最近的 tags 列表
 */
export function listRecentTags(limit = 5): string[] {
  const output = gitSafe('tag --sort=-creatordate --list "v*"') || '';
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, limit);
}

/**
 * 从 GitHub API 获取 Release 信息
 */
export async function fetchReleaseInfo(version: string): Promise<ReleaseInfo | null> {
  const tag = normalizeTag(version);
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tag}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'astro-koharu-cli',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      tagName: data.tag_name,
      url: data.html_url,
      body: data.body || null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * 构建 Release 页面 URL (不依赖 API)
 */
export function buildReleaseUrl(version: string): string {
  const tag = normalizeTag(version);
  return `https://github.com/${GITHUB_REPO}/releases/tag/${tag}`;
}

/**
 * 从 Release body 提取简要内容
 */
export function extractReleaseSummary(body: string | null, maxLines = 5, maxChars = 300): string[] {
  if (!body) return [];

  const lines = body
    .split('\n')
    .map((line) => line.trim())
    // 移除 Markdown 标题标记
    .map((line) => line.replace(/^#{1,6}\s*/, ''))
    // 过滤空行和纯标题行
    .filter((line) => line.length > 0);

  const result: string[] = [];
  let totalChars = 0;

  for (const line of lines) {
    if (result.length >= maxLines || totalChars >= maxChars) break;
    result.push(line);
    totalChars += line.length;
  }

  // 如果有截断，添加省略提示
  if (result.length < lines.length) {
    result.push('...');
  }

  return result;
}

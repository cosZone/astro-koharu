import { execSync, spawn } from 'node:child_process';
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
}

/**
 * 执行合并、降级或 rebase 操作
 *
 * @param options - 合并选项
 * @returns 合并结果，包含成功状态、冲突信息等
 *
 * @example
 * // 普通合并到 upstream/main
 * mergeUpstream();
 *
 * // 合并到指定 tag
 * mergeUpstream({ targetTag: 'v2.1.0' });
 *
 * // Rebase 到 upstream/main（重写历史）
 * mergeUpstream({ rebase: true });
 *
 * // Rebase 到指定 tag（将本地提交重放到 tag 之上）
 * mergeUpstream({ targetTag: 'v2.1.0', rebase: true });
 */
export function mergeUpstream(options: MergeOptions = {}): MergeResult {
  const { targetTag, isDowngrade, rebase } = options;
  const normalizedTag = targetTag ? normalizeTag(targetTag) : null;
  const targetRef = normalizedTag || `${UPSTREAM_REMOTE}/${MAIN_BRANCH}`;

  try {
    if (rebase) {
      // Rebase 模式：将本地提交重放到目标引用之上
      git(`rebase ${targetRef}`);
    } else if (isDowngrade && normalizedTag) {
      // 降级使用 checkout + commit 保留提交历史
      git(`checkout ${normalizedTag} -- .`);
      // 检查是否有变化需要提交
      const status = gitSafe('status --porcelain') || '';
      if (status.trim().length > 0) {
        git(`commit -m "Downgrade to ${normalizedTag}"`);
      }
    } else {
      // 默认使用 squash merge 保持提交历史干净线性
      // --allow-unrelated-histories 确保首次更新时正常工作
      git(`merge --squash --allow-unrelated-histories ${targetRef}`);

      // 检查是否有变化需要提交
      const status = gitSafe('status --porcelain') || '';
      if (status.trim().length > 0) {
        // 获取目标版本信息用于 commit message
        let versionInfo = 'latest';
        if (normalizedTag) {
          versionInfo = normalizedTag;
        } else {
          // 尝试从 package.json 获取版本
          const packageJsonContent = gitSafe(`show ${targetRef}:package.json`);
          if (packageJsonContent) {
            try {
              const packageJson = JSON.parse(packageJsonContent);
              if (packageJson.version) {
                versionInfo = `v${packageJson.version}`;
              }
            } catch {
              // JSON parse failed, use 'latest'
            }
          }
        }
        git(`commit -m "chore: update theme to ${versionInfo}\n\nSquashed merge from upstream"`);
      }
    }
    return {
      success: true,
      hasConflict: false,
      conflictFiles: [],
    };
  } catch (error) {
    // 降级可能产生冲突（checkout 文件后的 commit 失败等情况）
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
      return {
        success: false,
        hasConflict: true,
        conflictFiles,
        // 如果是 rebase 模式，标记为 rebase 冲突
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

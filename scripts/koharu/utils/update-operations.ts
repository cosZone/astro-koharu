import { execSync, spawn } from 'node:child_process';
import { PROJECT_ROOT } from '../constants/paths';
import {
  type CommitInfo,
  type GitStatusInfo,
  MAIN_BRANCH,
  type MergeResult,
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
 * 获取更新信息
 */
export function getUpdateInfo(): UpdateInfo {
  const hasUpstream = hasUpstreamRemote();

  if (!hasUpstream) {
    return {
      hasUpstream: false,
      behindCount: 0,
      aheadCount: 0,
      commits: [],
      currentVersion: getVersion(),
      latestVersion: 'unknown',
    };
  }

  // Get ahead/behind counts
  const revList = gitSafe(`rev-list --left-right --count HEAD...${UPSTREAM_REMOTE}/${MAIN_BRANCH}`) || '0\t0';
  const [aheadStr, behindStr] = revList.split('\t');
  const aheadCount = Number.parseInt(aheadStr, 10) || 0;
  const behindCount = Number.parseInt(behindStr, 10) || 0;

  // Get new commits from upstream
  const commitFormat = '%h|%s|%ar|%an';
  const commitsOutput =
    gitSafe(`log HEAD..${UPSTREAM_REMOTE}/${MAIN_BRANCH} --pretty=format:"${commitFormat}" --no-merges`) || '';
  const commits = parseCommits(commitsOutput);

  // Try to get latest version from upstream package.json
  let parsedVersion = 'unknown';
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

  return {
    hasUpstream: true,
    behindCount,
    aheadCount,
    commits,
    currentVersion: getVersion(),
    latestVersion: parsedVersion,
  };
}

/**
 * 执行合并
 */
export function mergeUpstream(): MergeResult {
  try {
    git(`merge ${UPSTREAM_REMOTE}/${MAIN_BRANCH} --no-edit`);
    return {
      success: true,
      hasConflict: false,
      conflictFiles: [],
    };
  } catch (error) {
    const conflictFiles = getConflictFiles();

    if (conflictFiles.length > 0) {
      return {
        success: false,
        hasConflict: true,
        conflictFiles,
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

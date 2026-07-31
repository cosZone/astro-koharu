import { execSync } from 'node:child_process';

import { PROJECT_ROOT } from '../constants/paths';
import type { GitCommand } from '../constants/update';

/**
 * Run a git command in the project root.
 *
 * This module is the only place that shells out to git; every decision about
 * which commands to run belongs to `update-policy.ts`.
 */
export function git(args: string): string {
  return gitRaw(args).trim();
}

/** Run a git command without trimming, for output whose leading whitespace is significant. */
function gitRaw(args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      throw new Error((error as { stderr: string }).stderr || error.message);
    }
    throw error;
  }
}

/** Run a git command, returning null instead of throwing when it exits non-zero. */
export function gitSafe(args: string): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

/** Run a planned command list in order; `safe` commands may fail without aborting. */
export function runGitCommands(commands: GitCommand[]): void {
  for (const command of commands) {
    if (command.safe) gitSafe(command.args);
    else git(command.args);
  }
}

/** Split newline-separated git output into trimmed, non-empty entries. */
export function parseGitLines(output: string | null): string[] {
  return (output ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Reduce a remote URL to `host/path` so SSH and HTTPS forms compare equal. */
export function normalizeRemoteUrl(url: string): string {
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

export function getRemoteUrl(remote: string): string | null {
  return gitSafe(`remote get-url ${remote}`);
}

export function addRemote(remote: string, url: string): boolean {
  try {
    git(`remote add ${remote} ${url}`);
    return true;
  } catch {
    return false;
  }
}

export function fetchRemote(remote: string): boolean {
  try {
    git(`fetch ${remote}`);
    return true;
  } catch {
    return false;
  }
}

export function hasRef(ref: string): boolean {
  return Boolean(gitSafe(`show-ref --verify ${ref}`));
}

/** `status --porcelain` lines with their two-char status prefix (and its leading space) intact. */
export function getStatusLines(): string[] {
  let output: string;
  try {
    output = gitRaw('status --porcelain');
  } catch {
    return [];
  }
  return output.split('\n').filter((line) => line.trim().length > 0);
}

export function getCurrentBranch(): string {
  return git('rev-parse --abbrev-ref HEAD');
}

export function getHeadSha(): string {
  return git('rev-parse HEAD');
}

/** Read a file from a git ref, or null when the ref or path is missing. */
export function showFile(ref: string, filePath: string): string | null {
  return gitSafe(`show ${ref}:${filePath}`);
}

/** Keep the local version of a conflicted file and stage it; returns false when it stays conflicted. */
export function keepOursAndStage(filePath: string): boolean {
  const checkoutOk = gitSafe(`checkout --ours -- "${filePath}"`) !== null;
  const addOk = checkoutOk && gitSafe(`add -- "${filePath}"`) !== null;
  // Restore the conflict markers so the user can resolve the file manually.
  if (checkoutOk && !addOk) gitSafe(`checkout -m -- "${filePath}"`);
  return addOk;
}

export function abortMerge(): boolean {
  try {
    git('merge --abort');
    return true;
  } catch {
    return false;
  }
}

export function abortRebase(): boolean {
  try {
    git('rebase --abort');
    return true;
  } catch {
    return false;
  }
}

export function resetHard(sha: string): void {
  gitSafe(`reset --hard ${sha}`);
}

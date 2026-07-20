import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT } from '../constants';

function validateTarEntries(entries: string[], archivePath: string): void {
  for (const entry of entries) {
    if (!entry) {
      continue;
    }

    if (entry.includes('\0')) {
      throw new Error(`tar entry contains null byte in ${archivePath}`);
    }

    const normalized = path.posix.normalize(entry);
    if (normalized === '.' || normalized === '') {
      continue;
    }

    if (path.posix.isAbsolute(normalized)) {
      throw new Error(`tar entry is absolute path: ${entry}`);
    }

    const parts = normalized.split('/');
    if (parts.includes('..')) {
      throw new Error(`tar entry contains parent traversal: ${entry}`);
    }
  }
}

function validateTarEntryTypes(archivePath: string, entryCount: number): void {
  const result = spawnSync('tar', ['-tvzf', archivePath], {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
  });
  if (result.status !== 0) {
    throw new Error(`tar verbose list failed: ${result.stderr?.toString() || 'unknown error'}`);
  }

  const lines = result.stdout.split('\n').filter(Boolean);
  if (lines.length !== entryCount) {
    throw new Error(`tar verbose listing is inconsistent: ${archivePath}`);
  }

  for (const line of lines) {
    const entryType = line[0];
    if (entryType !== '-' && entryType !== 'd') {
      throw new Error(`tar entry has unsupported type "${entryType || 'unknown'}": ${archivePath}`);
    }
  }
}

function listTarEntries(archivePath: string): string[] {
  const result = spawnSync('tar', ['-tzf', archivePath], {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
  });
  if (result.status !== 0) {
    throw new Error(`tar list failed: ${result.stderr?.toString() || 'unknown error'}`);
  }
  const entries = result.stdout.split('\n').filter(Boolean);
  validateTarEntries(entries, archivePath);
  validateTarEntryTypes(archivePath, entries.length);
  return entries;
}

/**
 * 从 tar.gz 中提取 manifest.json 内容（不解压整个文件）
 */
export function tarExtractManifest(archivePath: string): string | null {
  const result = spawnSync('tar', ['-xzf', archivePath, '-O', 'manifest.json'], {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.status === 0 && result.stdout) {
    return result.stdout;
  }
  return null;
}

/**
 * 列出 tar.gz 归档内容
 */
export function tarList(archivePath: string): string[] {
  return listTarEntries(archivePath);
}

/**
 * 创建 tar.gz 归档
 */
export function tarCreate(archivePath: string, sourceDir: string): void {
  const archiveHandle = fs.openSync(archivePath, 'wx', 0o600);
  fs.closeSync(archiveHandle);
  fs.chmodSync(archivePath, 0o600);

  const result = spawnSync('tar', ['-czf', archivePath, '-C', sourceDir, '.'], {
    cwd: PROJECT_ROOT,
  });
  if (result.status !== 0) {
    fs.rmSync(archivePath, { force: true });
    throw new Error(`tar create failed: ${result.stderr?.toString() || 'unknown error'}`);
  }
  fs.chmodSync(archivePath, 0o600);
}

/**
 * 解压 tar.gz 归档到指定目录
 */
export function tarExtract(archivePath: string, destDir: string): void {
  listTarEntries(archivePath);
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], {
    cwd: PROJECT_ROOT,
  });
  if (result.status !== 0) {
    throw new Error(`tar extract failed: ${result.stderr?.toString() || 'unknown error'}`);
  }
}

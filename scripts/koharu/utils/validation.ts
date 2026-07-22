import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BACKUP_DIR,
  BACKUP_FILE_EXTENSION,
  BACKUP_ITEM_BY_DESTINATION,
  BACKUP_ITEMS,
  BACKUP_SCHEMA_VERSION,
  type BackupItem,
  type BackupType,
  LEGACY_BACKUP_LAYOUTS,
  MANIFEST_NAME,
} from '../constants';
import { tarExtractManifest, tarList } from './tar';

export interface ValidatedBackupManifest {
  name: typeof MANIFEST_NAME;
  schemaVersion: number;
  version?: string;
  type: BackupType;
  timestamp?: string;
  created_at?: string;
  files: Record<string, boolean>;
}

export interface ValidatedBackupArchive {
  path: string;
  manifest: ValidatedBackupManifest;
  items: BackupItem[];
}

/**
 * 验证路径是否在指定目录内（防止路径遍历攻击）
 * @param targetPath 目标路径
 * @param allowedDir 允许的目录
 * @returns 是否在允许目录内
 */
export function isPathWithinDir(targetPath: string, allowedDir: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedDir = path.resolve(allowedDir);
  return resolvedTarget.startsWith(`${resolvedDir}${path.sep}`) || resolvedTarget === resolvedDir;
}

/**
 * 验证路径是否在备份目录内
 */
export function isPathWithinBackupDir(targetPath: string): boolean {
  return isPathWithinDir(targetPath, BACKUP_DIR);
}

/**
 * 验证是否为有效的备份文件
 * @param filePath 文件路径
 * @returns 是否有效
 */
export function isValidBackupFile(filePath: string): boolean {
  // 检查扩展名
  if (!filePath.endsWith(BACKUP_FILE_EXTENSION)) {
    return false;
  }

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    return false;
  }

  // 检查是否为文件（不是目录）
  try {
    const stats = fs.lstatSync(filePath);
    return stats.isFile() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

function validateBackupPath(filePath: string): string {
  const resolved = path.resolve(filePath);

  if (!isPathWithinBackupDir(resolved)) {
    throw new Error(`备份文件不在备份目录内: ${filePath}`);
  }

  if (!isValidBackupFile(resolved)) {
    throw new Error(`无效的备份文件: ${filePath}`);
  }

  return resolved;
}

function hasExactKeys(keys: string[], expected: readonly string[]): boolean {
  const expectedKeys = new Set(expected);
  return keys.length === expectedKeys.size && keys.every((key) => expectedKeys.has(key));
}

function resolveManifestItems(schemaVersion: number, type: BackupType, fileKeys: string[], archivePath: string): BackupItem[] {
  let expectedDestinations: readonly string[] | undefined;

  if (schemaVersion === 1) {
    const layout = LEGACY_BACKUP_LAYOUTS.find((candidate) => {
      const expected =
        type === 'full' ? [...candidate.basicDestinations, ...candidate.fullOnlyDestinations] : candidate.basicDestinations;
      return hasExactKeys(fileKeys, expected);
    });
    expectedDestinations = layout
      ? type === 'full'
        ? [...layout.basicDestinations, ...layout.fullOnlyDestinations]
        : layout.basicDestinations
      : undefined;
  } else {
    const expectedItems = BACKUP_ITEMS.filter((item) => item.required || type === 'full');
    const expected = expectedItems.map((item) => item.dest);
    if (hasExactKeys(fileKeys, expected)) expectedDestinations = expected;
  }

  if (!expectedDestinations) {
    throw new Error(`备份 manifest files 与 ${type} 备份类型不一致: ${archivePath}`);
  }

  return expectedDestinations.map((destination) => {
    const item = BACKUP_ITEM_BY_DESTINATION.get(destination);
    if (!item) throw new Error(`备份 manifest files 包含未知路径: ${destination}`);
    return item;
  });
}

function parseBackupManifest(
  rawManifest: string,
  archivePath: string,
): { manifest: ValidatedBackupManifest; items: BackupItem[] } {
  let value: unknown;
  try {
    value = JSON.parse(rawManifest);
  } catch {
    throw new Error(`备份 manifest.json 不是有效 JSON: ${archivePath}`);
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`备份 manifest.json 格式无效: ${archivePath}`);
  }

  const manifest = value as Record<string, unknown>;
  if (manifest.name !== MANIFEST_NAME) {
    throw new Error(`备份 manifest 名称无效: ${archivePath}`);
  }

  const schemaVersion = manifest.schemaVersion === undefined ? 1 : manifest.schemaVersion;
  if (
    typeof schemaVersion !== 'number' ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1 ||
    schemaVersion > BACKUP_SCHEMA_VERSION
  ) {
    throw new Error(`不支持的备份 schemaVersion: ${String(schemaVersion)}`);
  }

  if (manifest.type !== 'basic' && manifest.type !== 'full') {
    throw new Error(`备份 manifest 类型无效: ${archivePath}`);
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    throw new Error(`备份 manifest files 无效: ${archivePath}`);
  }

  const files = manifest.files as Record<string, unknown>;
  const fileKeys = Object.keys(files);
  const items = resolveManifestItems(schemaVersion, manifest.type, fileKeys, archivePath);
  for (const destination of fileKeys) {
    if (typeof files[destination] !== 'boolean') {
      throw new Error(`备份 manifest files.${destination} 必须为布尔值`);
    }
  }

  return {
    manifest: {
      name: MANIFEST_NAME,
      schemaVersion,
      version: typeof manifest.version === 'string' ? manifest.version : undefined,
      type: manifest.type,
      timestamp: typeof manifest.timestamp === 'string' ? manifest.timestamp : undefined,
      created_at: typeof manifest.created_at === 'string' ? manifest.created_at : undefined,
      files: Object.fromEntries(fileKeys.map((key) => [key, files[key] as boolean])),
    },
    items,
  };
}

function normalizeArchiveEntry(entry: string): string {
  return entry.replace(/^\.\//, '').replace(/\/$/, '');
}

function assertManifestMatchesArchive(manifest: ValidatedBackupManifest, rawEntries: string[], archivePath: string): void {
  const entries = rawEntries.map((raw) => ({ raw, path: normalizeArchiveEntry(raw) }));
  const manifestEntries = entries.filter((entry) => entry.path === 'manifest.json');
  if (manifestEntries.length !== 1 || manifestEntries[0].raw.endsWith('/')) {
    throw new Error(`备份必须且只能包含一个 manifest.json: ${archivePath}`);
  }

  const presentDestinations = Object.entries(manifest.files)
    .filter(([, present]) => present)
    .map(([destination]) => destination);

  for (const [destination, present] of Object.entries(manifest.files)) {
    const hasArchivedContent = entries.some((entry) => entry.path === destination || entry.path.startsWith(`${destination}/`));
    if (present !== hasArchivedContent) {
      throw new Error(`备份 manifest files.${destination} 与归档内容不一致`);
    }
  }

  for (const entry of entries) {
    if (!entry.path || entry.path === '.' || entry.path === 'manifest.json') continue;
    const belongsToDeclaredItem = presentDestinations.some(
      (destination) => entry.path === destination || entry.path.startsWith(`${destination}/`),
    );
    const isParentDirectory =
      entry.raw.endsWith('/') && presentDestinations.some((destination) => destination.startsWith(`${entry.path}/`));
    if (!belongsToDeclaredItem && !isParentDirectory) {
      throw new Error(`备份包含 manifest 未声明的内容: ${entry.path}`);
    }
  }
}

function validateBackupArchiveContents(archivePath: string, diagnosticPath = archivePath): ValidatedBackupArchive {
  const entries = tarList(archivePath);
  const rawManifest = tarExtractManifest(archivePath);
  if (!rawManifest) {
    throw new Error(`备份缺少 manifest.json: ${diagnosticPath}`);
  }

  const { manifest, items } = parseBackupManifest(rawManifest, diagnosticPath);
  assertManifestMatchesArchive(manifest, entries, diagnosticPath);
  return { path: archivePath, manifest, items };
}

function createPrivateArchiveSnapshot(filePath: string): { path: string; sourcePath: string; cleanup: () => void } {
  const resolved = validateBackupPath(filePath);
  const snapshotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-koharu-backup-snapshot-'));
  const snapshotPath = path.join(snapshotDir, 'archive.tar.gz');
  let sourceHandle: number | null = null;
  let snapshotHandle: number | null = null;

  try {
    fs.chmodSync(snapshotDir, 0o700);
    sourceHandle = fs.openSync(resolved, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    if (!fs.fstatSync(sourceHandle).isFile()) {
      throw new Error(`无效的备份文件: ${filePath}`);
    }

    snapshotHandle = fs.openSync(snapshotPath, 'wx', 0o600);
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let bytesRead = fs.readSync(sourceHandle, buffer, 0, buffer.length, null);
    while (bytesRead > 0) {
      let bytesWritten = 0;
      while (bytesWritten < bytesRead) {
        bytesWritten += fs.writeSync(snapshotHandle, buffer, bytesWritten, bytesRead - bytesWritten);
      }
      bytesRead = fs.readSync(sourceHandle, buffer, 0, buffer.length, null);
    }
    fs.fsyncSync(snapshotHandle);
    fs.closeSync(snapshotHandle);
    snapshotHandle = null;
    fs.chmodSync(snapshotPath, 0o400);

    return {
      path: snapshotPath,
      sourcePath: resolved,
      cleanup: () => fs.rmSync(snapshotDir, { recursive: true, force: true }),
    };
  } catch (error) {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
    throw error;
  } finally {
    if (snapshotHandle !== null) fs.closeSync(snapshotHandle);
    if (sourceHandle !== null) fs.closeSync(sourceHandle);
  }
}

/** Validate and use one private archive snapshot so later extraction cannot observe a replaced source file. */
export function withValidatedBackupArchiveSnapshot<T>(
  filePath: string,
  consumeSnapshot: (archive: ValidatedBackupArchive) => T,
): T {
  const snapshot = createPrivateArchiveSnapshot(filePath);
  try {
    return consumeSnapshot(validateBackupArchiveContents(snapshot.path, snapshot.sourcePath));
  } finally {
    snapshot.cleanup();
  }
}

/** Validate the archive path and its complete manifest/archive contract. */
export function validateBackupArchive(filePath: string): ValidatedBackupArchive {
  const resolved = validateBackupPath(filePath);
  return validateBackupArchiveContents(resolved);
}

/**
 * Validate and normalize a backup file path.
 * @param filePath Backup file path.
 * @throws Error When the path is invalid.
 * @returns The normalized path.
 */
export function validateBackupFilePath(filePath: string): string {
  return validateBackupArchive(filePath).path;
}

/**
 * 验证路径是否在备份目录内，并返回规范化路径
 * @param filePath 文件路径
 * @throws Error 如果路径不在备份目录内
 * @returns 规范化后的路径
 */
export function validatePathInBackupDir(filePath: string): string {
  const resolved = path.resolve(filePath);

  if (!isPathWithinBackupDir(resolved)) {
    throw new Error(`路径不在备份目录内: ${filePath}`);
  }

  return resolved;
}

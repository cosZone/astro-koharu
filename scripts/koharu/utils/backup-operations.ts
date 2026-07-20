import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_DIR, BACKUP_ITEMS, BACKUP_SCHEMA_VERSION, type BackupItem, MANIFEST_NAME, PROJECT_ROOT } from '../constants';
import { tarCreate } from './tar';
import { getVersion } from './version';

/**
 * 备份结果
 */
export interface BackupResult {
  item: BackupItem;
  success: boolean;
  skipped: boolean;
}

/**
 * 备份输出
 */
export interface BackupOutput {
  results: BackupResult[];
  backupFile: string;
  fileSize: number;
  timestamp: string;
}

/** Validate that a source can be represented by the restore contract. */
export function validateBackupSource(item: BackupItem, sourcePath: string): void {
  const stat = fs.lstatSync(sourcePath);
  if (stat.isSymbolicLink()) {
    throw new Error(`备份源不能是符号链接: ${item.src}`);
  }

  const matchesExpectedType = item.kind === 'directory' ? stat.isDirectory() : stat.isFile();
  if (!matchesExpectedType) {
    const expected = item.kind === 'directory' ? '目录' : '普通文件';
    throw new Error(`备份源 ${item.src} 类型无效，应为${expected}`);
  }

  if (!stat.isDirectory() || item.pattern) return;
  for (const entry of fs.readdirSync(sourcePath)) {
    validateBackupTree(path.join(sourcePath, entry), item.src);
  }
}

function validateBackupTree(sourcePath: string, itemSource: string): void {
  const stat = fs.lstatSync(sourcePath);
  if (stat.isSymbolicLink()) {
    throw new Error(`备份源 ${itemSource} 包含符号链接: ${sourcePath}`);
  }
  if (stat.isFile()) return;
  if (!stat.isDirectory()) {
    throw new Error(`备份源 ${itemSource} 包含不支持的文件类型: ${sourcePath}`);
  }

  for (const entry of fs.readdirSync(sourcePath)) {
    validateBackupTree(path.join(sourcePath, entry), itemSource);
  }
}

/**
 * 执行备份操作
 * @param isFullBackup 是否完整备份
 * @param onProgress 进度回调
 */
export function runBackup(isFullBackup: boolean, onProgress?: (results: BackupResult[]) => void): BackupOutput {
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const backupDirStat = fs.lstatSync(BACKUP_DIR);
  if (!backupDirStat.isDirectory() || backupDirStat.isSymbolicLink()) {
    throw new Error(`备份目录无效或为符号链接: ${BACKUP_DIR}`);
  }
  fs.chmodSync(BACKUP_DIR, 0o700);

  // 生成时间戳
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '-').replace(/Z$/, '');
  const backupName = `backup-${timestamp}-${randomBytes(4).toString('hex')}`;
  const tempDir = fs.mkdtempSync(path.join(BACKUP_DIR, `.tmp-${backupName}-`));
  const backupFilePath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);

  fs.chmodSync(tempDir, 0o700);

  const results: BackupResult[] = [];

  // 过滤要备份的项目
  const itemsToBackup = BACKUP_ITEMS.filter((item) => item.required || isFullBackup);

  try {
    // Run the backup.
    for (const item of itemsToBackup) {
      const srcPath = path.join(PROJECT_ROOT, item.src);
      const destPath = path.join(tempDir, item.dest);

      if (fs.existsSync(srcPath)) {
        validateBackupSource(item, srcPath);
        if (item.pattern && fs.statSync(srcPath).isDirectory()) {
          const ext = item.pattern.startsWith('*.') ? item.pattern.slice(1) : null;
          const entries = fs.readdirSync(srcPath, { withFileTypes: true });
          const files = entries.filter((e) => e.isFile() && (!ext || e.name.endsWith(ext)));

          // Keep the empty directory in the archive so restore can distinguish
          // "no custom files" from "this backup item did not exist".
          fs.mkdirSync(destPath, { recursive: true });
          for (const file of files) {
            fs.cpSync(path.join(srcPath, file.name), path.join(destPath, file.name));
          }
          results.push({ item, success: true, skipped: false });
        } else {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.cpSync(srcPath, destPath, { recursive: true });
          results.push({ item, success: true, skipped: false });
        }
      } else {
        results.push({ item, success: false, skipped: true });
      }

      onProgress?.([...results]);
    }

    // Generate manifest.json.
    const manifest = {
      name: MANIFEST_NAME,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      version: getVersion(),
      type: isFullBackup ? 'full' : 'basic',
      timestamp,
      created_at: now.toISOString(),
      files: Object.fromEntries(results.map((r) => [r.item.dest, r.success])),
    };
    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });

    // Create the archive.
    tarCreate(backupFilePath, tempDir);

    // Get the archive size.
    const stats = fs.statSync(backupFilePath);

    return {
      results,
      backupFile: backupFilePath,
      fileSize: stats.size,
      timestamp,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_DIR, BACKUP_ITEMS, type BackupItem, MANIFEST_NAME, PROJECT_ROOT } from '../constants';
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

/**
 * 执行备份操作
 * @param isFullBackup 是否完整备份
 * @param onProgress 进度回调
 */
export function runBackup(isFullBackup: boolean, onProgress?: (results: BackupResult[]) => void): BackupOutput {
  // 创建备份目录
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // 生成时间戳
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
  const backupName = `backup-${timestamp}`;
  const tempDir = path.join(BACKUP_DIR, `.tmp-${backupName}`);
  const backupFilePath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);

  // 清理并创建临时目录
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const results: BackupResult[] = [];

  // 过滤要备份的项目
  const itemsToBackup = BACKUP_ITEMS.filter((item) => item.required || isFullBackup);

  // 执行备份
  for (const item of itemsToBackup) {
    const srcPath = path.join(PROJECT_ROOT, item.src);
    const destPath = path.join(tempDir, item.dest);

    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.cpSync(srcPath, destPath, { recursive: true });
      results.push({ item, success: true, skipped: false });
    } else {
      results.push({ item, success: false, skipped: true });
    }

    onProgress?.([...results]);
  }

  // 生成 manifest.json
  const manifest = {
    name: MANIFEST_NAME,
    version: getVersion(),
    type: isFullBackup ? 'full' : 'basic',
    timestamp,
    created_at: now.toISOString(),
    files: Object.fromEntries(results.map((r) => [r.item.dest, r.success])),
  };
  fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // 创建压缩包
  tarCreate(backupFilePath, tempDir);

  // 清理临时目录
  fs.rmSync(tempDir, { recursive: true, force: true });

  // 获取文件大小
  const stats = fs.statSync(backupFilePath);

  return {
    results,
    backupFile: backupFilePath,
    fileSize: stats.size,
    timestamp,
  };
}

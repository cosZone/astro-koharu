import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_DIR, BACKUP_FILE_EXTENSION } from '../constants';
import { formatSize } from './format';
import { tarExtractManifest } from './tar';
import { validateBackupArchive } from './validation';

/**
 * 备份信息接口
 */
export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  type: string;
  timestamp: string;
}

/**
 * 解析备份 manifest
 */
export function parseBackupManifest(manifest: string): { type: string; timestamp: string } {
  try {
    const data = JSON.parse(manifest);
    return {
      type: data.type || 'unknown',
      timestamp: data.timestamp || '',
    };
  } catch {
    return { type: 'unknown', timestamp: '' };
  }
}

/**
 * 获取备份列表
 */
export function getBackupList(): BackupInfo[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(BACKUP_FILE_EXTENSION))
    .sort()
    .reverse();

  return files.map((name) => {
    const filePath = path.join(BACKUP_DIR, name);
    const stats = fs.statSync(filePath);

    let type = 'unknown';
    let timestamp = '';
    try {
      const rawManifest = tarExtractManifest(filePath);
      if (rawManifest) ({ type, timestamp } = parseBackupManifest(rawManifest));
    } catch {
      // Invalid archives remain visible to the cleanup command.
    }

    return { name, path: filePath, size: stats.size, sizeFormatted: formatSize(stats.size), type, timestamp };
  });
}

/** Return only archives that are safe to offer in the restore picker. */
export function getRestorableBackupList(): BackupInfo[] {
  return getBackupList().filter((backup) => {
    try {
      validateBackupArchive(backup.path);
      return true;
    } catch {
      return false;
    }
  });
}

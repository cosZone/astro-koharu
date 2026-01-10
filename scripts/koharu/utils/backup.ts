import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_DIR, BACKUP_FILE_EXTENSION } from '../constants';
import { formatSize } from './format';
import { tarExtractManifest } from './tar';

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

    // 尝试读取 manifest
    let type = 'unknown';
    let timestamp = '';
    try {
      const manifest = tarExtractManifest(filePath);
      if (manifest) {
        const parsed = parseBackupManifest(manifest);
        type = parsed.type;
        timestamp = parsed.timestamp;
      }
    } catch {
      // ignore
    }

    return {
      name,
      path: filePath,
      size: stats.size,
      sizeFormatted: formatSize(stats.size),
      type,
      timestamp,
    };
  });
}

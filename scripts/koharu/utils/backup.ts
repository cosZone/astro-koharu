import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_FILE_EXTENSION, DEFAULT_WORKSPACE, type KoharuWorkspace } from '../constants';
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
export function getBackupList(workspace: KoharuWorkspace = DEFAULT_WORKSPACE): BackupInfo[] {
  const { backupDir } = workspace;
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(BACKUP_FILE_EXTENSION))
    .sort()
    .reverse();

  return files.map((name) => {
    const filePath = path.join(backupDir, name);
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
export function getRestorableBackupList(workspace: KoharuWorkspace = DEFAULT_WORKSPACE): BackupInfo[] {
  return getBackupList(workspace).filter((backup) => {
    try {
      validateBackupArchive(backup.path, workspace.backupDir);
      return true;
    } catch {
      return false;
    }
  });
}

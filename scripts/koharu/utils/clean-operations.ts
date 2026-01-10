import fs from 'node:fs';

import { isValidBackupFile, validatePathInBackupDir } from './validation';

/**
 * 删除结果
 */
export interface DeleteResult {
  deletedCount: number;
  freedSpace: number;
  skippedCount: number;
}

/**
 * 删除备份文件
 * @param paths 要删除的文件路径列表
 * @returns 删除结果
 */
export function deleteBackups(paths: string[]): DeleteResult {
  let freedSpace = 0;
  let deletedCount = 0;
  let skippedCount = 0;

  for (const filePath of paths) {
    try {
      // 验证路径是否在备份目录内
      const validatedPath = validatePathInBackupDir(filePath);

      if (!isValidBackupFile(validatedPath)) {
        skippedCount++;
        continue;
      }

      const stats = fs.statSync(validatedPath);
      freedSpace += stats.size;
      fs.unlinkSync(validatedPath);
      deletedCount++;
    } catch {
      skippedCount++;
    }
  }

  return { deletedCount, freedSpace, skippedCount };
}

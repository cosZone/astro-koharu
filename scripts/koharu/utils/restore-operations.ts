import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { PROJECT_ROOT, RESTORE_MAP } from '../constants';
import { tarExtract, tarList } from './tar';
import { validateBackupFilePath } from './validation';

/** 还原预览项 */
export interface RestorePreviewItem {
  /** 目标路径 (e.g., 'src/content/blog') */
  path: string;
  /** 文件数量 */
  fileCount: number;
}

/**
 * 获取还原预览（不修改文件）
 * @param backupPath 备份文件路径
 * @returns 将要还原的项目列表
 */
export function getRestorePreview(backupPath: string): RestorePreviewItem[] {
  // 验证备份文件
  const validatedPath = validateBackupFilePath(backupPath);

  const rawFiles = tarList(validatedPath);
  // 清理路径：移除 ./ 前缀和尾部斜杠
  const files = rawFiles.map((f) => f.replace(/^\.\//, '').replace(/\/$/, '')).filter((f) => f && f !== 'manifest.json');

  const previewItems: RestorePreviewItem[] = [];

  for (const [src, dest] of Object.entries(RESTORE_MAP)) {
    // 检查此 RESTORE_MAP 条目是否存在于归档中
    const matchingFiles = files.filter((f) => f === src || f.startsWith(`${src}/`));

    if (matchingFiles.length > 0) {
      // 只计算实际文件（排除目录本身）
      const fileCount = matchingFiles.filter((f) => f !== src).length;
      previewItems.push({ path: dest, fileCount: fileCount || 1 });
    }
  }

  return previewItems;
}

/**
 * 执行还原操作
 * @param backupPath 备份文件路径
 * @returns 已还原的文件列表（目标路径）
 */
export function restoreBackup(backupPath: string): string[] {
  // 验证备份文件
  const validatedPath = validateBackupFilePath(backupPath);

  // 创建临时目录
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-koharu-restore-'));

  try {
    // 解压到临时目录
    tarExtract(validatedPath, tempDir);

    const restored: string[] = [];

    // 还原文件
    for (const [src, dest] of Object.entries(RESTORE_MAP)) {
      const srcPath = path.join(tempDir, src);
      const destPath = path.join(PROJECT_ROOT, dest);

      if (fs.existsSync(srcPath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.cpSync(srcPath, destPath, { recursive: true });
        restored.push(dest);
      }
    }

    return restored;
  } finally {
    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

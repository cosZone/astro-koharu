import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_DIR, BACKUP_FILE_EXTENSION } from '../constants';

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
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * 验证并规范化备份文件路径
 * @param filePath 文件路径
 * @throws Error 如果路径无效
 * @returns 规范化后的路径
 */
export function validateBackupFilePath(filePath: string): string {
  const resolved = path.resolve(filePath);

  if (!isPathWithinBackupDir(resolved)) {
    throw new Error(`备份文件不在备份目录内: ${filePath}`);
  }

  if (!isValidBackupFile(resolved)) {
    throw new Error(`无效的备份文件: ${filePath}`);
  }

  return resolved;
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

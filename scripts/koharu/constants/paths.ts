import path from 'node:path';

/** 项目根目录 */
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');

/** 备份存储目录 */
export const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

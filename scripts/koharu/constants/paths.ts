import path from 'node:path';

/** 项目根目录 */
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');

/** 备份存储目录 */
export const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

/** 站点配置文件路径 */
export const SITE_CONFIG_PATH = path.join(PROJECT_ROOT, 'config/site.yaml');

/** 博客内容目录路径 */
export const BLOG_CONTENT_PATH = path.join(PROJECT_ROOT, 'src/content/blog');

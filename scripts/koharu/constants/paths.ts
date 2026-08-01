import path from 'node:path';

/** 项目根目录 */
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');

/** Root package manifest path. */
export const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

/** 备份存储目录 */
export const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

/** 站点配置文件路径 */
export const SITE_CONFIG_PATH = path.join(PROJECT_ROOT, 'config/site.yaml');

/** 博客内容目录路径 */
export const BLOG_CONTENT_PATH = path.join(PROJECT_ROOT, 'src/content/blog');

/** Every root-relative location the backup/restore/migrate operations touch. */
export interface KoharuWorkspace {
  root: string;
  backupDir: string;
  contentDir: string;
  siteConfigPath: string;
}

/** Derive a workspace from a project root; tests use a temporary root instead of the real project. */
export function createWorkspace(root: string): KoharuWorkspace {
  const resolvedRoot = path.resolve(root);
  return {
    root: resolvedRoot,
    backupDir: path.join(resolvedRoot, 'backups'),
    contentDir: path.join(resolvedRoot, 'src/content/blog'),
    siteConfigPath: path.join(resolvedRoot, 'config/site.yaml'),
  };
}

/** The workspace every command defaults to. */
export const DEFAULT_WORKSPACE = createWorkspace(PROJECT_ROOT);

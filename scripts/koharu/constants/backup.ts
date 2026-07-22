/** Backup type. */
export type BackupType = 'full' | 'basic';

/** Manifest application name. */
export const MANIFEST_NAME = 'astro-koharu-backup';

/** Backup schema version; archives without this field are treated as v1. */
export const BACKUP_SCHEMA_VERSION = 2;

/** Backup file extension. */
export const BACKUP_FILE_EXTENSION = '.tar.gz';

/** Backup item configuration. */
export interface BackupItem {
  /** Source path relative to the project root. */
  src: string;
  /** Destination path inside the archive. */
  dest: string;
  /** Display label. */
  label: string;
  /** Whether the item is required (included in basic mode). */
  required: boolean;
  /** Expected archive entry type. */
  kind: 'directory' | 'file';
  /** In directory mode, back up only files matching this pattern (e.g. '*.md'). */
  pattern?: string;
  /** Remove the destination before restore to avoid mixing snapshots with new sample content. */
  replaceOnRestore?: boolean;
}

/** Backup item list. */
export const BACKUP_ITEMS: BackupItem[] = [
  {
    src: 'src/content/blog',
    dest: 'content/blog',
    label: '博客文章',
    required: true,
    kind: 'directory',
    replaceOnRestore: true,
  },
  { src: 'config', dest: 'config', label: '网站配置', required: true, kind: 'directory' },
  { src: 'src/pages', dest: 'pages', label: '独立页面', required: true, kind: 'directory', pattern: '*.md' },
  {
    src: 'public/img',
    dest: 'img',
    label: '用户图片',
    required: true,
    kind: 'directory',
    replaceOnRestore: true,
  },
  { src: '.env', dest: 'env', label: '环境变量', required: true, kind: 'file' },
  // 完整备份额外项目
  { src: 'public/favicon.ico', dest: 'favicon.ico', label: '网站图标', required: false, kind: 'file' },
  { src: 'src/assets/lqips.json', dest: 'assets/lqips.json', label: 'LQIP 数据', required: false, kind: 'file' },
  {
    src: 'src/assets/similarities.json',
    dest: 'assets/similarities.json',
    label: '相似度数据',
    required: false,
    kind: 'file',
  },
  { src: 'src/assets/summaries.json', dest: 'assets/summaries.json', label: 'AI 摘要数据', required: false, kind: 'file' },
];

const FULL_BACKUP_DESTINATIONS = [
  'favicon.ico',
  'assets/lqips.json',
  'assets/similarities.json',
  'assets/summaries.json',
] as const;

export interface LegacyBackupLayout {
  basicDestinations: readonly string[];
  fullOnlyDestinations: readonly string[];
}

/** Exact manifest layouts emitted before backup schema versions were introduced. */
export const LEGACY_BACKUP_LAYOUTS: LegacyBackupLayout[] = [
  {
    basicDestinations: ['content/blog', 'config/site.yaml', 'pages/about.md', 'img/avatar.webp', 'env'],
    fullOnlyDestinations: ['img', ...FULL_BACKUP_DESTINATIONS],
  },
  {
    basicDestinations: ['content/blog', 'config/site.yaml', 'pages/about.md', 'img', 'env'],
    fullOnlyDestinations: FULL_BACKUP_DESTINATIONS,
  },
  {
    basicDestinations: ['content/blog', 'config/site.yaml', 'config/cms.yaml', 'pages/about.md', 'img', 'env'],
    fullOnlyDestinations: FULL_BACKUP_DESTINATIONS,
  },
  {
    basicDestinations: ['content/blog', 'config/site.yaml', 'pages', 'img', 'env'],
    fullOnlyDestinations: FULL_BACKUP_DESTINATIONS,
  },
  {
    basicDestinations: ['content/blog', 'config', 'pages', 'img', 'env'],
    fullOnlyDestinations: FULL_BACKUP_DESTINATIONS,
  },
];

const LEGACY_BACKUP_ITEM_ALIASES: BackupItem[] = [
  {
    src: 'config/site.yaml',
    dest: 'config/site.yaml',
    label: '网站配置',
    required: true,
    kind: 'file',
  },
  {
    src: 'config/cms.yaml',
    dest: 'config/cms.yaml',
    label: 'CMS 配置',
    required: true,
    kind: 'file',
  },
  {
    src: 'src/pages/about.md',
    dest: 'pages/about.md',
    label: '关于页面',
    required: true,
    kind: 'file',
  },
  {
    src: 'public/img/avatar.webp',
    dest: 'img/avatar.webp',
    label: '用户头像',
    required: true,
    kind: 'file',
  },
];

/** Archive destination to restore contract for versioned and historical backups. */
export const BACKUP_ITEM_BY_DESTINATION = new Map(
  [...BACKUP_ITEMS, ...LEGACY_BACKUP_ITEM_ALIASES].map((item) => [item.dest, item]),
);

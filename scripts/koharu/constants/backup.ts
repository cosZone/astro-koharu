/** 备份类型 */
export type BackupType = 'full' | 'basic';

/** Manifest 应用名称 */
export const MANIFEST_NAME = 'astro-koharu-backup';

/** Manifest 文件名 */
export const MANIFEST_FILENAME = 'manifest.json';

/** 备份文件扩展名 */
export const BACKUP_FILE_EXTENSION = '.tar.gz';

/** 临时备份目录前缀 */
export const TEMP_DIR_PREFIX = '.tmp-backup-';

/** 备份项配置 */
export interface BackupItem {
  /** 源路径（相对于项目根目录） */
  src: string;
  /** 备份内目标路径 */
  dest: string;
  /** 显示标签 */
  label: string;
  /** 是否为必需项（basic 模式包含） */
  required: boolean;
}

/** 备份项目列表 */
export const BACKUP_ITEMS: BackupItem[] = [
  { src: 'src/content/blog', dest: 'content/blog', label: '博客文章', required: true },
  { src: 'config/site.yaml', dest: 'config/site.yaml', label: '网站配置', required: true },
  { src: 'src/pages/about.md', dest: 'pages/about.md', label: '关于页面', required: true },
  { src: 'public/img', dest: 'img', label: '用户图片', required: true },
  { src: '.env', dest: 'env', label: '环境变量', required: true },
  // 完整备份额外项目
  { src: 'public/favicon.ico', dest: 'favicon.ico', label: '网站图标', required: false },
  { src: 'src/assets/lqips.json', dest: 'assets/lqips.json', label: 'LQIP 数据', required: false },
  { src: 'src/assets/similarities.json', dest: 'assets/similarities.json', label: '相似度数据', required: false },
  { src: 'src/assets/summaries.json', dest: 'assets/summaries.json', label: 'AI 摘要数据', required: false },
];

/** 还原文件映射（自动从 BACKUP_ITEMS 生成：备份路径 -> 项目路径） */
export const RESTORE_MAP: Record<string, string> = Object.fromEntries(BACKUP_ITEMS.map((item) => [item.dest, item.src]));

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { useInput } from 'ink';

// 按任意键继续的 hook
export function usePressAnyKey(enabled: boolean, onPress: () => void) {
  useInput(
    () => {
      onPress();
    },
    { isActive: enabled },
  );
}

// 项目根目录
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
export const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

// 备份项目配置
export interface BackupItem {
  src: string;
  dest: string;
  label: string;
  required: boolean;
}

export const backupItems: BackupItem[] = [
  { src: 'src/content/blog', dest: 'content/blog', label: '博客文章', required: true },
  { src: 'config/site.yaml', dest: 'config/site.yaml', label: '网站配置', required: true },
  { src: 'src/pages/about.md', dest: 'pages/about.md', label: '关于页面', required: true },
  { src: 'public/img/avatar.webp', dest: 'img/avatar.webp', label: '用户头像', required: true },
  { src: '.env', dest: 'env', label: '环境变量', required: true },
  // 完整备份额外项目
  { src: 'public/img', dest: 'img', label: '所有图片', required: false },
  { src: 'public/favicon.ico', dest: 'favicon.ico', label: '网站图标', required: false },
  { src: 'src/assets/lqips.json', dest: 'assets/lqips.json', label: 'LQIP 数据', required: false },
  { src: 'src/assets/similarities.json', dest: 'assets/similarities.json', label: '相似度数据', required: false },
  { src: 'src/assets/summaries.json', dest: 'assets/summaries.json', label: 'AI 摘要数据', required: false },
];

// 还原文件映射
export const restoreMap: Record<string, string> = {
  'content/blog': 'src/content/blog',
  'config/site.yaml': 'config/site.yaml',
  'pages/about.md': 'src/pages/about.md',
  env: '.env',
  img: 'public/img',
  'favicon.ico': 'public/favicon.ico',
  'assets/lqips.json': 'src/assets/lqips.json',
  'assets/similarities.json': 'src/assets/similarities.json',
  'assets/summaries.json': 'src/assets/summaries.json',
};

// 备份信息接口
export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  type: string;
  timestamp: string;
}

// 格式化文件大小
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// 获取版本号
export function getVersion(): string {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return pkg.version || 'unknown';
}

// 获取备份列表
export function getBackupList(): BackupInfo[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.tar.gz'))
    .sort()
    .reverse();

  return files.map((name) => {
    const filePath = path.join(BACKUP_DIR, name);
    const stats = fs.statSync(filePath);

    // 尝试读取 manifest
    let type = 'unknown';
    let timestamp = '';
    try {
      const manifest = execSync(`tar -xzf "${filePath}" -O manifest.json 2>/dev/null`, {
        encoding: 'utf-8',
        cwd: PROJECT_ROOT,
      });
      const data = JSON.parse(manifest);
      type = data.type || 'unknown';
      timestamp = data.timestamp || '';
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

// 解析命令行参数
export function parseArgs(argv: string[] = process.argv.slice(2)) {
  const args = {
    command: '' as string,
    full: false,
    latest: false,
    list: false,
    dryRun: false,
    force: false,
    help: false,
    keep: null as number | null,
    backupFile: '' as string,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--full') {
      args.full = true;
    } else if (arg === '--latest') {
      args.latest = true;
    } else if (arg === '--list') {
      args.list = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--keep' && argv[i + 1]) {
      const n = Number.parseInt(argv[i + 1], 10);
      if (!Number.isNaN(n) && n > 0) {
        args.keep = n;
      }
      i++;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      if (!args.command) {
        args.command = arg;
      } else {
        args.backupFile = arg;
      }
    }
  }

  return args;
}

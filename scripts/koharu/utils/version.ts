import fs from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT } from '../constants';

const DEFAULT_VERSION = 'unknown';
let cachedVersion: string | null = null;

/**
 * 获取 package.json 版本号（带缓存）
 */
export function getVersion(): string {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  let version: string;
  try {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    const content = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    version = typeof pkg.version === 'string' ? pkg.version : DEFAULT_VERSION;
  } catch {
    version = DEFAULT_VERSION;
  }

  cachedVersion = version;
  return version;
}

// 开启 slug transliteration 后，原有中文/日文 URL 将失效。
// 此脚本将原有 slug 写入 frontmatter.link 字段，保留旧链接。
// 用法: pnpm preserve-old-links [--dry-run]

import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { SiteYamlConfig } from '@lib/config/types';
import { glob } from 'glob';
import matter from 'gray-matter';
import { load } from 'js-yaml';

const dryRun = process.argv.includes('--dry-run');

const yamlConfig = load(readFileSync('config/site.yaml', 'utf8')) as SiteYamlConfig;
const locales = yamlConfig.i18n?.locales || [];
const defaultLocale = yamlConfig.i18n?.defaultLocale ?? 'zh';
const allKnownLocales = new Set(locales.map((l) => l.code));

// Mirrors getSlugLocaleInfo from src/lib/content/locale.ts
// Cannot import directly because that module depends on Astro build-time config
function stripLocalePrefix(slug: string): string {
  const firstSlash = slug.indexOf('/');
  if (firstSlash === -1) return slug;
  const firstSegment = slug.slice(0, firstSlash);
  if (firstSegment !== defaultLocale && allKnownLocales.has(firstSegment)) {
    return slug.slice(firstSlash + 1);
  }
  return slug;
}

const blogPath = 'src/content/blog';
const files = glob.sync(`${blogPath}/**/*.{md,mdx}`);
let processed = 0;

for (const filePath of files) {
  const raw = readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);

  if (data.link) continue;

  const rawSlug = relative(blogPath, filePath)
    .replace(/\\/g, '/')
    .replace(/\.(md|mdx)$/, '');
  const localeFreeSlug = stripLocalePrefix(rawSlug);

  data.link = localeFreeSlug;
  processed++;

  if (dryRun) {
    console.log(`[dry-run] ${filePath} → link: ${localeFreeSlug}`);
    continue;
  }

  const updated = matter.stringify(content, data);
  writeFileSync(filePath, updated);
  console.log(`[${processed}/${files.length}] ${filePath} → link: ${localeFreeSlug}`);
}

console.log(`${dryRun ? '[dry-run] ' : ''}Processed ${processed} posts (${files.length - processed} already had link)`);

// After enabling slug transliteration, existing CJK URLs will break.
// This script writes the original slug into frontmatter.link to preserve old links.
// Usage: pnpm save-slugs [--dry-run]

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

// Quote value if it contains YAML-special characters
function yamlQuote(value: string): string {
  if (/[[\]{}:#&*?|>!%@`'",\n\\]/.test(value) || /^[\s-]/.test(value) || /\s$/.test(value)) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

const blogPath = 'src/content/blog';
const files = glob.sync(`${blogPath}/**/*.{md,mdx}`);
let processed = 0;

for (const filePath of files) {
  const raw = readFileSync(filePath, 'utf8');
  const { data } = matter(raw);

  if (data.link) continue;

  const rawSlug = relative(blogPath, filePath)
    .replace(/\\/g, '/')
    .replace(/\.(md|mdx)$/, '');
  const localeFreeSlug = stripLocalePrefix(rawSlug);

  processed++;
  const safeValue = yamlQuote(localeFreeSlug);

  if (dryRun) {
    console.log(`[dry-run] ${filePath} → link: ${safeValue}`);
    continue;
  }

  // Insert `link:` field directly after the opening `---` to avoid
  // gray-matter's stringify reformatting the entire frontmatter.
  const fmEnd = raw.indexOf('---', 3);
  const updated = `${raw.slice(0, 3)}\nlink: ${safeValue}${raw.slice(3, fmEnd)}---${raw.slice(fmEnd + 3)}`;
  writeFileSync(filePath, updated);
  console.log(`[${processed}/${files.length}] ${filePath} → link: ${safeValue}`);
}

console.log(`${dryRun ? '[dry-run] ' : ''}Processed ${processed} posts (${files.length - processed} already had link)`);

import fs from 'node:fs';
import yaml from 'js-yaml';

const SITE_CONFIG_PATH = 'config/site.yaml';
const CONTENT_BASE = 'src/content/blog';

/**
 * Read non-default locale glob patterns from site config.
 * Used by generate scripts to skip translation files (they share slugs with originals).
 */
export function getNonDefaultLocaleGlobs(): string[] {
  const raw = fs.readFileSync(SITE_CONFIG_PATH, 'utf-8');
  const config = yaml.load(raw) as { i18n?: { defaultLocale?: string; locales?: { code: string }[] } };

  const defaultLocale = config?.i18n?.defaultLocale ?? 'zh';
  const allCodes = config?.i18n?.locales?.map((l) => l.code) ?? [];

  return allCodes.filter((code) => code !== defaultLocale).map((code) => `${CONTENT_BASE}/${code}/**`);
}

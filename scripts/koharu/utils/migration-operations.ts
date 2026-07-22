import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { slug as githubSlug } from 'github-slugger';
import matter from 'gray-matter';
import { load } from 'js-yaml';
import { slugify } from 'transliteration';

import { isBlogContentFile } from '../../../src/lib/content/glob';
import { BLOG_CONTENT_PATH, PROJECT_ROOT, SITE_CONFIG_PATH } from '../constants/paths';

export type ContentMigrationAction = 'add-link' | 'rename-slug' | 'remove-slug';

export interface ContentMigrationChange {
  file: string;
  sourcePath: string;
  action: ContentMigrationAction;
  link: string;
  original: string;
  updated: string;
}

export interface ContentMigrationIssue {
  file: string;
  message: string;
}

export interface ContentMigrationPlan {
  scannedFiles: number;
  unchangedFiles: number;
  changes: ContentMigrationChange[];
  errors: ContentMigrationIssue[];
  snapshot: ContentMigrationSnapshot;
}

export interface ContentMigrationOptions {
  contentDir?: string;
  siteConfigPath?: string;
}

export interface ContentMigrationSnapshot {
  contentDir: string;
  siteConfigPath: string;
  siteConfigOriginal: string | null;
  files: Array<{ sourcePath: string; original: string }>;
  errors: ContentMigrationIssue[];
}

interface LocaleConfig {
  defaultLocale: string;
  knownLocales: Set<string>;
  enableSlugTransliteration: boolean;
}

function loadLocaleConfig(raw: string | null): LocaleConfig {
  if (raw === null) {
    return { defaultLocale: 'zh', knownLocales: new Set(), enableSlugTransliteration: false };
  }

  const parsed = load(raw);
  const config = (parsed && typeof parsed === 'object' ? parsed : {}) as {
    site?: { enableSlugTransliteration?: boolean };
    i18n?: { defaultLocale?: string; locales?: Array<{ code?: string }> };
  };
  const defaultLocale = config.i18n?.defaultLocale ?? 'zh';
  const knownLocales = new Set(
    (config.i18n?.locales ?? []).map((locale) => locale.code).filter((code): code is string => Boolean(code)),
  );
  knownLocales.add(defaultLocale);
  return {
    defaultLocale,
    knownLocales,
    enableSlugTransliteration: config.site?.enableSlugTransliteration === true,
  };
}

function getContentLocale(relativePath: string, localeConfig: LocaleConfig): string {
  const firstSegment = relativePath.split('/')[0];
  if (firstSegment !== localeConfig.defaultLocale && localeConfig.knownLocales.has(firstSegment)) {
    return firstSegment;
  }
  return localeConfig.defaultLocale;
}

function getPathLink(relativePath: string, localeConfig: LocaleConfig): string {
  const withoutExtension = relativePath.replace(/\.(md|mdx)$/i, '');
  const firstSlash = withoutExtension.indexOf('/');
  let localeFreePath = withoutExtension;

  if (firstSlash !== -1) {
    const firstSegment = withoutExtension.slice(0, firstSlash);
    if (firstSegment !== localeConfig.defaultLocale && localeConfig.knownLocales.has(firstSegment)) {
      localeFreePath = withoutExtension.slice(firstSlash + 1);
    }
  }

  const legacySlug = localeFreePath
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');

  if (!localeConfig.enableSlugTransliteration) return legacySlug;
  return slugify(legacySlug, { allowedChars: 'a-zA-Z0-9-_.~/', separator: '-' });
}

function normalizeLegacySlug(slug: string, localeConfig: LocaleConfig): string {
  const firstSlash = slug.indexOf('/');
  let localeFreeSlug = slug;

  if (firstSlash !== -1) {
    const firstSegment = slug.slice(0, firstSlash);
    if (firstSegment !== localeConfig.defaultLocale && localeConfig.knownLocales.has(firstSegment)) {
      localeFreeSlug = slug.slice(firstSlash + 1);
    }
  }

  if (!localeConfig.enableSlugTransliteration) return localeFreeSlug;
  return slugify(localeFreeSlug, { allowedChars: 'a-zA-Z0-9-_.~/', separator: '-' });
}

function yamlQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

interface FrontmatterLines {
  lines: string[];
  endIndex: number;
  eol: string;
}

function getFrontmatterLines(raw: string): FrontmatterLines | null {
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  if (lines[0] !== '---') return null;

  const endIndex = lines.findIndex((line, index) => index > 0 && /^---[\t ]*$/.test(line));
  if (endIndex === -1) return null;
  return { lines, endIndex, eol };
}

function findTopLevelField(lines: string[], endIndex: number, field: string): number[] {
  const pattern = new RegExp(`^${field}\\s*:`);
  const indexes: number[] = [];
  for (let index = 1; index < endIndex; index++) {
    if (pattern.test(lines[index])) indexes.push(index);
  }
  return indexes;
}

function replaceSlugField(raw: string, link: string): string | null {
  const frontmatter = getFrontmatterLines(raw);
  if (!frontmatter) return null;
  const indexes = findTopLevelField(frontmatter.lines, frontmatter.endIndex, 'slug');
  if (indexes.length !== 1) return null;

  const startIndex = indexes[0];
  const value = frontmatter.lines[startIndex].slice(frontmatter.lines[startIndex].indexOf(':') + 1).trimStart();
  let replaceCount = 1;
  if (value.startsWith('|') || value.startsWith('>')) {
    while (startIndex + replaceCount < frontmatter.endIndex) {
      const line = frontmatter.lines[startIndex + replaceCount];
      if (line.length > 0 && !/^\s/.test(line)) break;
      replaceCount++;
    }
  }

  frontmatter.lines.splice(startIndex, replaceCount, `link: ${yamlQuote(link)}`);
  return frontmatter.lines.join(frontmatter.eol);
}

function renameSlugField(raw: string): string | null {
  const frontmatter = getFrontmatterLines(raw);
  if (!frontmatter) return null;
  const indexes = findTopLevelField(frontmatter.lines, frontmatter.endIndex, 'slug');
  if (indexes.length !== 1) return null;

  frontmatter.lines[indexes[0]] = frontmatter.lines[indexes[0]].replace(/^slug(\s*:)/, 'link$1');
  return frontmatter.lines.join(frontmatter.eol);
}

function removeSlugField(raw: string): string | null {
  const frontmatter = getFrontmatterLines(raw);
  if (!frontmatter) return null;
  const indexes = findTopLevelField(frontmatter.lines, frontmatter.endIndex, 'slug');
  if (indexes.length !== 1) return null;

  const startIndex = indexes[0];
  const value = frontmatter.lines[startIndex].slice(frontmatter.lines[startIndex].indexOf(':') + 1).trimStart();
  let deleteCount = 1;
  if (value.startsWith('|') || value.startsWith('>')) {
    while (startIndex + deleteCount < frontmatter.endIndex) {
      const line = frontmatter.lines[startIndex + deleteCount];
      if (line.length > 0 && !/^\s/.test(line)) break;
      deleteCount++;
    }
  }

  frontmatter.lines.splice(startIndex, deleteCount);
  return frontmatter.lines.join(frontmatter.eol);
}

function addLinkField(raw: string, link: string): string | null {
  const frontmatter = getFrontmatterLines(raw);
  if (!frontmatter) return null;
  frontmatter.lines.splice(1, 0, `link: ${yamlQuote(link)}`);
  return frontmatter.lines.join(frontmatter.eol);
}

/**
 * Verify a line-level rewrite by parsing the result with the same YAML engine.
 *
 * The field editors above locate `slug` by line, but a multi-line flow scalar
 * (e.g. `slug: "a\n  b"`) spans lines they do not track, so a naive rewrite would
 * leave the trailing lines behind and corrupt the frontmatter. Reading the result
 * back catches that: the migrated document must parse, expose `link` as the target
 * value, and no longer carry a `slug` field.
 */
function isMigratedFrontmatterValid(updated: string, expectedLink: string): boolean {
  try {
    const data = matter(updated).data as Record<string, unknown>;
    return data.link === expectedLink && !Object.hasOwn(data, 'slug');
  } catch {
    return false;
  }
}

function displayPath(filePath: string): string {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  return relativePath.startsWith('..') ? filePath : relativePath;
}

function collectContentFiles(contentDir: string): {
  files: Array<{ sourcePath: string; original: string }>;
  errors: ContentMigrationIssue[];
} {
  const files: Array<{ sourcePath: string; original: string }> = [];
  const errors: ContentMigrationIssue[] = [];

  function visit(directoryPath: string): void {
    for (const entry of fs
      .readdirSync(directoryPath, { withFileTypes: true })
      .toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (entry.name.startsWith('_')) continue;

      const sourcePath = path.join(directoryPath, entry.name);
      const relativePath = path.relative(contentDir, sourcePath).replaceAll(path.sep, '/');
      const stat = fs.lstatSync(sourcePath);

      if (stat.isSymbolicLink()) {
        errors.push({ file: displayPath(sourcePath), message: '博客内容路径不能是符号链接' });
        continue;
      }
      if (stat.isDirectory()) {
        visit(sourcePath);
        continue;
      }
      if (!isBlogContentFile(relativePath)) continue;
      if (!stat.isFile()) {
        errors.push({ file: displayPath(sourcePath), message: '博客内容必须是普通文件' });
        continue;
      }

      files.push({ sourcePath, original: fs.readFileSync(sourcePath, 'utf8') });
    }
  }

  if (fs.existsSync(contentDir)) visit(contentDir);
  return { files, errors };
}

function createContentMigrationSnapshot(contentDir: string, siteConfigPath: string): ContentMigrationSnapshot {
  const { files, errors } = collectContentFiles(contentDir);

  return {
    contentDir,
    siteConfigPath,
    siteConfigOriginal: fs.existsSync(siteConfigPath) ? fs.readFileSync(siteConfigPath, 'utf8') : null,
    files,
    errors,
  };
}

function emptyPlan(snapshot: ContentMigrationSnapshot, errors: ContentMigrationIssue[]): ContentMigrationPlan {
  return {
    scannedFiles: snapshot.files.length,
    unchangedFiles: 0,
    changes: [],
    errors: [...snapshot.errors, ...errors],
    snapshot,
  };
}

/**
 * Plan the content migration without changing files.
 *
 * The migration preserves public URLs while avoiding Astro 6's reserved
 * `slug` frontmatter behavior:
 * - existing `link` stays authoritative;
 * - legacy `slug` is renamed to `link` when no link exists;
 * - redundant `slug` is removed when `link` already exists;
 * - posts with neither field receive their locale-free file path as `link`.
 */
export function planContentMigration(options: ContentMigrationOptions = {}): ContentMigrationPlan {
  const contentDir = path.resolve(options.contentDir ?? BLOG_CONTENT_PATH);
  const siteConfigPath = path.resolve(options.siteConfigPath ?? SITE_CONFIG_PATH);
  const snapshot = createContentMigrationSnapshot(contentDir, siteConfigPath);
  if (!fs.existsSync(contentDir)) {
    return emptyPlan(snapshot, [{ file: displayPath(contentDir), message: '博客内容目录不存在' }]);
  }

  let localeConfig: LocaleConfig;
  try {
    localeConfig = loadLocaleConfig(snapshot.siteConfigOriginal);
  } catch (error) {
    return emptyPlan(snapshot, [
      {
        file: displayPath(siteConfigPath),
        message: `无法解析站点配置: ${error instanceof Error ? error.message : String(error)}`,
      },
    ]);
  }

  const changes: ContentMigrationChange[] = [];
  const errors: ContentMigrationIssue[] = [...snapshot.errors];
  const publicLinks = new Map<string, string[]>();
  const counterpartLinks = new Map<string, Set<string>>();
  const defaultLocaleLinks = new Map<string, string>();
  let unchangedFiles = 0;

  // Non-default locales may reuse a counterpart's stable link to preserve
  // locale fallback pairing. The default locale's path remains authoritative.
  for (const { sourcePath: filePath, original } of snapshot.files) {
    const relativePath = path.relative(contentDir, filePath).replaceAll(path.sep, '/');
    try {
      const data = matter(original).data as Record<string, unknown>;
      const link = typeof data.link === 'string' && data.link.trim() ? data.link : null;
      const slug = typeof data.slug === 'string' && data.slug.trim() ? data.slug : null;
      const existingLink = link ?? (slug ? normalizeLegacySlug(slug, localeConfig) : null);
      const pathLink = getPathLink(relativePath, localeConfig);
      if (getContentLocale(relativePath, localeConfig) === localeConfig.defaultLocale) {
        defaultLocaleLinks.set(pathLink, existingLink ?? pathLink);
      }
      if (!existingLink) continue;

      const candidates = counterpartLinks.get(pathLink) ?? new Set<string>();
      candidates.add(existingLink);
      counterpartLinks.set(pathLink, candidates);
    } catch {
      // The main pass below reports the parse error with its file path.
    }
  }

  for (const { sourcePath: filePath, original: raw } of snapshot.files) {
    const file = displayPath(filePath);
    const relativePath = path.relative(contentDir, filePath).replaceAll(path.sep, '/');

    let data: Record<string, unknown>;
    try {
      data = matter(raw).data;
    } catch (error) {
      errors.push({ file, message: `无法解析 frontmatter: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }

    const hasLinkField = Object.hasOwn(data, 'link');
    const hasSlugField = Object.hasOwn(data, 'slug');
    const link = typeof data.link === 'string' && data.link.trim() ? data.link : null;
    const slug = typeof data.slug === 'string' && data.slug.trim() ? data.slug : null;

    if (hasLinkField && !link) {
      errors.push({ file, message: 'link 必须是非空字符串，请先手动修正' });
      continue;
    }
    if (hasSlugField && !slug) {
      errors.push({ file, message: 'slug 必须是非空字符串，无法安全迁移' });
      continue;
    }

    let targetLink = link;
    let updated: string | null = null;
    let action: ContentMigrationAction | null = null;

    if (link && hasSlugField) {
      updated = removeSlugField(raw);
      action = 'remove-slug';
    } else if (!link && slug) {
      targetLink = normalizeLegacySlug(slug, localeConfig);
      updated = targetLink === slug ? renameSlugField(raw) : replaceSlugField(raw, targetLink);
      action = 'rename-slug';
    } else if (!link) {
      const pathLink = getPathLink(relativePath, localeConfig);
      const locale = getContentLocale(relativePath, localeConfig);
      const defaultLocaleLink = locale === localeConfig.defaultLocale ? undefined : defaultLocaleLinks.get(pathLink);
      const counterpartCandidates =
        locale !== localeConfig.defaultLocale && defaultLocaleLink === undefined ? counterpartLinks.get(pathLink) : undefined;
      if (counterpartCandidates && counterpartCandidates.size > 1) {
        errors.push({
          file,
          message: `同路径的多语言文章使用了不同 link，无法自动选择: ${[...counterpartCandidates].join(', ')}`,
        });
        continue;
      }
      targetLink = defaultLocaleLink ?? counterpartCandidates?.values().next().value ?? pathLink;
      updated = addLinkField(raw, targetLink);
      action = 'add-link';
    }

    if (!targetLink) {
      errors.push({ file, message: '无法计算稳定链接' });
      continue;
    }

    const locale = getContentLocale(relativePath, localeConfig);
    const collisionKey = `${locale}\0${targetLink}`;
    const collisionFiles = publicLinks.get(collisionKey) ?? [];
    collisionFiles.push(file);
    publicLinks.set(collisionKey, collisionFiles);

    if (!action) {
      unchangedFiles++;
      continue;
    }
    if (updated === null) {
      errors.push({ file, message: '无法安全定位顶层 slug 字段，请手动迁移为 link' });
      continue;
    }
    if (!isMigratedFrontmatterValid(updated, targetLink)) {
      errors.push({ file, message: '无法安全改写 slug 字段（可能是多行标量），请手动迁移为 link' });
      continue;
    }

    changes.push({ file, sourcePath: filePath, action, link: targetLink, original: raw, updated });
  }

  for (const [key, collisionFiles] of publicLinks) {
    if (collisionFiles.length < 2) continue;
    const link = key.slice(key.indexOf('\0') + 1);
    for (const file of collisionFiles) {
      errors.push({ file, message: `同一语言下存在重复链接 "${link}": ${collisionFiles.join(', ')}` });
    }
  }

  return { scannedFiles: snapshot.files.length, unchangedFiles, changes, errors, snapshot };
}

interface RegularFileState {
  content: string;
  device: number;
  inode: number;
  mode: number;
}

function readRegularFileState(filePath: string): RegularFileState {
  const handle = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const stat = fs.fstatSync(handle);
    if (!stat.isFile()) throw new Error(`${displayPath(filePath)} 不再是普通文件，请重新运行迁移`);
    return {
      content: fs.readFileSync(handle, 'utf8'),
      device: stat.dev,
      inode: stat.ino,
      mode: stat.mode & 0o7777,
    };
  } finally {
    fs.closeSync(handle);
  }
}

function writeFileAtomically(filePath: string, expected: string, replacement: string): void {
  const initial = readRegularFileState(filePath);
  if (initial.content !== expected) {
    throw new Error(`${displayPath(filePath)} 在扫描后发生变化，请重新运行迁移`);
  }

  const tempPath = path.join(path.dirname(filePath), `.koharu-migrate-${process.pid}-${randomBytes(6).toString('hex')}.tmp`);
  let tempHandle: number | null = null;

  try {
    tempHandle = fs.openSync(tempPath, 'wx', initial.mode);
    fs.writeFileSync(tempHandle, replacement, 'utf8');
    fs.fchmodSync(tempHandle, initial.mode);
    fs.fsyncSync(tempHandle);
    fs.closeSync(tempHandle);
    tempHandle = null;

    const current = readRegularFileState(filePath);
    if (current.content !== expected || current.device !== initial.device || current.inode !== initial.inode) {
      throw new Error(`${displayPath(filePath)} 在写入前发生变化，请重新运行迁移`);
    }

    fs.renameSync(tempPath, filePath);
  } finally {
    if (tempHandle !== null) fs.closeSync(tempHandle);
    fs.rmSync(tempPath, { force: true });
  }
}

/** Apply a previously validated plan. All source files are rechecked before the first write. */
export function applyContentMigration(plan: ContentMigrationPlan): void {
  if (plan.errors.length > 0) {
    throw new Error(`内容迁移存在 ${plan.errors.length} 个错误，未修改任何文件`);
  }

  const current = createContentMigrationSnapshot(plan.snapshot.contentDir, plan.snapshot.siteConfigPath);
  if (current.errors.length > 0) {
    throw new Error(`博客内容文件集合在扫描后变得不安全: ${current.errors.map((issue) => issue.file).join(', ')}`);
  }
  if (current.siteConfigOriginal !== plan.snapshot.siteConfigOriginal) {
    throw new Error(`${displayPath(plan.snapshot.siteConfigPath)} 在扫描后发生变化，请重新运行迁移`);
  }
  if (
    current.files.length !== plan.snapshot.files.length ||
    current.files.some((file, index) => file.sourcePath !== plan.snapshot.files[index]?.sourcePath)
  ) {
    throw new Error('博客内容文件集合在扫描后发生变化，请重新运行迁移');
  }
  for (let index = 0; index < current.files.length; index++) {
    const currentFile = current.files[index];
    const plannedFile = plan.snapshot.files[index];
    if (currentFile.original !== plannedFile.original) {
      throw new Error(`${displayPath(currentFile.sourcePath)} 在扫描后发生变化，请重新运行迁移`);
    }
  }
  const appliedChanges: ContentMigrationChange[] = [];
  try {
    for (const change of plan.changes) {
      writeFileAtomically(change.sourcePath, change.original, change.updated);
      appliedChanges.push(change);
    }
  } catch (writeError) {
    const rollbackErrors: Error[] = [];
    for (const change of appliedChanges.toReversed()) {
      try {
        writeFileAtomically(change.sourcePath, change.updated, change.original);
      } catch (rollbackError) {
        const message = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        rollbackErrors.push(new Error(`${change.file}: ${message}`));
      }
    }

    if (rollbackErrors.length === 0) throw writeError;

    const writeMessage = writeError instanceof Error ? writeError.message : String(writeError);
    throw new AggregateError(
      [writeError, ...rollbackErrors],
      `内容迁移写入失败: ${writeMessage}；回滚失败: ${rollbackErrors.map((error) => error.message).join('; ')}`,
    );
  }
}

export function runContentMigration(options: ContentMigrationOptions & { dryRun?: boolean } = {}): ContentMigrationPlan {
  const plan = planContentMigration(options);
  if (!options.dryRun && plan.errors.length === 0 && plan.changes.length > 0) applyContentMigration(plan);
  return plan;
}

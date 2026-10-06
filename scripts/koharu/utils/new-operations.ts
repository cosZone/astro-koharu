import fs from 'node:fs';
import path from 'node:path';
import { slugify } from 'transliteration';
import YAML from 'yaml';
import { normalizeColophonConfig, type ResolvedColophonConfig } from '../../../src/lib/config/colophon';
import { normalizeFriendGroups } from '../../../src/lib/config/friends';
import type { FriendGroup } from '../../../src/lib/config/types';
import { BLOG_CONTENT_PATH, SITE_CONFIG_PATH } from '../constants/paths';
import type { CategoryTreeItem, FriendData, PostData } from '../creators/types';

/**
 * Generate a URL-friendly slug from a title.
 * Converts Chinese/Japanese characters to pinyin/romaji via transliteration.
 *
 * Always transliterates regardless of `enableSlugTransliteration` config —
 * CLI-generated filenames should be ASCII-safe for filesystem compatibility.
 */
export function generateSlug(title: string): string {
  return slugify(title, { separator: '-' });
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Load the site configuration from YAML
 */
export async function loadSiteConfig(): Promise<Record<string, unknown>> {
  const content = await fs.promises.readFile(SITE_CONFIG_PATH, 'utf-8');
  const parsed = YAML.parse(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid site config format');
  }
  return parsed as Record<string, unknown>;
}

export async function getFriendGroups(): Promise<FriendGroup[]> {
  const config = await loadSiteConfig();
  const friends = config.friends as { groups?: unknown } | undefined;
  return normalizeFriendGroups(friends?.groups);
}

export async function getColophonConfig(): Promise<ResolvedColophonConfig> {
  const config = await loadSiteConfig();
  return normalizeColophonConfig(config.colophon);
}

/**
 * Get category map from site config
 */
export async function getCategoryMap(): Promise<Record<string, string>> {
  const config = await loadSiteConfig();
  return (config.categoryMap as Record<string, string>) || {};
}

/**
 * Build a flat list of categories with tree structure info
 * Returns items suitable for display in a select menu with indentation
 */
export async function getCategoryTree(): Promise<CategoryTreeItem[]> {
  const categoryMap = await getCategoryMap();
  const items: CategoryTreeItem[] = [];

  // First pass: create all top-level categories
  for (const [name, slug] of Object.entries(categoryMap)) {
    items.push({
      name,
      slug,
      path: [name],
      level: 0,
    });
  }

  // For nested categories, we need to identify parent-child relationships
  // based on the directory structure in src/content/blog
  // Exclude locale directories (e.g., en/, ja/) to avoid treating them as categories
  const config = await loadSiteConfig();
  const i18nConfig = config.i18n as { defaultLocale?: string; locales?: { code: string }[] } | undefined;
  const localeDirs = new Set(
    (i18nConfig?.locales ?? []).map((l) => l.code).filter((code) => code !== (i18nConfig?.defaultLocale ?? 'zh')),
  );

  const blogDirs = (await fs.promises.readdir(BLOG_CONTENT_PATH, { withFileTypes: true })).filter(
    (d) => d.isDirectory() && !localeDirs.has(d.name),
  );

  const nestedItems: CategoryTreeItem[] = [];

  for (const dir of blogDirs) {
    const subDirs = (await fs.promises.readdir(path.join(BLOG_CONTENT_PATH, dir.name), { withFileTypes: true })).filter((d) =>
      d.isDirectory(),
    );

    if (subDirs.length > 0) {
      // Find the parent category name
      const parentSlug = dir.name;
      const parentEntry = Object.entries(categoryMap).find(([, slug]) => slug === parentSlug);
      if (!parentEntry) continue;

      const [parentName] = parentEntry;

      for (const subDir of subDirs) {
        const childSlug = subDir.name;
        const childEntry = Object.entries(categoryMap).find(([, slug]) => slug === childSlug);
        if (!childEntry) continue;

        const [childName] = childEntry;
        nestedItems.push({
          name: childName,
          slug: `${parentSlug}/${childSlug}`,
          path: [parentName, childName],
          level: 1,
        });
      }
    }
  }

  // Merge nested items under their parents
  const result: CategoryTreeItem[] = [];
  for (const item of items) {
    result.push(item);
    // Add any nested items that belong to this parent
    const children = nestedItems.filter((n) => n.path[0] === item.name);
    for (const child of children) {
      result.push(child);
    }
  }

  return result;
}

/**
 * Format a date for frontmatter
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/** Wrap value in single quotes if it contains YAML-special characters */
function yamlQuote(value: string): string {
  if (
    value === '' ||
    /[[\]{}:#&*?|>!%@`'",\n\\]/.test(value) ||
    /^[\s-]/.test(value) ||
    /\s$/.test(value) ||
    /^(true|false|yes|no|null|~|on|off)$/i.test(value)
  ) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

/**
 * Generate frontmatter YAML string for a post
 */
export function generatePostFrontmatter(data: PostData): string {
  const lines: string[] = ['---'];

  lines.push(`title: ${yamlQuote(data.title)}`);
  if (data.link) {
    lines.push(`link: ${yamlQuote(data.link)}`);
  }
  lines.push(`date: ${formatDate()}`);

  if (data.description) {
    lines.push(`description: ${yamlQuote(data.description)}`);
  }

  if (data.tags.length > 0) {
    lines.push('tags:');
    for (const tag of data.tags) {
      lines.push(`  - ${yamlQuote(tag)}`);
    }
  }

  // Categories can be single string or array (for nested)
  lines.push('categories:');
  if (Array.isArray(data.categories) && data.categories.length > 1) {
    // Nested category: [笔记, 前端]
    lines.push(`  - [${data.categories.map(yamlQuote).join(', ')}]`);
  } else {
    // Single category
    const cat = Array.isArray(data.categories) ? data.categories[0] : data.categories;
    lines.push(`  - ${yamlQuote(cat)}`);
  }

  if (data.colophon?.length) {
    lines.push('colophon:');
    for (const id of data.colophon) {
      lines.push(`  - ${yamlQuote(id)}`);
    }
  }

  if (data.draft) {
    lines.push('draft: true');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Create a new blog post file
 */
export async function createPost(data: PostData): Promise<string> {
  const categoryMap = await getCategoryMap();

  // Validate categories exist
  const categories = Array.isArray(data.categories) ? data.categories : [data.categories];

  for (const cat of categories) {
    if (!categoryMap[cat]) {
      throw new Error(`分类不存在: ${cat}`);
    }
  }

  // Determine the directory path based on category
  let dirPath: string;
  if (Array.isArray(data.categories) && data.categories.length > 1) {
    // Nested category path
    const slugs = data.categories.map((cat) => categoryMap[cat] || generateSlug(cat));
    dirPath = path.join(BLOG_CONTENT_PATH, ...slugs);
  } else {
    const cat = Array.isArray(data.categories) ? data.categories[0] : data.categories;
    const slug = categoryMap[cat] || generateSlug(cat);
    dirPath = path.join(BLOG_CONTENT_PATH, slug);
  }

  await ensureDirectory(dirPath);

  // Use link if provided, otherwise generate slug from title
  const filename = data.link || generateSlug(data.title);
  const filePath = path.join(dirPath, `${filename}.md`);
  const content = generatePostFrontmatter(data);

  await fs.promises.writeFile(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Append a friend link to site.yaml while preserving comments and formatting
 */
export async function appendFriend(data: FriendData, configPath = SITE_CONFIG_PATH): Promise<void> {
  const content = await fs.promises.readFile(configPath, 'utf-8');
  const doc = YAML.parseDocument(content, { keepSourceTokens: true });
  if (doc.errors.length > 0) throw doc.errors[0];

  // Navigate to friends.data array
  const friends = doc.get('friends');
  if (!YAML.isMap(friends)) {
    throw new Error('friends section not found in site.yaml');
  }

  const dataArray = friends.get('data');
  if (!YAML.isSeq(dataArray) || !dataArray.range || !dataArray.srcToken) {
    throw new Error('friends.data array not found in site.yaml');
  }

  const groups = normalizeFriendGroups(friends.toJSON().groups);
  if (data.group && !groups.some((group) => group.id === data.group)) {
    throw new Error(`Friend group "${data.group}" no longer exists. Choose a configured group or leave it ungrouped.`);
  }

  // Create new friend entry
  const newFriend = {
    site: data.site,
    url: data.url,
    owner: data.owner,
    desc: data.desc,
    image: data.image,
    ...(data.color ? { color: data.color } : {}),
    ...(data.group ? { group: data.group } : {}),
  };

  // Insert into the original source: serializing the whole document relocates comments and reformats unrelated settings.
  const options = { lineWidth: 0, version: doc.directives.yaml.version };
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  let offset: number;
  let insertion: string;
  if (dataArray.flow) {
    const last = dataArray.items.at(-1);
    if (last && (!YAML.isNode(last) || !last.range)) throw new Error('Cannot locate the last friend entry.');
    offset = YAML.isNode(last) && last.range ? last.range[1] : dataArray.range[0] + 1;
    insertion = `${dataArray.items.length ? ', ' : ''}${YAML.stringify(newFriend, { ...options, collectionStyle: 'flow' }).trimEnd()}`;
  } else {
    if (dataArray.srcToken.type !== 'block-seq') throw new Error('Cannot locate the friend sequence.');
    offset = dataArray.range[1];
    const indent = ' '.repeat(dataArray.srcToken.indent);
    insertion = YAML.stringify([newFriend], options)
      .trimEnd()
      .split('\n')
      .map((line) => `${indent}${line}`)
      .join(newline);
    insertion = `${content.slice(0, offset).endsWith('\n') ? '' : newline}${insertion}${newline}`;
  }
  const output = content.slice(0, offset) + insertion + content.slice(offset);
  const updated = YAML.parseDocument(output);
  if (updated.errors.length > 0) throw updated.errors[0];

  await fs.promises.writeFile(configPath, output, 'utf-8');
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a post with the given link/filename already exists
 */
export async function postExists(link: string | undefined, title: string, categoryPath: string[]): Promise<boolean> {
  const categoryMap = await getCategoryMap();
  const slugs = categoryPath.map((cat) => categoryMap[cat] || generateSlug(cat));
  const filename = link || generateSlug(title);
  const filePath = path.join(BLOG_CONTENT_PATH, ...slugs, `${filename}.md`);

  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

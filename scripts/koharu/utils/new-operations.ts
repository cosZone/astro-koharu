import fs from 'node:fs';
import path from 'node:path';
import { pinyin } from 'pinyin-pro';
import YAML from 'yaml';
import { BLOG_CONTENT_PATH, SITE_CONFIG_PATH } from '../constants/paths';
import type { CategoryTreeItem, FriendData, PostData } from '../creators/types';

/**
 * Generate a URL-friendly slug from a title
 * Converts Chinese characters to pinyin, removes special characters
 */
export function generateSlug(title: string): string {
  const tokens: string[] = [];
  let latinBuffer = '';

  const isAsciiWordChar = (char: string) => /[A-Za-z0-9]/.test(char);
  const isCjkChar = (char: string) => /[\u4e00-\u9fff]/.test(char);

  const flushLatin = () => {
    if (!latinBuffer) return;
    tokens.push(latinBuffer);
    latinBuffer = '';
  };

  for (const char of title) {
    if (isAsciiWordChar(char)) {
      latinBuffer += char;
      continue;
    }

    flushLatin();

    if (isCjkChar(char)) {
      const result = pinyin(char, {
        toneType: 'none',
        type: 'array',
        v: true,
      });
      const value = Array.isArray(result) ? result[0] : result;
      if (value) tokens.push(value);
    }
  }

  flushLatin();

  return tokens
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
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
  const blogDirs = (await fs.promises.readdir(BLOG_CONTENT_PATH, { withFileTypes: true })).filter((d) => d.isDirectory());

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

/**
 * Generate frontmatter YAML string for a post
 */
export function generatePostFrontmatter(data: PostData): string {
  const lines: string[] = ['---'];

  lines.push(`title: ${data.title}`);
  if (data.link) {
    lines.push(`link: ${data.link}`);
  }
  lines.push(`date: ${formatDate()}`);

  if (data.description) {
    lines.push(`description: ${data.description}`);
  }

  if (data.tags.length > 0) {
    lines.push('tags:');
    for (const tag of data.tags) {
      lines.push(`  - ${tag}`);
    }
  }

  // Categories can be single string or array (for nested)
  lines.push('categories:');
  if (Array.isArray(data.categories) && data.categories.length > 1) {
    // Nested category: [笔记, 前端]
    lines.push(`  - [${data.categories.join(', ')}]`);
  } else {
    // Single category
    const cat = Array.isArray(data.categories) ? data.categories[0] : data.categories;
    lines.push(`  - ${cat}`);
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
export async function appendFriend(data: FriendData): Promise<void> {
  const content = await fs.promises.readFile(SITE_CONFIG_PATH, 'utf-8');
  const doc = YAML.parseDocument(content);

  // Navigate to friends.data array
  const friends = doc.get('friends') as YAML.YAMLMap | undefined;
  if (!friends) {
    throw new Error('friends section not found in site.yaml');
  }

  const dataArray = friends.get('data') as YAML.YAMLSeq | undefined;
  if (!dataArray) {
    throw new Error('friends.data array not found in site.yaml');
  }

  // Create new friend entry
  const newFriend = doc.createNode({
    site: data.site,
    url: data.url,
    owner: data.owner,
    desc: data.desc,
    image: data.image,
    ...(data.color ? { color: data.color } : {}),
  });

  // Add to array
  dataArray.add(newFriend);

  // Write back with preserved formatting
  const output = doc.toString({
    lineWidth: 0, // Don't wrap lines
  });

  await fs.promises.writeFile(SITE_CONFIG_PATH, output, 'utf-8');
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

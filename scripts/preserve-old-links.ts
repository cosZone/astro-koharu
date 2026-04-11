// 开启中文、日文文章 URL 自动转为拼音 / 罗马字母功能后，原有链接将失效
// 脚本会自动将原有 URL 写入文章的 frontmatter.link 字段，防止 URL 转换后导致外部网站反向链接失效

import type { SiteYamlConfig } from '@lib/config/types';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { load } from 'js-yaml';
import { relative } from 'path';

// 直接读取 YAML 配置文件
const yamlConfig = load(readFileSync('config/site.yaml', 'utf8')) as SiteYamlConfig;
const locales = yamlConfig.i18n?.locales || [];
const allKnownLocales = new Set(locales.map((l) => l.code));

// 移除 slug 中的语言前缀
const stripLocaleFromPath = (pathname: string): string => {
  const path = pathname.split('/');
  return allKnownLocales.has(path[0]) ? path.slice(1).join('/') : pathname;
};

interface Post {
  slug: string;
  title: string;
  link?: string;
}

// 解析文章元数据
const parsePost = (path: string, content: string): Post | null => {
  const rawSlug = stripLocaleFromPath(path.replace('\\', '/'));
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];
  const title = frontmatter.match(/^title:\s*(.+?)\s*$/m)?.[1] || '';
  const link = frontmatter.match(/^link:\s*(.+?)\s*$/m)?.[1];

  return { slug: rawSlug, title, link };
};

// 添加 link 到 frontmatter.link 字段
const addLinkToFrontmatter = (content: string, link: string): string => {
  const lines = content.split('\n');
  let dashCount = 0;
  let lastDashLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      dashCount++;
      if (dashCount === 2) {
        lastDashLine = i;
        break;
      }
    }
  }

  if (lastDashLine === -1) return content;

  lines.splice(lastDashLine, 0, `link: ${link}`);
  return lines.join('\n');
};

// 主逻辑
interface ProcessedPost {
  path: string;
  content: string;
  post: Post;
}

const blogPath = 'src/content/blog';
const posts: ProcessedPost[] = [];

for (const filePath of glob.sync(`${blogPath}/**/*.{md,mdx}`)) {
  const content = readFileSync(filePath, 'utf8');
  const post = parsePost(relative(blogPath, filePath), content);

  if (post && !post.link) {
    posts.push({ path: filePath, content, post });
  }
}

// 批量处理
posts.forEach(({ path, content, post }, index) => {
  console.log(`Preserving link: [${index + 1}/${posts.length}]`);
  writeFileSync(path, addLinkToFrontmatter(content, post.slug));
});

console.log(`✅ Processed ${posts.length} posts`);

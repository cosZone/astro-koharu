// 开启中文、日文文章 URL 自动转为拼音 / 罗马字母功能后，原有链接将失效
// 脚本会自动将原有 URL 写入文章的 frontmatter.link 字段，防止 URL 转换后导致外部网站反向链接失效

import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { SiteYamlConfig } from '@lib/config/types';
import { glob } from 'glob';
import { load } from 'js-yaml';

// 直接读取 YAML 配置文件
const yamlConfig: SiteYamlConfig = load(readFileSync('config/site.yaml', 'utf8')) as SiteYamlConfig;

// 简化的默认配置
const _defaultLocale = yamlConfig.i18n?.defaultLocale || 'zh';
const allKnownLocales = new Set((yamlConfig.i18n?.locales || []).map((l: { code: string; label?: string }) => l.code));

// 去掉 slug 中的语言前缀
const stripLocaleFromPath = (pathname: string): string => {
  const path = pathname.split('/');
  if (path.length > 1 && allKnownLocales.has(path[0])) {
    return path.slice(1).join('/');
  }
  return pathname;
};

// 简单模拟
interface Post {
  slug: string;
  title: string;
  date: {
    link?: string;
  };
}

// 生成 Post
// path: /abc/123.md => slug: abc/123
// path: js/abc/123.md => slug: abc/123
const genPost = (path: string, content: string): Post => {
  const slug = stripLocaleFromPath(path.replace('\\', '/'));

  // 匹配整个frontmatter块
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);

  let title: string | undefined, link: string | undefined;

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // 匹配title字段
    const titleMatch = frontmatter.match(/^title:\s*(.+?)\s*$/m) as RegExpMatchArray;
    title = titleMatch[1] as string;

    // 匹配link字段
    const linkMatch = frontmatter.match(/^link:\s*(.+?)\s*$/m);
    link = linkMatch ? linkMatch[1] : undefined;
  }

  return {
    slug,
    title: title || '',
    date: {
      link,
    },
  };
};

// console.log(genPost('/abc/123.md', '---\ntitle: 今天\nlink: 我啊/你\n---'))
// console.log(genPost('js/abc/123.md', '---\ntitle: 今天\nlink: 我啊/你\n---'))
// console.log(genPost('ja/abc/123.md', '---\ntitle: 今天\svs: 我啊/你\n---'))

const blogPath = 'src/content/blog';
const postsPaths = glob.sync(`${blogPath}/**/*.{md,mdx}`);

// console.log(postsPaths)

// 储存文章 原始路径 原始内容 和 @Post
interface StoredPost {
  path: string;
  content: string;
  Post: Post;
  // hasLink: boolean;
}

const storedPosts: StoredPost[] = [];

for (const path of postsPaths) {
  const content = readFileSync(path, 'utf8');
  const post = genPost(relative(blogPath, path), content);
  !post.date.link &&
    storedPosts.push({
      path,
      content,
      Post: post,
      // hasLink: !!post.date.link
    });
  // debugger
}

/**
 * 在Markdown文件的frontmatter中添加link字段
 * @param content Markdown文件内容
 * @param link 要添加的链接
 * @returns 添加link字段后的内容
 */
function addLinkToFrontmatter(content: string, link: string): string {
  // 匹配frontmatter的结束位置
  const _frontmatterEndRegex = /^---\s*$/m;
  const lines = content.split('\n');

  let dashCount = 0;
  let lastDashLine = -1;

  // 查找frontmatter的结束位置
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      dashCount++;
      if (dashCount === 2) {
        lastDashLine = i;
        break;
      }
    }
  }

  // 如果没有找到frontmatter结束位置，则返回原内容
  if (lastDashLine === -1) {
    return content;
  }

  // 在最后一个---的上一行插入link字段
  const insertIndex = lastDashLine;
  const linkLine = `link: ${link}`;

  // 插入link字段
  lines.splice(insertIndex, 0, linkLine);

  return lines.join('\n');
}

// 修改文件

for (const storedPost of storedPosts) {
  // if (!storedPost.hasLink) {
  console.log('preserve link:', `[${storedPosts.indexOf(storedPost)}/${storedPosts.length}]`);
  const link = storedPost.Post.slug;
  const path = storedPost.path;
  const content = storedPost.content;
  const newContent = addLinkToFrontmatter(content, link);
  writeFileSync(path, newContent);
  // }
}

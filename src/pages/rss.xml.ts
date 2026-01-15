// edit https://github.com/lawvs/lawvs.github.io/blob/dba2e51e312765f8322ee87755b4e9c22b520048/src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { siteConfig } from '@constants/site-config';
import { getCategoryArr, getSortedPosts } from '@lib/content';
import { getSanitizeHtml } from '@lib/sanitize';
import type { APIContext } from 'astro';
import sanitizeHtml from 'sanitize-html';
import type { BlogPost } from 'types/blog';

// 用于生成纯文本摘要的函数
const generateTextSummary = (html?: string, length: number = 150): string => {
  // 先将Markdown转换为HTML
  // 将HTML转换为纯文本（去除所有标签）
  const text = sanitizeHtml(html ?? '', {
    allowedTags: [], // 不允许任何标签
    allowedAttributes: {},
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional - filtering invalid XML characters
    textFilter: (text) => text.replace(/[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm, ''),
  });
  // 截取指定长度，并确保不会截断词语
  if (text.length <= length) return text;
  return text.substring(0, length).replace(/\s+\S*$/, '');
};

export async function GET(context: APIContext) {
  const posts = await getSortedPosts();
  const { site } = context;

  if (!site) {
    throw new Error('Missing site metadata');
  }

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || 'No description',
    site,
    trailingSlash: false,
    stylesheet: '/rss/feed.xsl', // https://docs.astro.build/en/recipes/rss/#adding-a-stylesheet
    items: posts
      .map((post: BlogPost) => {
        // 获取分类数组
        const categoryArr = getCategoryArr(post.data.categories?.[0]);

        // 构建 categories 数组，包含分类和标签
        const categories = [
          // 添加分类信息 (使用 domain 属性区分)
          ...(categoryArr || []).map((cat) => `category:${cat}`),
          // 添加标签信息
          ...(post.data.tags || []).map((tag) => `tag:${tag}`),
        ];

        const postSlug = post.data.link ?? post.slug;
        const postLink = `/post/${postSlug}`;

        return {
          title: post.data.title,
          pubDate: post.data.date,
          description: post.data?.description ?? generateTextSummary(post.rendered?.html),
          link: postLink,
          content: getSanitizeHtml(post.rendered?.html ?? ''),
          categories,
          // Add domain-independent GUID using customData
          // The slug-only GUID ensures stability across domain changes
          customData: `<guid isPermaLink="false">${postSlug}</guid>`,
        };
      })
      .slice(0, 20),
  });
}

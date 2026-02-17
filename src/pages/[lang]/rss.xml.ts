import rss from '@astrojs/rss';
import { siteConfig } from '@constants/site-config';
import { getCategoryArr, getPostSlug, getSortedPosts } from '@lib/content';
import { encodeSlug } from '@lib/route';
import { buildRssItemFields } from '@lib/rss-utils';
import type { APIContext } from 'astro';
import type { BlogPost } from 'types/blog';
import { defaultLocale, getHtmlLang, localeList, localizedPath } from '@/i18n';

export function getStaticPaths() {
  return localeList.filter((l) => l !== defaultLocale).map((lang) => ({ params: { lang } }));
}

export async function GET(context: APIContext) {
  const lang = context.params.lang as string;
  const posts = await getSortedPosts(lang);
  const { site } = context;

  if (!site) {
    throw new Error('Missing site metadata');
  }

  const response = await rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || 'No description',
    site,
    trailingSlash: false,
    customData: `<language>${getHtmlLang(lang)}</language>`,
    stylesheet: '/rss/feed.xsl',
    items: posts
      .map((post: BlogPost) => {
        const categoryArr = getCategoryArr(post.data.categories?.[0]);
        const categories = [
          ...(categoryArr || []).map((cat) => `category:${cat}`),
          ...(post.data.tags || []).map((tag) => `tag:${tag}`),
        ];

        const postSlug = getPostSlug(post);
        const postLink = localizedPath(`/post/${encodeSlug(postSlug)}`, lang);
        const { title, description, content } = buildRssItemFields(post, lang);

        return {
          title,
          pubDate: post.data.date,
          description,
          link: postLink,
          content,
          categories,
          customData: `<guid isPermaLink="false">${lang}:${postSlug}</guid>`,
        };
      })
      .slice(0, 20),
  });

  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/xml; charset=utf-8');
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

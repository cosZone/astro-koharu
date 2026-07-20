export const BLOG_CONTENT_GLOB_PATTERN = ['**/*.{md,mdx}', '!**/_*/**', '!**/_*.{md,mdx}'];

export function isBlogContentFile(relativePath: string): boolean {
  const segments = relativePath.replaceAll('\\', '/').split('/').filter(Boolean);
  const fileName = segments.at(-1);
  return Boolean(fileName && segments.every((segment) => !segment.startsWith('_')) && /\.(md|mdx)$/i.test(fileName));
}

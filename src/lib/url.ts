/** Encode path segments without escaping their `/` separators (legacy Hexo permalinks). */
export const encodeSlug = (slug: string) => slug?.split('/').map(encodeURIComponent).join('/') ?? '';

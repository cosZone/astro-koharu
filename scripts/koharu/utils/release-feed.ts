import { GITHUB_REPO, type ReleaseInfo } from '../constants/update';
import { normalizeTag } from './update-policy';

/** GitHub Release lookup and the formatting of its notes for the CLI preview. */

const RELEASE_FETCH_TIMEOUT = 3000;

/** 从 GitHub API 获取 Release 信息 */
export async function fetchReleaseInfo(version: string): Promise<ReleaseInfo | null> {
  const tag = normalizeTag(version);
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tag}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RELEASE_FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'astro-koharu-cli',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      tagName: data.tag_name,
      url: data.html_url,
      body: data.body || null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/** 构建 Release 页面 URL (不依赖 API) */
export function buildReleaseUrl(version: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/tag/${normalizeTag(version)}`;
}

/** 从 Release body 提取简要内容 */
export function extractReleaseSummary(body: string | null, maxLines = 5, maxChars = 300): string[] {
  if (!body) return [];

  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.replace(/^#{1,6}\s*/, ''))
    .filter((line) => line.length > 0);

  const result: string[] = [];
  let totalChars = 0;

  for (const line of lines) {
    if (result.length >= maxLines || totalChars >= maxChars) break;
    result.push(line);
    totalChars += line.length;
  }

  if (result.length < lines.length) {
    result.push('...');
  }

  return result;
}

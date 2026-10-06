/**
 * Raw Markdown source of a post, served at `<post url>.md` for the post page's
 * copy / download / open-in-writing-room actions.
 */

import { isOpenInEditorAvailable, type ResolvedPostActionsConfig } from '../config/post-actions';
import type { DevConfig, EditorConfig } from '../config/types';

interface PostSourceVisibility {
  password?: string;
  draft?: boolean;
}

/** Whether any post action consumes the `.md` endpoint in this build. */
export function isPostSourceEnabled(config: ResolvedPostActionsConfig, editorEnabled: boolean, isDev: boolean): boolean {
  return config.copyMarkdown || config.downloadMarkdown || isOpenInEditorAvailable(config, editorEnabled, isDev);
}

const ENCRYPTED_BLOCK = /^[ \t]*:{3,}[ \t]*encrypted\b/m;

/**
 * Encrypted posts and posts with `:::encrypted` blocks would leak plaintext and passwords;
 * drafts stay unpublished in production.
 */
export function isPostSourcePublic(data: PostSourceVisibility, body: string | undefined, isProd: boolean): boolean {
  if (data.password || ENCRYPTED_BLOCK.test(body ?? '')) return false;
  return !(isProd && data.draft === true);
}

/** `/post/note/foo` → `/post/note/foo.md` */
export function getPostSourcePath(postPath: string): string {
  return `${postPath.replace(/\/+$/, '')}.md`;
}

/** Download filename from the post slug's last segment, stripped of characters filesystems reject. */
export function getPostSourceFilename(slug: string): string {
  const name = slug
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/[\\/:*?"<>|\p{Cc}]/gu, '-')
    .trim();
  return `${name || 'post'}.md`;
}

/** Local editor deep link, e.g. `vscode://file/<project>/<content dir>/<post file>`. */
export function getLocalEditorHref(
  editor: Pick<EditorConfig, 'urlTemplate'>,
  dev: Pick<DevConfig, 'localProjectPath' | 'contentRelativePath'>,
  postRelativePath: string,
): string {
  const projectPath = dev.localProjectPath.replace(/\/+$/, '');
  const contentPath = dev.contentRelativePath.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  const sourcePath = postRelativePath.replaceAll('\\', '/').replace(/^\/+/, '');
  return editor.urlTemplate.replace('{path}', `${projectPath}/${contentPath}/${sourcePath}`);
}

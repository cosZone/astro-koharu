import { encryptEditorPost } from './crypto';
import { type EditorHeading, type EditorRenderOptions, renderEditorMarkdown } from './render';

export interface EditorWorkerRenderOptions extends EditorRenderOptions {
  /** A post can disable mathematics without enabling a site-wide disabled feature. */
  math?: boolean;
  /** Set only when full-post encryption is requested by the editor. */
  password?: string;
}

export interface EditorWorkerResult {
  html: string;
  headings: EditorHeading[];
}

export interface EditorWorkerRequest {
  id: number;
  source: string;
  options: EditorWorkerRenderOptions;
}

export type EditorWorkerResponse = { id: number; result: EditorWorkerResult } | { id: number; error: string };

self.addEventListener('message', async (event: MessageEvent<EditorWorkerRequest>) => {
  const { id, source, options } = event.data;
  try {
    const contentConfig = { ...options.contentConfig };
    if (options.math === false) contentConfig.enableMath = false;
    const result = await renderEditorMarkdown(source, { contentConfig, ogEndpoint: options.ogEndpoint });
    if (options.password) result.html = await encryptEditorPost(result.html, options.password);
    self.postMessage({ id, result } satisfies EditorWorkerResponse);
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : '博文预览暂时无法更新',
    } satisfies EditorWorkerResponse);
  }
});

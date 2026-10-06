import { EmbedHydrator } from '@components/embed/EmbedHydrator';
import { TableOfContents } from '@components/layout/TableOfContents';
import CodeBlockFullscreen from '@components/markdown/CodeBlockFullscreen';
import ContentEnhancer from '@components/markdown/ContentEnhancer';
import DiagramFullscreen from '@components/markdown/DiagramFullscreen';
import ImageLightbox from '@components/markdown/ImageLightbox';
import type { ContentConfig } from '@constants/content-config';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { enhanceImages } from '@lib/image-enhancer';
import DOMPurify from 'dompurify';
import { useEffect, useRef, useState } from 'react';
import { createEditorRenderer } from './browser-worker';
import { parseEditorDocument } from './document';
import { enhanceEditorPreview } from './preview-enhance';

interface Props {
  config: ContentConfig;
  author: string;
}
interface Preview {
  html: string;
  data: Record<string, unknown>;
  headings: { depth: number; slug: string; text: string }[];
  mode: 'body' | 'article';
  version: number;
}

let previewPurifier: ReturnType<typeof DOMPurify> | undefined;

function sanitizePreviewHtml(html: string): string {
  if (!previewPurifier) {
    previewPurifier = DOMPurify(window);
    previewPurifier.addHook('uponSanitizeElement', (node, data) => {
      if (data.tagName === 'input' && !(node instanceof HTMLInputElement && node.type === 'checkbox' && node.disabled))
        node.parentNode?.removeChild(node);
    });
  }
  return previewPurifier.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    FORBID_TAGS: ['style', 'form', 'textarea', 'select'],
    ADD_ATTR: ['target'],
    ADD_TAGS: ['spoiler-span'],
  });
}

export default function PreviewSurface({ config, author }: Props) {
  const [preview, setPreview] = useState<Preview>({ html: '', data: {}, headings: [], mode: 'body', version: 0 });
  const [error, setError] = useState('');
  const widePreview = useMediaQuery('(min-width: 960px)');
  const container = useRef<HTMLDivElement>(null);
  const requested = useRef(0);
  const position = useRef(0);
  const endpoint = useRef('/api/editor/og');

  useEffect(() => {
    const renderer = createEditorRenderer();
    const receive = async (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.origin !== window.location.origin ||
        event.data?.type !== 'koharu-preview-source' ||
        typeof event.data.source !== 'string'
      )
        return;
      const version = ++requested.current;
      const message = event.data;
      document.documentElement.classList.toggle('dark', message.dark === true);
      document.documentElement.dataset.theme = message.dark ? 'dark' : 'light';
      endpoint.current = typeof message.ogEndpoint === 'string' ? message.ogEndpoint : '/api/editor/og';
      const parsed = parseEditorDocument(message.source);
      try {
        const result = await renderer.render(parsed.body, {
          ogEndpoint: endpoint.current,
          contentConfig: config,
          math: parsed.data.math !== false,
          password: config.enableEncryptedBlock && typeof parsed.data.password === 'string' ? parsed.data.password : undefined,
        });
        let html = result.html;
        if (version !== requested.current) return;
        position.current = window.scrollY;
        html = sanitizePreviewHtml(html);
        setPreview({
          html,
          data: parsed.data,
          headings: result.headings,
          mode: message.mode === 'article' ? 'article' : 'body',
          version,
        });
        setError(parsed.error ?? '');
      } catch (failure) {
        if (version !== requested.current) return;
        setError(failure instanceof Error ? failure.message : '预览暂时无法更新，原文已保留');
      }
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'koharu-preview-ready' }, window.location.origin);
    return () => {
      requested.current += 1;
      renderer.destroy();
      window.removeEventListener('message', receive);
    };
  }, [config]);

  useEffect(() => {
    window.parent.postMessage({ type: 'koharu-preview-result', error }, window.location.origin);
  }, [error]);

  useEffect(() => {
    if (!preview.version) return;
    const node = container.current;
    if (!node) return;
    node.dataset.editorOgEndpoint = endpoint.current;
    const cleanup = enhanceEditorPreview(node);
    const cleanupImages = enhanceImages(node);
    requestAnimationFrame(() => window.scrollTo({ top: position.current, behavior: 'instant' }));
    const resize = new ResizeObserver(() =>
      window.parent.postMessage(
        { type: 'koharu-preview-result', height: document.documentElement.scrollHeight, error },
        window.location.origin,
      ),
    );
    resize.observe(document.body);
    window.parent.postMessage({ type: 'koharu-preview-result', error }, window.location.origin);
    return () => {
      cleanup();
      cleanupImages();
      resize.disconnect();
    };
  }, [preview.version, error]);

  const { data } = preview;
  const title = typeof data.title === 'string' ? data.title : '未命名文章';
  const tags = Array.isArray(data.tags) ? data.tags.filter((value): value is string => typeof value === 'string') : [];
  const categories = Array.isArray(data.categories)
    ? data.categories.flat().filter((value): value is string => typeof value === 'string')
    : [];

  return (
    <>
      <div className={preview.mode === 'article' ? 'editor-article' : 'editor-body-preview'}>
        {preview.mode === 'article' && (
          <header className="editor-article-cover">
            <img src="/img/site_header_800.webp" alt="博客横幅" />
            <div>
              <h1>{title}</h1>
              <p>
                {typeof data.date === 'string' ? data.date : ''} · {author}
              </p>
            </div>
          </header>
        )}
        <main className="editor-article-grid">
          {preview.mode === 'article' && preview.headings.length > 0 && (
            <aside className="editor-article-toc shadow-box" aria-label="文章目录">
              {widePreview ? (
                <>
                  <strong>文章目录</strong>
                  <TableOfContents
                    key={`toc-${preview.version}`}
                    defaultExpanded
                    enableNumbering={data.tocNumbering !== false}
                  />
                </>
              ) : (
                <details className="editor-article-toc-disclosure">
                  <summary>文章目录</summary>
                  <TableOfContents
                    key={`toc-${preview.version}`}
                    defaultExpanded
                    enableNumbering={data.tocNumbering !== false}
                  />
                </details>
              )}
            </aside>
          )}
          <article className="editor-article-content bg-gradient-start shadow-box" key={preview.version}>
            {preview.mode === 'article' && (
              <div className="editor-article-meta">
                <p>{categories.join(' / ')}</p>
                <div>
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                {typeof data.description === 'string' && <div className="editor-article-summary">{data.description}</div>}
              </div>
            )}
            <div className="prose dark:prose-invert">
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown is sanitized with DOMPurify before this DOM boundary. */}
              <div ref={container} className="custom-content" dangerouslySetInnerHTML={{ __html: preview.html }} />
            </div>
          </article>
        </main>
      </div>
      <ContentEnhancer
        key={`content-${preview.version}`}
        containerRef={container}
        enableQuiz={config.enableQuiz}
        enableEncryptedBlock={config.enableEncryptedBlock}
        enableCopy={config.enableCodeCopy}
        enableFullscreen={config.enableCodeFullscreen}
        sanitizeDecryptedHtml={sanitizePreviewHtml}
      />
      {config.enableTweetEmbed && <EmbedHydrator key={`tweets-${preview.version}`} containerRef={container} />}
      <CodeBlockFullscreen />
      <DiagramFullscreen />
      <ImageLightbox />
    </>
  );
}

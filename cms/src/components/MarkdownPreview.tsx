/**
 * Markdown Preview Component
 *
 * Renders markdown content with full enhancement support:
 * - Shiki syntax highlighting
 * - Mac-style code block toolbars
 * - Mermaid diagram rendering
 * - Infographic chart rendering
 * - Image lightbox
 */

import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '@/lib/markdown-render';
import { enhancePreviewContent } from '@/lib/preview-enhancer';
import { EmbedHydrator } from './EmbedHydrator';
import '@/styles/preview.css';

interface MarkdownPreviewProps {
  /** Markdown content to render */
  content: string;
}

/**
 * Image Lightbox Component
 */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="preview-lightbox active"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button type="button" className="preview-lightbox-close" onClick={onClose} aria-label="Close">
        <Icon icon="ri:close-line" className="size-6" />
      </button>
      <img
        src={src}
        alt="Preview"
        className="preview-lightbox-img"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
      />
    </div>
  );
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [contentVersion, setContentVersion] = useState(0);

  // Render markdown to HTML
  useEffect(() => {
    let cancelled = false;

    async function render() {
      setIsLoading(true);
      try {
        const rendered = await renderMarkdown(content);
        if (!cancelled) {
          setHtml(rendered);
        }
      } catch (error) {
        console.error('Failed to render markdown:', error);
        if (!cancelled) {
          setHtml(`<p class="text-destructive">Failed to render markdown</p>`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [content]);

  // Enhance DOM after HTML is rendered
  useEffect(() => {
    if (!containerRef.current || !html || isLoading) return;

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(async () => {
      if (containerRef.current) {
        await enhancePreviewContent(containerRef.current, {
          onImageClick: setLightboxSrc,
        });
        // Bump content version to trigger embed re-hydration
        setContentVersion((v) => v + 1);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [html, isLoading]);

  // Close lightbox handler
  const closeLightbox = useCallback(() => {
    setLightboxSrc(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon icon="ri:loader-4-line" className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Icon icon="ri:file-text-line" className="size-10 opacity-50" />
        <p className="text-sm">No content to preview</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="preview-content"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown rendering requires innerHTML
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Hydrate embed placeholders */}
      {!isLoading && html && <EmbedHydrator key={contentVersion} containerRef={containerRef} />}

      {/* Image Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={closeLightbox} />}
    </>
  );
}

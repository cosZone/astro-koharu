/**
 * Code block toolbar rendered via portal into a wrapper created by ContentEnhancer.
 * Provides Mac-style toolbar with copy and fullscreen buttons.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { Icon } from '@iconify/react';
import { extractCode, extractCodeClassName, extractCodeHTML, extractLanguage } from '@lib/content-enhancer-utils';
import { openModal } from '@store/modal';
import { useMemo } from 'react';

interface CodeBlockToolbarProps {
  preElement: HTMLElement;
  enableCopy?: boolean;
  enableFullscreen?: boolean;
}

export function CodeBlockToolbar({ preElement, enableCopy = true, enableFullscreen = true }: CodeBlockToolbarProps) {
  const info = useMemo(
    () => ({
      language: extractLanguage(preElement),
      code: extractCode(preElement),
      codeHTML: extractCodeHTML(preElement),
      preClassName: preElement.className,
      preStyle: preElement.getAttribute('style') || '',
      codeClassName: extractCodeClassName(preElement),
      title: preElement.dataset.title,
      url: preElement.dataset.url,
      linkText: preElement.dataset.linkText,
    }),
    [preElement],
  );

  const handleFullscreen = () => {
    openModal('codeFullscreen', info);
  };

  return (
    <MacToolbar
      language={info.language}
      title={info.title}
      url={info.url}
      linkText={info.linkText}
      onFullscreen={enableFullscreen ? handleFullscreen : undefined}
    >
      {enableFullscreen && (
        <button
          type="button"
          onClick={handleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
          aria-label="全屏查看"
          title="全屏查看"
        >
          <Icon icon="ri:fullscreen-line" className="size-4" />
        </button>
      )}
      {enableCopy && <CopyButton text={info.code} />}
    </MacToolbar>
  );
}

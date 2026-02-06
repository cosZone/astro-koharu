/**
 * Code block toolbar rendered via portal into a wrapper created by ContentEnhancer.
 * Provides Mac-style toolbar with copy and fullscreen buttons.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { FullscreenIcon } from '@components/markdown/shared/icons';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
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
    }),
    [preElement],
  );

  const handleFullscreen = () => {
    openModal('codeFullscreen', info);
  };

  return (
    <MacToolbar language={info.language}>
      {enableFullscreen && (
        <button
          type="button"
          onClick={handleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
          aria-label="全屏查看"
          title="全屏查看"
        >
          <FullscreenIcon />
        </button>
      )}
      {enableCopy && <CopyButton text={info.code} />}
    </MacToolbar>
  );
}

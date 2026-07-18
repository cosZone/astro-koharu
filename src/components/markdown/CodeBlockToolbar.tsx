/**
 * Code block toolbar rendered via portal into a wrapper created by ContentEnhancer.
 * Provides Mac-style toolbar with copy and fullscreen buttons.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { extractCode, extractCodeClassName, extractCodeHTML, extractLanguage } from '@lib/content-enhancer-utils';
import { cn } from '@lib/utils';
import { openModal } from '@store/modal';
import { useEffect, useMemo, useRef, useState } from 'react';

/** Code blocks longer than this threshold start collapsed. */
const COLLAPSE_LINE_THRESHOLD = 8;

interface CodeBlockToolbarProps {
  preElement: HTMLElement;
  enableCopy?: boolean;
  enableFullscreen?: boolean;
}

export function CodeBlockToolbar({ preElement, enableCopy = true, enableFullscreen = true }: CodeBlockToolbarProps) {
  const { t } = useTranslation();
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

  const collapsible = useMemo(() => info.code.replace(/\n$/, '').split('\n').length > COLLAPSE_LINE_THRESHOLD, [info.code]);
  const [collapsed, setCollapsed] = useState(collapsible);
  const isFirstRender = useRef(true);

  // Mirror the collapsed state on the wrapper and make the toolbar clickable.
  useEffect(() => {
    const wrapper = preElement.parentElement;
    if (!wrapper || !collapsible) return;
    wrapper.classList.add('code-collapsible');

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Skip the initial animation to avoid layout shifts when many long blocks mount together.
      if (collapsed) {
        wrapper.classList.add('code-collapsed', 'code-no-transition');
        requestAnimationFrame(() => wrapper.classList.remove('code-no-transition'));
      }
    } else {
      wrapper.classList.toggle('code-collapsed', collapsed);
    }

    const toolbar = wrapper.querySelector('.code-block-wrapper-toolbar-mount');
    const handleBarClick = (event: Event) => {
      // Buttons and title links keep their own behavior instead of toggling the block.
      if ((event.target as HTMLElement).closest('button, a')) return;
      setCollapsed((prev) => !prev);
    };
    toolbar?.addEventListener('click', handleBarClick);
    return () => {
      wrapper.classList.remove('code-collapsed', 'code-collapsible');
      toolbar?.removeEventListener('click', handleBarClick);
    };
  }, [preElement, collapsible, collapsed]);

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
      {collapsible && (
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
          aria-label={collapsed ? t('code.expand') : t('code.collapse')}
          aria-expanded={!collapsed}
          title={collapsed ? t('code.expand') : t('code.collapse')}
        >
          <Icon
            icon="ri:arrow-down-s-line"
            className={cn('size-4 transition-transform duration-200', !collapsed && 'rotate-180')}
          />
        </button>
      )}
      {enableFullscreen && (
        <button
          type="button"
          onClick={handleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
          aria-label={t('code.fullscreen')}
          title={t('code.fullscreen')}
        >
          <Icon icon="ri:fullscreen-line" className="size-4" />
        </button>
      )}
      {enableCopy && <CopyButton text={info.code} />}
    </MacToolbar>
  );
}

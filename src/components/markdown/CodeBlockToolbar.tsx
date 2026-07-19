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
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

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

  // The build-time transformer owns the collapsibility decision; the wrapper class is its output.
  const collapsible = useMemo(() => preElement.parentElement?.classList.contains('code-collapsible') ?? false, [preElement]);
  const [collapsed, setCollapsed] = useState(collapsible);

  useLayoutEffect(() => {
    const wrapper = preElement.parentElement;
    if (!wrapper || !collapsible) return;
    wrapper.classList.toggle('code-collapsed', collapsed);
    return () => wrapper.classList.remove('code-collapsed');
  }, [preElement, collapsible, collapsed]);

  // Make the full toolbar clickable while preserving button and link behavior.
  useEffect(() => {
    const wrapper = preElement.parentElement;
    if (!wrapper || !collapsible) return;
    const toolbar = wrapper.querySelector('.code-block-wrapper-toolbar-mount');
    const handleBarClick = (event: Event) => {
      // Buttons and title links keep their own behavior instead of toggling the block.
      if ((event.target as HTMLElement).closest('button, a')) return;
      setCollapsed((prev) => !prev);
    };
    toolbar?.addEventListener('click', handleBarClick);
    return () => toolbar?.removeEventListener('click', handleBarClick);
  }, [preElement, collapsible]);

  const handleFullscreen = () => {
    openModal('codeFullscreen', info);
  };

  return (
    <>
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
      {collapsible && collapsed && (
        <button
          type="button"
          className="code-block-expand-overlay"
          onClick={() => setCollapsed(false)}
          aria-label={t('code.expand')}
          title={t('code.expand')}
        >
          <span className="code-block-expand-overlay-icon">
            <Icon icon="ri:arrow-down-s-line" className="size-5" />
          </span>
        </button>
      )}
    </>
  );
}

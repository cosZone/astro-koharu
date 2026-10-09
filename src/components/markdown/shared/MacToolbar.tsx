/**
 * Shared Mac-style toolbar component for code blocks, mermaid, and infographic diagrams.
 * Renders traffic lights + language label on the left, action buttons (children) on the right.
 */

import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { TrafficLights } from './TrafficLights';

interface MacToolbarProps {
  language: string;
  title?: string;
  url?: string;
  linkText?: string;
  className?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  onFullscreen?: () => void;
}

export function MacToolbar({ language, title, url, linkText, className, children, onClose, onFullscreen }: MacToolbarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col rounded-t-xl border border-(--code-border) border-b-0 bg-(--code-toolbar)',
        onClose && 'tablet:rounded-none',
        className,
      )}
    >
      <div className="flex min-h-13 min-w-0 items-center justify-between pr-2 pl-4 tablet:pl-3">
        <div className="flex min-w-0 items-center gap-3 py-2">
          <div className="tablet:hidden shrink-0">
            <TrafficLights onFullscreen={onFullscreen} />
          </div>
          <span
            className="truncate font-mono text-[0.6875rem] text-muted-foreground/80 uppercase tracking-[0.08em]"
            title={language}
          >
            {language}
          </span>
        </div>
        {(children || onClose) && (
          <div className="ml-auto flex shrink-0 items-center py-1 tablet:[&_button]:min-h-11 tablet:[&_button]:min-w-11">
            {children}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
                aria-label={t('common.close')}
                title={t('common.close')}
              >
                <Icon icon="ri:close-line" className="size-5" />
              </button>
            )}
          </div>
        )}
      </div>
      {(title || url) && (
        <div className="code-block-title">
          {title && <span>{title}</span>}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              {linkText || url}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

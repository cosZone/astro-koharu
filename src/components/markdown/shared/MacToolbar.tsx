/**
 * Shared Mac-style toolbar component for code blocks, mermaid, and infographic diagrams.
 * Renders traffic lights + language label on the left, action buttons (children) on the right.
 */

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
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border border-border border-b-0 bg-muted/50 backdrop-blur-sm',
        'rounded-t-xl shadow-md',
        'dark:bg-muted/30',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between pr-2 pl-4">
        <div className="flex items-center gap-3 py-2">
          <TrafficLights onClose={onClose} onFullscreen={onFullscreen} />
          <span className="font-medium font-mono text-muted-foreground text-xs uppercase tracking-wider">{language}</span>
        </div>
        {children && <div className="ml-auto flex items-center py-1">{children}</div>}
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

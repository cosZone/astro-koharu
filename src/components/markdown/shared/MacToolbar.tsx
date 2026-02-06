/**
 * Shared Mac-style toolbar component for code blocks, mermaid, and infographic diagrams.
 * Renders traffic lights + language label on the left, action buttons (children) on the right.
 */

import { cn } from '@lib/utils';
import { TrafficLights } from './TrafficLights';

interface MacToolbarProps {
  language: string;
  className?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  onFullscreen?: () => void;
}

export function MacToolbar({ language, className, children, onClose, onFullscreen }: MacToolbarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between border border-border border-b-0 bg-muted/50 pr-2 pl-4 backdrop-blur-sm',
        'rounded-t-xl shadow-md',
        'dark:bg-muted/30',
        className,
      )}
    >
      <div className="flex items-center gap-3 py-2">
        <TrafficLights onClose={onClose} onFullscreen={onFullscreen} />
        <span className="font-medium font-mono text-muted-foreground text-xs uppercase tracking-wider">{language}</span>
      </div>
      {children && <div className="ml-auto flex items-center py-1">{children}</div>}
    </div>
  );
}

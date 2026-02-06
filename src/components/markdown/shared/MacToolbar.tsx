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
}

export function MacToolbar({ language, className, children }: MacToolbarProps) {
  return (
    <div
      className={cn(
        'flex h-10 shrink-0 items-center justify-between border border-border border-b-0 bg-muted/50 px-4 backdrop-blur-sm',
        'rounded-t-xl shadow-md',
        'dark:bg-muted/30',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <TrafficLights />
        <span className="font-medium font-mono text-muted-foreground text-xs uppercase tracking-wider">{language}</span>
      </div>
      {children && <div className="flex items-center">{children}</div>}
    </div>
  );
}

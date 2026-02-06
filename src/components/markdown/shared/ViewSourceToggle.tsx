/**
 * Toggle button between rendered diagram view and source code view.
 * Shared by mermaid and infographic toolbars.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';

interface ViewSourceToggleProps {
  isSourceView: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function ViewSourceToggle({ isSourceView, onToggle, disabled, className }: ViewSourceToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground active:scale-95',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      aria-label={isSourceView ? '查看渲染结果' : '查看源码'}
      title={isSourceView ? '查看渲染结果' : '查看源码'}
    >
      {isSourceView ? (
        <Icon icon="ri:bar-chart-box-line" className="size-4" />
      ) : (
        <Icon icon="ri:code-s-slash-line" className="size-4" />
      )}
    </button>
  );
}

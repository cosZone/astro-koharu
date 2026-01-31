/**
 * Editor Table of Contents
 *
 * Displays a navigable list of headings extracted from the BlockNote editor.
 * Clicking a heading scrolls the editor to that block.
 */

import { Icon } from '@iconify/react';
import type { EditorHeading } from '@/hooks/useEditorHeadings';
import { cn } from '@/lib/utils';

interface EditorTOCProps {
  /** List of headings from the editor */
  headings: EditorHeading[];
  /** Callback when a heading is clicked */
  onNavigate: (blockId: string) => void;
}

/**
 * Indentation class based on heading level
 */
function getIndentClass(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return '';
    case 2:
      return 'pl-4';
    case 3:
      return 'pl-8';
  }
}

/**
 * Text size class based on heading level
 */
function getTextClass(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return 'font-medium';
    case 2:
      return 'text-sm';
    case 3:
      return 'text-xs text-muted-foreground';
  }
}

export function EditorTOC({ headings, onNavigate }: EditorTOCProps) {
  if (headings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <Icon icon="ri:list-unordered" className="size-8 opacity-50" />
        <p className="text-sm">暂无标题</p>
        <p className="text-center text-xs">添加 Heading 块来生成目录</p>
      </div>
    );
  }

  return (
    <nav className="space-y-0.5" aria-label="文章目录">
      {headings.map((heading) => (
        <button
          key={heading.id}
          type="button"
          onClick={() => onNavigate(heading.id)}
          className={cn(
            'block w-full truncate rounded px-2 py-1.5 text-left transition-colors',
            'hover:bg-muted',
            getIndentClass(heading.level),
            getTextClass(heading.level),
          )}
          title={heading.text}
        >
          {heading.text}
        </button>
      ))}
    </nav>
  );
}

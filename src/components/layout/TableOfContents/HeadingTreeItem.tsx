import { useTranslation } from '@hooks/useTranslation';
import { findHeadingById, type Heading } from '@lib/toc';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useTocContext } from './TocContext';

const INDENT_BASE = 1.75;
const INDENT_PER_LEVEL = 1;

interface HeadingTreeItemProps {
  heading: Heading;
  depth?: number;
  numberPath: number[];
  children?: React.ReactNode;
}

export function HeadingTreeItem({ heading, depth = 0, numberPath, children }: HeadingTreeItemProps) {
  const { activeId, expandedIds, onHeadingClick } = useTocContext();
  const { t } = useTranslation();
  const isActive = activeId === heading.id;
  const isAncestor = heading.children.some((child) => findHeadingById([child], activeId) !== null);
  const isOpen = expandedIds.has(heading.id);
  const hasChildren = heading.children.length > 0;
  const isVisibleCurrent = isActive || (isAncestor && !isOpen);

  return (
    <div className="heading-tree-item relative" data-depth={depth} data-current-branch={isActive || isAncestor || undefined}>
      <div className="toc-heading-row">
        <a
          href={`#${heading.id}`}
          onClick={(event) => {
            event.preventDefault();
            onHeadingClick(heading.id);
          }}
          className={cn('heading-link silk-heading-link group', isVisibleCurrent && 'text-primary')}
          style={
            {
              paddingLeft: `${INDENT_BASE + depth * INDENT_PER_LEVEL}rem`,
              paddingRight: isVisibleCurrent ? '2.75rem' : '0.5rem',
              '--toc-thread-x': `${0.8125 + depth * INDENT_PER_LEVEL}rem`,
            } as CSSProperties
          }
          data-number={numberPath.join('.')}
          data-chapter-number={String(numberPath.at(-1) ?? '').padStart(2, '0')}
          data-level={heading.level}
          data-depth={depth}
          data-toc-row={heading.id}
          data-ancestor={isAncestor || undefined}
          aria-label={heading.text}
          aria-current={isVisibleCurrent ? 'location' : undefined}
          title={heading.text}
        >
          <span className="toc-node" aria-hidden="true" />
          <span className="heading-text">{heading.text}</span>
        </a>
        {isVisibleCurrent && (
          <span
            className="toc-section-progress"
            role="progressbar"
            aria-label={`${heading.text}: ${t('toc.sectionProgress')}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            0%
          </span>
        )}
      </div>
      {hasChildren && (
        <div className="heading-children silk-heading-children" data-open={isOpen || undefined} inert={!isOpen}>
          <div className="heading-children-inner silk-heading-children-inner">{children}</div>
        </div>
      )}
    </div>
  );
}

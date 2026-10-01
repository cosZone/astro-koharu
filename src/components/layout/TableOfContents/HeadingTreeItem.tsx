import { useTranslation } from '@hooks/useTranslation';
import { findHeadingById, type Heading, stripRepeatedOrdinal, tocNumberLabel } from '@lib/toc';
import type { CSSProperties, PointerEvent } from 'react';
import { useTocContext } from './TocContext';

interface HeadingTreeItemProps {
  heading: Heading;
  depth?: number;
  numberPath: number[];
  /** Whether entries are numbered; a heading's own repeated ordinal is then dropped */
  numbered: boolean;
  children?: React.ReactNode;
}

/** Offers the full title as a tooltip only while the row has to clamp it. */
function titleIfClamped(event: PointerEvent<HTMLAnchorElement>, title: string) {
  const link = event.currentTarget;
  const text = link.querySelector<HTMLElement>('.heading-text');
  if (text && text.scrollHeight > text.clientHeight + 1) link.title = title;
  else link.removeAttribute('title');
}

export function HeadingTreeItem({ heading, depth = 0, numberPath, numbered, children }: HeadingTreeItemProps) {
  const { activeId, expandedIds, onHeadingClick } = useTocContext();
  const { t } = useTranslation();
  const isActive = activeId === heading.id;
  const isAncestor = heading.children.some((child) => findHeadingById([child], activeId) !== null);
  const isOpen = expandedIds.has(heading.id);
  const hasChildren = heading.children.length > 0;
  const isVisibleCurrent = isActive || (isAncestor && !isOpen);
  const label = numbered ? tocNumberLabel(numberPath) : '';
  const ordinal = numberPath.at(-1);
  const text = label && ordinal !== undefined ? stripRepeatedOrdinal(heading.text, ordinal) : heading.text;

  return (
    <div className="heading-tree-item" data-depth={depth} style={{ '--toc-depth': depth } as CSSProperties}>
      <div className="toc-heading-row">
        <a
          href={`#${heading.id}`}
          onClick={(event) => {
            event.preventDefault();
            onHeadingClick(heading.id);
          }}
          onPointerEnter={(event) => titleIfClamped(event, heading.text)}
          className="silk-heading-link"
          data-level={heading.level}
          data-toc-row={heading.id}
          data-ancestor={isAncestor || undefined}
          aria-label={heading.text}
          aria-current={isVisibleCurrent ? 'location' : undefined}
        >
          <span className="toc-node" aria-hidden="true" />
          {label && (
            <span className="toc-number" aria-hidden="true">
              {label}
            </span>
          )}
          <span className="heading-text">{text}</span>
        </a>
        {isVisibleCurrent && (
          <span
            className="toc-section-progress sr-only"
            role="progressbar"
            aria-label={`${heading.text}: ${t('toc.sectionProgress')}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          />
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

/**
 * NavMenu Component
 *
 * Item list of the header's hover menus (article sections, languages). One highlight glides
 * between the items on the same spring as the header pill: at rest it marks the current page,
 * and it follows the pointer or keyboard focus while either is on an item.
 */

import { useGlideIndicator } from '@hooks/useGlideIndicator';
import { Icon } from '@iconify/react';
import { useRef, useState } from 'react';

export interface NavMenuItem {
  key: string;
  href: string;
  label: string;
  icon?: string;
  current?: boolean;
}

interface NavMenuProps {
  items: NavMenuItem[];
  /** Runs when an item is picked, before the page swap */
  onSelect: () => void;
}

export function NavMenu({ items, onSelect }: NavMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const current = items.find((item) => item.current)?.key ?? null;
  useGlideIndicator(listRef, indicatorRef, intent ?? current, 'y');

  return (
    <div ref={listRef} className="nav-dropdown" onPointerLeave={() => setIntent(null)}>
      <span ref={indicatorRef} aria-hidden="true" className="nav-dropdown-indicator" />
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          onClick={onSelect}
          onPointerEnter={() => setIntent(item.key)}
          onFocus={() => setIntent(item.key)}
          onBlur={(event) => {
            if (!(event.relatedTarget instanceof Node && listRef.current?.contains(event.relatedTarget))) setIntent(null);
          }}
          aria-current={item.current ? 'page' : undefined}
          data-glide-key={item.key}
          className="nav-dropdown-item"
        >
          {item.icon && (
            <span className="inline-flex size-4 shrink-0 items-center justify-center">
              <Icon icon={item.icon} className="size-4" />
            </span>
          )}
          {item.label}
        </a>
      ))}
    </div>
  );
}

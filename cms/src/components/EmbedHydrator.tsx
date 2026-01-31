/**
 * Embed Hydrator Component
 *
 * Finds embed placeholder divs in the DOM and hydrates them
 * with React components using portals.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadCache } from '@/lib/og-service';
import { CodePenEmbed, LinkPreview, TweetEmbed } from './embed';

interface EmbedTarget {
  id: string;
  type: 'tweet' | 'codepen' | 'link';
  element: HTMLElement;
  data: Record<string, string>;
}

interface EmbedHydratorProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function EmbedHydrator({ containerRef }: EmbedHydratorProps) {
  const [targets, setTargets] = useState<EmbedTarget[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pre-load OG cache for link previews
    loadCache();

    // Find all embed placeholders
    const newTargets: EmbedTarget[] = [];

    // Tweet embeds
    container.querySelectorAll<HTMLElement>('[data-tweet-embed]:not([data-hydrated])').forEach((element, i) => {
      element.setAttribute('data-hydrated', 'true');
      newTargets.push({
        id: `tweet-${i}`,
        type: 'tweet',
        element,
        data: { tweetId: element.dataset.tweetId || '' },
      });
    });

    // CodePen embeds
    container.querySelectorAll<HTMLElement>('[data-codepen-embed]:not([data-hydrated])').forEach((element, i) => {
      element.setAttribute('data-hydrated', 'true');
      newTargets.push({
        id: `codepen-${i}`,
        type: 'codepen',
        element,
        data: {
          user: element.dataset.user || '',
          penId: element.dataset.penId || '',
          url: element.dataset.url || '',
        },
      });
    });

    // Link previews
    container.querySelectorAll<HTMLElement>('[data-link-preview]:not([data-hydrated])').forEach((element, i) => {
      element.setAttribute('data-hydrated', 'true');
      newTargets.push({
        id: `link-${i}`,
        type: 'link',
        element,
        data: { url: element.dataset.url || '' },
      });
    });

    if (newTargets.length > 0) {
      setTargets((prev) => [...prev, ...newTargets]);
    }
  }, [containerRef]);

  return (
    <>
      {targets.map((target) => {
        switch (target.type) {
          case 'tweet':
            return createPortal(<TweetEmbed key={target.id} tweetId={target.data.tweetId} />, target.element);
          case 'codepen':
            return createPortal(
              <CodePenEmbed key={target.id} user={target.data.user} penId={target.data.penId} url={target.data.url} />,
              target.element,
            );
          case 'link':
            return createPortal(<LinkPreview key={target.id} url={target.data.url} />, target.element);
          default:
            return null;
        }
      })}
    </>
  );
}

/**
 * EmbedHydrator component
 * Finds embed placeholders in the DOM and hydrates them with React components
 * Note: Link previews are now server-rendered, only tweets need client hydration
 */

import { ErrorBoundary, ErrorFallback } from '@components/common';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import TweetEmbed from './TweetEmbed';

interface TweetPlaceholder {
  element: Element;
  tweetId: string;
}

export function EmbedHydrator() {
  const [tweetPlaceholders, setTweetPlaceholders] = useState<TweetPlaceholder[]>([]);

  useEffect(() => {
    // Find all tweet embed placeholders
    const tweetEmbeds = document.querySelectorAll('[data-tweet-embed]');
    const placeholders: TweetPlaceholder[] = [];

    tweetEmbeds.forEach((element) => {
      const tweetId = element.getAttribute('data-tweet-id');
      if (!tweetId) return;

      // Check if already hydrated
      if (element.getAttribute('data-hydrated') === 'true') return;

      placeholders.push({ element, tweetId });

      // Mark as hydrated
      element.setAttribute('data-hydrated', 'true');
    });

    setTweetPlaceholders(placeholders);
  }, []);

  // Render tweets using portals instead of creating new roots
  return (
    <>
      {tweetPlaceholders.map(({ element, tweetId }) =>
        createPortal(
          <ErrorBoundary fallbackRender={(props) => <ErrorFallback {...props} title="TweetEmbed Error" />}>
            <TweetEmbed tweetId={tweetId} />
          </ErrorBoundary>,
          element,
        ),
      )}
    </>
  );
}

/**
 * EmbedHydrator component
 * Finds embed placeholders in the DOM and hydrates them with React components
 * Note: Link previews are now server-rendered, only tweets need client hydration
 */

import { ErrorBoundary, ErrorFallback } from '@components/common';
import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import TweetEmbed from './TweetEmbed';

export function EmbedHydrator() {
  useEffect(() => {
    // Store all created roots for cleanup
    const roots: Root[] = [];

    // Find all tweet embed placeholders
    const tweetEmbeds = document.querySelectorAll('[data-tweet-embed]');
    tweetEmbeds.forEach((element) => {
      const tweetId = element.getAttribute('data-tweet-id');
      if (!tweetId) return;

      // Check if already hydrated
      if (element.getAttribute('data-hydrated') === 'true') return;

      // Create a root and render the TweetEmbed component with error boundary
      const root = createRoot(element);
      root.render(
        <ErrorBoundary fallbackRender={(props) => <ErrorFallback {...props} title="TweetEmbed Error" />}>
          <TweetEmbed tweetId={tweetId} />
        </ErrorBoundary>,
      );
      roots.push(root);

      // Mark as hydrated
      element.setAttribute('data-hydrated', 'true');
    });

    // Cleanup function: unmount all roots when component unmounts
    return () => {
      for (const root of roots) {
        root.unmount();
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}

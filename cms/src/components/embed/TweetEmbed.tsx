/**
 * Tweet Embed Component for CMS Preview
 *
 * Renders Twitter/X tweets using react-tweet library with theme support.
 */

import { useEffect, useState } from 'react';
import { Tweet } from 'react-tweet';

interface TweetEmbedProps {
  tweetId: string;
}

export function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Check for dark theme
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    checkTheme();

    // Observe theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const theme = isDark ? 'dark' : 'light';

  if (!mounted) {
    return (
      <output className="my-4 flex justify-center" aria-busy="true" aria-label="Loading tweet">
        <div className="w-full max-w-[550px] animate-pulse rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 h-20 rounded bg-muted" />
        </div>
      </output>
    );
  }

  return (
    <div className="not-prose my-4 flex justify-center" data-theme={theme}>
      <Tweet id={tweetId} />
    </div>
  );
}

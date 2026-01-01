/**
 * Tweet embed component using react-tweet
 * Provides a lightweight, theme-aware Twitter/X embed
 */

import { useIsDarkTheme } from '@hooks/index';
import { useEffect, useState } from 'react';
import { Tweet } from 'react-tweet';

interface TweetEmbedProps {
  tweetId: string;
}

function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const [mounted, setMounted] = useState(false);
  const isDark = useIsDarkTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = isDark ? 'dark' : 'light';

  if (!mounted) {
    return (
      <output className="my-6 flex justify-center" aria-busy="true" aria-label="正在加载 Tweet">
        <div className="w-full max-w-[550px] animate-pulse rounded-xl bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-muted"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted"></div>
              <div className="h-3 w-24 rounded bg-muted"></div>
            </div>
          </div>
          <div className="mt-4 h-20 rounded bg-muted"></div>
        </div>
      </output>
    );
  }

  return (
    <div className="not-prose my-6 flex justify-center" data-theme={theme}>
      <Tweet id={tweetId} />
    </div>
  );
}

export default TweetEmbed;

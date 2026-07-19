/**
 * Tweet embed component using react-tweet
 * Provides a lightweight, theme-aware Twitter/X embed
 */

import { useIsDarkTheme } from '@hooks/index';
import { Tweet } from 'react-tweet';

interface TweetEmbedProps {
  tweetId: string;
  sourceUrl: string;
}

function TweetEmbed({ sourceUrl, tweetId }: TweetEmbedProps) {
  const isDark = useIsDarkTheme();

  const theme = isDark ? 'dark' : 'light';

  return (
    <div className="not-prose my-6 flex justify-center" data-theme={theme}>
      <Tweet
        id={tweetId}
        components={{
          TweetNotFound: () => (
            <div className="w-full max-w-[550px] rounded-xl border border-border bg-card p-5 text-center">
              <p className="m-0 font-medium text-foreground">Tweet unavailable</p>
              <a
                href={sourceUrl}
                target="_blank"
                className="mt-2 block truncate text-primary text-sm hover:underline"
                rel="noopener noreferrer"
                title={sourceUrl}
              >
                {sourceUrl}
              </a>
            </div>
          ),
        }}
      />
    </div>
  );
}

export default TweetEmbed;

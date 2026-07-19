/**
 * Tweet embed component using react-tweet
 * Provides a lightweight, theme-aware Twitter/X embed
 */

import { useIsDarkTheme } from '@hooks/index';
import { Tweet } from 'react-tweet';

interface TweetEmbedProps {
  tweetId: string;
}

function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const isDark = useIsDarkTheme();

  const theme = isDark ? 'dark' : 'light';

  return (
    <div className="not-prose my-6 flex justify-center" data-theme={theme}>
      <Tweet id={tweetId} />
    </div>
  );
}

export default TweetEmbed;

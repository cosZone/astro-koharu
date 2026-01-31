/**
 * CodePen Embed Component for CMS Preview
 *
 * Renders CodePen pens using iframe embed.
 */

import { useEffect, useState } from 'react';

interface CodePenEmbedProps {
  user: string;
  penId: string;
  url: string;
}

export function CodePenEmbed({ user, penId, url }: CodePenEmbedProps) {
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
      <output className="my-4 block" aria-busy="true" aria-label="Loading CodePen">
        <div className="h-[400px] w-full animate-pulse rounded-lg border border-border bg-card" />
      </output>
    );
  }

  // CodePen iframe embed URL
  const embedUrl = `https://codepen.io/${user}/embed/${penId}?default-tab=result&theme-id=${theme}`;

  return (
    <div className="not-prose my-4">
      <iframe
        height="400"
        className="w-full rounded-lg border border-border"
        scrolling="no"
        title={`CodePen by ${user}`}
        src={embedUrl}
        loading="lazy"
        allowFullScreen
      >
        <a href={url}>See the Pen on CodePen</a>
      </iframe>
    </div>
  );
}

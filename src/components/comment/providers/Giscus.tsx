import GiscusComponent from '@giscus/react';
import { useEffect, useState } from 'react';
import { commentConfig } from '@/constants/site-config';

type GiscusTheme = 'light' | 'dark';

function sendMessage<T>(message: T) {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  if (!iframe) return;
  iframe.contentWindow?.postMessage({ giscus: message }, 'https://giscus.app');
}

function getTheme(): GiscusTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function Giscus() {
  const config = commentConfig.giscus;
  const [theme, setTheme] = useState<GiscusTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getTheme());

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newTheme = getTheme();
          setTheme(newTheme);
          sendMessage({ setConfig: { theme: newTheme } });
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  if (!mounted || !config?.repo) return null;

  const [owner, repo] = config.repo.split('/');
  if (!owner || !repo) {
    console.error('[Giscus] Invalid repo format. Expected "owner/repo"');
    return null;
  }

  return (
    <GiscusComponent
      repo={config.repo as `${string}/${string}`}
      repoId={config.repoId}
      category={config.category}
      categoryId={config.categoryId}
      mapping={config.mapping ?? 'pathname'}
      reactionsEnabled={config.reactionsEnabled !== false ? '1' : '0'}
      emitMetadata={config.emitMetadata ? '1' : '0'}
      inputPosition={config.inputPosition ?? 'top'}
      theme={theme}
      lang={config.lang ?? 'zh-CN'}
      loading="lazy"
    />
  );
}

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
      host={config?.host}
      repo={config.repo}
      repoId={config.repoId}
      category={config?.category}
      categoryId={config?.categoryId}
      mapping={config?.mapping ?? 'pathname'}
      term={config?.term}
      strict={config?.strict}
      reactionsEnabled={config?.reactionsEnabled}
      emitMetadata={config?.emitMetadata}
      inputPosition={config?.inputPosition ?? 'top'}
      theme={config?.theme ?? theme}
      lang={config?.lang ?? 'zh-CN'}
      loading={config?.loading ?? 'lazy'}
    />
  );
}

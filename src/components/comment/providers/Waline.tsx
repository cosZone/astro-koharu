import { init, type WalineInstance } from '@waline/client';
import '@waline/client/style';
import '@/styles/components/waline.css';
import { useEffect, useRef } from 'react';
import { commentConfig } from '@/constants/site-config';

// Config is module-level static data parsed from YAML at build time - won't change at runtime
const config = commentConfig.waline;

export default function Waline() {
  const walineInstanceRef = useRef<WalineInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    // Initialize Waline
    walineInstanceRef.current = init({
      el: containerRef.current,
      serverURL: config.serverURL,
      lang: config.lang ?? 'zh-CN',
      dark: config.dark ?? 'html.dark', // CSS selector to auto-follow theme
      meta: config.meta ?? ['nick', 'mail', 'link'],
      requiredMeta: config.requiredMeta ?? ['nick'],
      login: config.login ?? 'enable',
      wordLimit: config.wordLimit ?? 0,
      pageSize: config.pageSize ?? 10,
      imageUploader: config.imageUploader ?? false,
      highlighter: config.highlighter ?? true,
      texRenderer: config.texRenderer ?? false,
      search: config.search ?? false,
      reaction: config.reaction ?? false,
      recaptchaV3Key: config.recaptchaV3Key,
      turnstileKey: config.turnstileKey,
    });

    // Handle Astro page transitions - update path when navigating
    const handlePageLoad = () => {
      walineInstanceRef.current?.update({ path: window.location.pathname });
    };
    document.addEventListener('astro:page-load', handlePageLoad);

    return () => {
      walineInstanceRef.current?.destroy();
      document.removeEventListener('astro:page-load', handlePageLoad);
    };
  }, []);

  if (!config) return null;

  return <div ref={containerRef} />;
}

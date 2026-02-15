import { useEffect, useRef } from 'react';
import { commentConfig } from '@/constants/site-config';
import { getHtmlLang, getLocaleFromUrl } from '@/i18n/utils';
import 'twikoo/dist/twikoo.css';
import '@/styles/components/twikoo.css';

// Config is module-level static data parsed from YAML at build time - won't change at runtime
const config = commentConfig.twikoo;

export default function Twikoo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    const initTwikoo = async () => {
      if (!containerRef.current) return;
      // Clear container to avoid duplicate init (Twikoo has no destroy/update API)
      containerRef.current.innerHTML = '';
      const locale = getLocaleFromUrl(window.location.pathname);
      // Dynamic import: twikoo is a UMD bundle (~500KB) with no type definitions,
      // and accesses `document` at module load time — lazy loading is the cleanest approach
      const { init } = await import('twikoo/dist/twikoo.nocss.js');
      if (!containerRef.current) return;
      init({
        envId: config.envId,
        el: containerRef.current,
        region: config.region,
        path: config.path ?? window.location.pathname,
        lang: config.lang ?? getHtmlLang(locale),
      });
    };

    // astro:page-load fires on initial load AND on subsequent navigations
    document.addEventListener('astro:page-load', initTwikoo);
    return () => {
      document.removeEventListener('astro:page-load', initTwikoo);
    };
  }, []);

  if (!config) return null;
  return <div ref={containerRef} id="tcomment" />;
}

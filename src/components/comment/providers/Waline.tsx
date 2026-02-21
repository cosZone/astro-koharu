import { init, type WalineInstance } from '@waline/client';
import '@waline/client/style';
import '@/styles/components/waline.css';
import { useEffect, useRef } from 'react';
import { commentConfig } from '@/constants/site-config';
import { getHtmlLang, getLocaleFromUrl } from '@/i18n/utils';

// Config is module-level static data parsed from YAML at build time - won't change at runtime
const config = commentConfig.waline;

export default function Waline() {
  const walineInstanceRef = useRef<WalineInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    // Initialize Waline with locale-aware lang
    const currentLocale = getLocaleFromUrl(window.location.pathname);
    walineInstanceRef.current = init({
      // Project-specific defaults (differ from Waline's built-in defaults)
      requiredMeta: ['nick'],
      imageUploader: false,
      // Spread user config (overrides above defaults if explicitly set)
      ...config,
      // Runtime overrides (must come after spread)
      el: containerRef.current,
      path: window.location.pathname,
      lang: config.lang ?? getHtmlLang(currentLocale),
      dark: config.dark ?? 'html.dark',
    });

    // Handle Astro page transitions - update path when navigating
    const handlePageLoad = () => {
      const newLocale = getLocaleFromUrl(window.location.pathname);
      walineInstanceRef.current?.update({
        path: window.location.pathname,
        lang: config.lang ?? getHtmlLang(newLocale),
      });
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

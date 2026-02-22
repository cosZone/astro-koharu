import { useEffect, useRef, useState } from 'react';
import { commentConfig } from '@/constants/site-config';
import { getHtmlLang, getLocaleFromUrl } from '@/i18n/utils';
import 'twikoo/dist/twikoo.css';
import '@/styles/components/twikoo.css';

// Config is module-level static data parsed from YAML at build time - won't change at runtime
const config = commentConfig.twikoo;

function TwikooSkeleton() {
  return (
    <div className="twikoo-skeleton animate-pulse space-y-4 px-4" aria-hidden="true">
      {/* Avatar + meta inputs row */}
      <div className="flex gap-3">
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <div className="flex flex-1 gap-2">
          <div className="h-10 flex-1 rounded bg-muted" />
          <div className="hidden h-10 flex-1 rounded bg-muted sm:block" />
          <div className="hidden h-10 flex-1 rounded bg-muted sm:block" />
        </div>
      </div>
      {/* Textarea */}
      <div className="h-[150px] rounded bg-muted" />
      {/* Action row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="size-6 rounded bg-muted" />
          <div className="size-6 rounded bg-muted" />
        </div>
        <div className="h-9 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function Twikoo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    const initTwikoo = async () => {
      if (!containerRef.current) return;
      setLoading(true);
      // Clear container to avoid duplicate init (Twikoo has no destroy/update API)
      containerRef.current.innerHTML = '';
      const locale = getLocaleFromUrl(window.location.pathname);
      // Dynamic import: twikoo is a UMD bundle (~500KB) with no type definitions,
      // and accesses `document` at module load time — lazy loading is the cleanest approach
      const { init } = await import('twikoo/dist/twikoo.nocss.js');
      if (!containerRef.current) return;
      await init({
        envId: config.envId,
        el: containerRef.current,
        region: config.region,
        path: config.path ?? window.location.pathname,
        lang: config.lang ?? getHtmlLang(locale),
      });
      setLoading(false);
    };

    // 直接调用：修复 astro:page-load 在 React 挂载前就已触发的竞态条件
    initTwikoo();

    // 保留监听器处理后续导航（View Transitions）
    document.addEventListener('astro:page-load', initTwikoo);
    return () => {
      document.removeEventListener('astro:page-load', initTwikoo);
    };
  }, []);

  if (!config) return null;

  return (
    <div className="px-4">
      {loading && <TwikooSkeleton />}
      <div ref={containerRef} id="tcomment" className={loading ? 'hidden' : undefined} />
    </div>
  );
}

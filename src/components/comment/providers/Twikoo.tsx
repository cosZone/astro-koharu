import { useEffect, useRef, useState } from 'react';
import { commentConfig } from '@/constants/site-config';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!config || !containerRef.current) return;
    let active = true;

    const initTwikoo = async () => {
      if (!containerRef.current) return;
      setStatus('loading');
      // Clear container to avoid duplicate init (Twikoo has no destroy/update API)
      containerRef.current.innerHTML = '';
      const locale = getLocaleFromUrl(window.location.pathname);
      try {
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
        if (active) setStatus('ready');
      } catch (error) {
        console.error('[Twikoo] Failed to initialize:', error);
        if (active) setStatus('error');
      }
    };

    void initTwikoo();
    return () => {
      active = false;
    };
  }, []);

  if (!config) return null;

  return (
    <div className="px-4">
      {status === 'loading' && <TwikooSkeleton />}
      {status === 'error' && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('comment.error')}</p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm transition-opacity hover:opacity-90"
            onClick={() => window.location.reload()}
          >
            {t('comment.retry')}
          </button>
        </div>
      )}
      <div ref={containerRef} id="tcomment" className={status === 'ready' ? undefined : 'hidden'} />
    </div>
  );
}

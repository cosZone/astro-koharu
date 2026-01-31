/**
 * Link Preview Component for CMS Preview
 *
 * Renders Open Graph preview cards for general links.
 */

import { useEffect, useState } from 'react';
import { getDomain } from '@/lib/link-utils';
import { getOGData, type OGData } from '@/lib/og-service';

interface LinkPreviewProps {
  url: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [ogData, setOgData] = useState<OGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOGData() {
      try {
        const data = await getOGData(url);
        if (!cancelled) {
          setOgData(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setOgData({
            originUrl: url,
            url,
            error: 'Failed to load',
          });
          setLoading(false);
        }
      }
    }

    loadOGData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <output className="my-4 block" aria-busy="true" aria-label="Loading link preview">
        <div className="animate-pulse rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        </div>
      </output>
    );
  }

  if (!ogData) {
    return null;
  }

  const domain = getDomain(ogData.url);
  const hasError = ogData.error || !ogData.title;

  // Error or fallback state
  if (hasError) {
    return (
      <div className="link-preview-block my-4" data-state="error">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
          aria-label={domain}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="28"
                    strokeDashoffset="28"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 6l2 -2c1 -1 3 -1 4 0l1 1c1 1 1 3 0 4l-5 5c-1 1 -3 1 -4 0M11 18l-2 2c-1 1 -3 1 -4 0l-1 -1c-1 -1 -1 -3 0 -4l5 -5c1 -1 3 -1 4 0"
                  >
                    <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="28;0" />
                  </path>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{url}</div>
                <div className="mt-0.5 truncate text-muted-foreground text-xs">{domain}</div>
              </div>
            </div>
            <svg
              className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </a>
      </div>
    );
  }

  // Success state with full OG data
  return (
    <div className="link-preview-block my-4" data-state="success">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-lg border border-border transition-all hover:border-primary/50 hover:shadow-md"
        aria-label={`${ogData.title} - ${domain}`}
      >
        <div className="flex flex-row bg-card md:flex-col">
          <div className="flex-1 p-4">
            <div className="mb-2 flex items-center gap-2">
              {ogData.logo && <img src={ogData.logo} alt="" className="h-4 w-4 shrink-0" loading="lazy" aria-hidden="true" />}
              <span className="truncate font-medium text-muted-foreground text-xs">{domain}</span>
            </div>
            <h3 className="mb-2 line-clamp-2 font-semibold text-foreground leading-tight">{ogData.title}</h3>
            {ogData.description && <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">{ogData.description}</p>}
            <div className="flex items-center gap-1 text-primary text-xs">
              <span className="truncate">{url}</span>
              <svg
                className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
                viewBox="0 0 12 12"
              >
                <path
                  fill="currentColor"
                  d="M4 3.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-.25a.75.75 0 0 1 1.5 0V8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h.25a.75.75 0 0 1 0 1.5zm2.75 0a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-.69L7.28 5.78a.75.75 0 0 1-1.06-1.06L7.44 3.5z"
                />
              </svg>
            </div>
          </div>
          {ogData.image && (
            <div className="relative aspect-[1200/630] h-38 shrink-0 bg-muted md:w-full">
              <img src={ogData.image} alt={ogData.title || ''} className="h-full w-full object-cover" loading="lazy" />
            </div>
          )}
        </div>
      </a>
    </div>
  );
}

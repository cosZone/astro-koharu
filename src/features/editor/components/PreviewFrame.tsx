import { useEffect, useRef, useState } from 'react';

interface Props {
  source: string;
  mode?: 'body' | 'article';
  example?: boolean;
  ogEndpoint?: string;
}

export default function PreviewFrame({ source, mode = 'body', example = false, ogEndpoint }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const version = useRef(0);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      if (event.data?.type === 'koharu-preview-ready') setReady(true);
      if (event.data?.type === 'koharu-preview-result') {
        setError(event.data.error ?? '');
        if (example && typeof event.data.height === 'number' && frame.current)
          frame.current.style.height = `${Math.min(720, Math.max(120, event.data.height))}px`;
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [example]);

  useEffect(() => {
    if (!ready) return;
    const send = () => {
      // Keep the caller frame: WebKit tail calls can misattribute the postMessage source.
      frame.current?.contentWindow?.postMessage(
        {
          type: 'koharu-preview-source',
          source,
          mode,
          ogEndpoint,
          version: ++version.current,
          dark: document.documentElement.classList.contains('dark'),
        },
        window.location.origin,
      );
    };
    const timer = window.setTimeout(send, example ? 0 : 180);
    const observer = new MutationObserver(send);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [ready, source, mode, example, ogEndpoint]);

  return (
    <div className={`editor-preview-frame ${example ? 'editor-example' : ''}`}>
      {!ready && <output className="editor-preview-loading">正在准备博文预览…</output>}
      {error && <output className="editor-error">{error}</output>}
      <iframe
        ref={frame}
        src="/editor/preview"
        title={example ? '语法效果示例' : '实际博文实时预览'}
        sandbox="allow-scripts allow-same-origin allow-popups"
        loading={example ? 'lazy' : 'eager'}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { DEV_SERVER_URL } from '@/lib/config';

interface Props {
  postId: string;
  onClose: () => void;
  onSaved?: () => void;
}

/** The CMS owns file access; the shared public editor owns source editing and preview. */
export function SourcePostEditor({ postId, onClose, onSaved }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const baseline = useRef<string | null>(null);
  const sessionDraftId = useRef<string | null>(null);
  const saving = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    baseline.current = null;
    sessionDraftId.current = null;
    let cancelled = false;
    let opening = false;
    let detached = false;
    const editorOrigin = new URL(DEV_SERVER_URL).origin;
    const send = (data: object) => {
      // WebKit must keep the caller frame for the editor to validate the message source.
      frame.current?.contentWindow?.postMessage(data, editorOrigin);
    };
    const open = async () => {
      if (opening || detached) return;
      if (baseline.current !== null) {
        send({ type: 'koharu-cms-open', postId, source: baseline.current, restoreDraftId: sessionDraftId.current });
        return;
      }
      opening = true;
      try {
        const response = await fetch(`/api/cms/source?postId=${encodeURIComponent(postId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '无法读取文章');
        if (cancelled) return;
        baseline.current = data.source;
        send({ type: 'koharu-cms-open', postId, source: data.source });
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : '无法读取文章');
      } finally {
        opening = false;
      }
    };
    const receive = async (event: MessageEvent) => {
      if (event.origin !== editorOrigin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'koharu-editor-ready') {
        await open();
        return;
      }
      if (event.data?.type === 'koharu-cms-detach' && event.data.postId === postId) {
        detached = true;
        sessionDraftId.current = null;
        return;
      }
      if (
        !detached &&
        event.data?.type === 'koharu-cms-opened' &&
        event.data.postId === postId &&
        typeof event.data.draftId === 'string'
      ) {
        sessionDraftId.current = event.data.draftId;
        setError('');
        setReady(true);
        return;
      }
      if (
        event.data?.type !== 'koharu-cms-save' ||
        event.data.postId !== postId ||
        typeof event.data.source !== 'string' ||
        baseline.current === null ||
        detached ||
        saving.current
      )
        return;
      saving.current = true;
      try {
        const response = await fetch('/api/cms/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, source: event.data.source, expectedSource: baseline.current }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 409
              ? '这篇文章已被其他工具修改。请先复制或下载当前原文，再重新打开文件进行合并。'
              : data.error || '保存失败，请复制或下载当前原文。',
          );
        if (cancelled) return;
        baseline.current = data.source;
        send({ type: 'koharu-cms-result' });
        onSavedRef.current?.();
      } catch (failure) {
        if (!cancelled) send({ type: 'koharu-cms-result', error: failure instanceof Error ? failure.message : '保存失败' });
      } finally {
        saving.current = false;
      }
    };
    window.addEventListener('message', receive);
    const timeout = window.setTimeout(() => {
      if (baseline.current === null) setError('请同时启动博客开发服务：pnpm dev。编辑器与实际博客预览共用该服务。');
    }, 8000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      window.removeEventListener('message', receive);
    };
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-2 text-sm">
        <button type="button" className="shrink-0" onClick={onClose}>
          ← 返回文章列表
        </button>
        <span className="min-w-0 truncate text-muted-foreground" title={postId}>
          CMS · {postId}
        </span>
      </div>
      {error && (
        <div className="border-b bg-destructive/10 p-4 text-destructive text-sm" role="alert">
          {error}
        </div>
      )}
      {!ready && !error && <output className="p-4 text-muted-foreground text-sm">正在连接写作室…</output>}
      <iframe
        ref={frame}
        src={`${DEV_SERVER_URL}/editor`}
        title="Koharu 写作室"
        allow="clipboard-write"
        className="min-h-0 w-full flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-modals"
      />
    </div>
  );
}

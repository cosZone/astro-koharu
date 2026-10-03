import type { EditorWorkerRenderOptions, EditorWorkerRequest, EditorWorkerResponse, EditorWorkerResult } from './render.worker';

interface RenderJob extends EditorWorkerRequest {
  resolve: (result: EditorWorkerResult) => void;
  reject: (reason: Error | DOMException) => void;
}

export interface EditorRenderer {
  render: (source: string, options?: EditorWorkerRenderOptions) => Promise<EditorWorkerResult>;
  destroy: () => void;
}

/** One running render and one replaceable pending render keep typing ahead of preview work. */
export function createEditorRenderer(): EditorRenderer {
  const worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
  let nextId = 0;
  let active: RenderJob | null = null;
  let pending: RenderJob | null = null;
  let destroyed = false;
  let terminalError: Error | DOMException | null = null;

  function close(error: Error | DOMException) {
    if (destroyed) return;
    destroyed = true;
    terminalError = error;
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    active?.reject(error);
    pending?.reject(error);
    active = null;
    pending = null;
  }

  function start(job: RenderJob) {
    active = job;
    try {
      worker.postMessage({ id: job.id, source: job.source, options: job.options } satisfies EditorWorkerRequest);
    } catch (error) {
      close(error instanceof Error ? error : new Error('预览任务无法发送'));
    }
  }

  worker.onmessage = (event: MessageEvent<EditorWorkerResponse>) => {
    const response = event.data;
    if (destroyed || !active || response.id !== active.id) return;
    if ('error' in response) active.reject(new Error(response.error));
    else active.resolve(response.result);
    active = null;
    if (pending) {
      const next = pending;
      pending = null;
      start(next);
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    close(new Error(event.message || '预览线程暂时无法启动'));
  };
  worker.onmessageerror = () => close(new Error('预览线程返回了无法读取的内容'));

  return {
    render(source, options = {}) {
      if (destroyed) return Promise.reject(terminalError);
      return new Promise<EditorWorkerResult>((resolve, reject) => {
        const job = { id: ++nextId, source, options, resolve, reject };
        if (!active) start(job);
        else {
          pending?.reject(new DOMException('预览任务已被更新的原文替换', 'AbortError'));
          pending = job;
        }
      });
    },
    destroy() {
      close(new DOMException('预览线程已关闭', 'AbortError'));
    },
  };
}

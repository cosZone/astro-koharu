import assert from 'node:assert/strict';
import test from 'node:test';
import { createEditorRenderer } from './browser-worker';
import type { EditorWorkerRequest, EditorWorkerResponse } from './render.worker';

test('worker queue replaces pending work, reports failures and rejects every promise on destruction', async (t) => {
  const workers: FakeWorker[] = [];
  class FakeWorker {
    posts: EditorWorkerRequest[] = [];
    onmessage: ((event: MessageEvent<EditorWorkerResponse>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessageerror: (() => void) | null = null;
    terminated = false;

    constructor(url: URL, options: WorkerOptions) {
      assert.equal(url.pathname.endsWith('/render.worker.ts'), true);
      assert.equal(options.type, 'module');
      workers.push(this);
    }

    postMessage(request: EditorWorkerRequest) {
      this.posts.push(request);
    }

    terminate() {
      this.terminated = true;
    }

    reply(response: EditorWorkerResponse) {
      this.onmessage?.(new MessageEvent('message', { data: response }));
    }

    fail(message: string) {
      this.onerror?.({ preventDefault() {}, message } as ErrorEvent);
    }
  }

  const original = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'Worker', { configurable: true, writable: true, value: FakeWorker });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'Worker', original);
    else Reflect.deleteProperty(globalThis, 'Worker');
  });

  const renderer = createEditorRenderer();
  const worker = workers[0];
  const first = renderer.render('first');
  const replaced = renderer.render('replaced');
  const replacementRejected = assert.rejects(replaced, { name: 'AbortError' });
  const latest = renderer.render('latest', { math: false, password: 'local-only' });
  assert.equal(worker.posts.length, 1);
  await replacementRejected;
  worker.reply({ id: worker.posts[0].id, result: { html: 'first', headings: [] } });
  assert.equal((await first).html, 'first');
  assert.equal(worker.posts.length, 2);
  assert.equal(worker.posts[1].source, 'latest');
  assert.equal(worker.posts[1].options.math, false);
  const renderFailed = assert.rejects(latest, { message: 'render failure' });
  worker.reply({ id: worker.posts[1].id, error: 'render failure' });
  await renderFailed;

  const activeRejected = assert.rejects(renderer.render('active'), { name: 'AbortError' });
  const pendingRejected = assert.rejects(renderer.render('pending'), { name: 'AbortError' });
  renderer.destroy();
  await Promise.all([activeRejected, pendingRejected]);
  assert.equal(worker.terminated, true);
  assert.equal(worker.onmessage, null);
  assert.equal(worker.onerror, null);
  await assert.rejects(renderer.render('after destroy'), { name: 'AbortError' });

  const failedRenderer = createEditorRenderer();
  const startupRejected = assert.rejects(failedRenderer.render('crash'), { message: 'specific worker startup error' });
  workers[1].fail('specific worker startup error');
  await startupRejected;
  await assert.rejects(failedRenderer.render('after crash'), { message: 'specific worker startup error' });
});

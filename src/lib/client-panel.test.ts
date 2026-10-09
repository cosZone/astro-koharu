import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { ClientDirective } from 'astro';
import panelDirective from './client-panel';

class Island extends EventTarget {
  isConnected = true;
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function setup(t: TestContext, load: Parameters<ClientDirective>[0]) {
  const windowTarget = new EventTarget();
  Object.defineProperty(globalThis, 'window', { value: windowTarget, configurable: true });
  t.after(() => Reflect.deleteProperty(globalThis, 'window'));
  const island = new Island();
  const options = { name: 'panel', value: 'bgm' } as Parameters<ClientDirective>[1];
  const start = () => panelDirective(load, options, island as unknown as HTMLElement);
  const open = () => windowTarget.dispatchEvent(new Event('koharu:bgm-open'));
  return { windowTarget, island, start, open };
}

test('closed panels do not load, and repeated open intents hydrate only once', async (t) => {
  let loads = 0;
  let mounts = 0;
  const { start, open } = setup(t, async () => {
    loads += 1;
    return async () => {
      mounts += 1;
    };
  });
  start();
  assert.equal(loads, 0);
  open();
  open();
  await settle();
  open();
  assert.equal(loads, 1);
  assert.equal(mounts, 1);
});

test('ready handshake catches a panel which opened before the directive registered', async (t) => {
  let mounts = 0;
  const { windowTarget, start, open } = setup(t, async () => async () => {
    mounts += 1;
  });
  windowTarget.addEventListener('koharu:bgm-ready', open);
  start();
  await settle();
  assert.equal(mounts, 1);
});

test('unmount cancels a pending hydration and removes the old intent listener', async (t) => {
  let resolve!: (mount: () => Promise<void>) => void;
  let mounts = 0;
  let loads = 0;
  const loading = new Promise<() => Promise<void>>((done) => {
    resolve = done;
  });
  const { start, open, island } = setup(t, () => {
    loads += 1;
    return loading;
  });
  start();
  open();
  island.isConnected = false;
  island.dispatchEvent(new Event('astro:unmount'));
  resolve(async () => {
    mounts += 1;
  });
  await settle();
  open();
  assert.equal(loads, 1);
  assert.equal(mounts, 0);
});

test('a persisted music island finishes its pending load after reconnection', async (t) => {
  let resolve!: (mount: () => Promise<void>) => void;
  let mounts = 0;
  const loading = new Promise<() => Promise<void>>((done) => {
    resolve = done;
  });
  const { start, open, island } = setup(t, () => loading);
  start();
  open();
  island.isConnected = false;
  island.isConnected = true;
  resolve(async () => {
    mounts += 1;
  });
  await settle();
  assert.equal(mounts, 1);
});

test('a failed module load retries on the next intent without an unhandled rejection', async (t) => {
  let loads = 0;
  let mounts = 0;
  const failure = new Error('unavailable');
  const errors: unknown[] = [];
  t.mock.method(console, 'error', (_message: string, error: unknown) => errors.push(error));
  const { start, open } = setup(t, async () => {
    loads += 1;
    if (loads === 1) throw failure;
    return async () => {
      mounts += 1;
    };
  });
  start();
  open();
  await settle();
  assert.deepEqual(errors, [failure]);
  open();
  await settle();
  assert.equal(loads, 2);
  assert.equal(mounts, 1);
});

test('Astro hydration-error followed by a no-op mount leaves the next intent usable', async (t) => {
  let loads = 0;
  let mounts = 0;
  let island: Island;
  const environment = setup(t, async () => {
    loads += 1;
    if (loads === 1) {
      island.dispatchEvent(new Event('astro:hydration-error'));
      return async () => assert.fail('Astro no-op mounts must not count as successful hydration');
    }
    return async () => {
      mounts += 1;
      island.dispatchEvent(new Event('astro:hydrate'));
    };
  });
  island = environment.island;
  environment.start();
  environment.open();
  await settle();
  environment.open();
  await settle();
  environment.open();
  assert.equal(loads, 2);
  assert.equal(mounts, 1);
});

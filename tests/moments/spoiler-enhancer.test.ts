import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { __createSpoilerEnhancer } from '../../src/lib/spoiler-enhancer';

class FakeElement extends EventTarget {
  readonly dataset = {} as DOMStringMap;
  readonly tagName: string;
  isConnected = true;
  labelContainer?: FakeElement;
  shadowRoot: ShadowRoot | null = null;
  clickCount = 0;
  private readonly attributes = new Map<string, string>();

  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  closest<T extends Element = Element>(selector: string): T | null {
    if (selector === '[data-spoiler-reveal-label]') return (this.labelContainer ?? null) as T | null;
    if (this.tagName === 'SPOILER-SPAN' && selector.split(',').some((part) => part.trim() === 'spoiler-span')) {
      return this as unknown as T;
    }
    if (this.hasAttribute('data-static-spoiler') && selector.includes('[data-static-spoiler]')) {
      return this as unknown as T;
    }
    return null;
  }

  click() {
    this.clickCount += 1;
    this.dispatchEvent(new Event('click'));
  }
}

class FakeRoot {
  constructor(readonly spoilers: FakeElement[]) {}

  querySelectorAll<T extends Element = Element>(selector: string): NodeListOf<T> {
    assert.equal(selector, 'spoiler-span, [data-static-spoiler]');
    return this.spoilers as unknown as NodeListOf<T>;
  }
}

class FakeShadowRoot {
  constructor(readonly control: FakeElement) {}

  querySelector<T extends Element = Element>(selector: string): T | null {
    return selector === '[role="button"]' ? (this.control as unknown as T) : null;
  }
}

function asHtmlElement(element: FakeElement): HTMLElement {
  return element as unknown as HTMLElement;
}

function asParentNode(root: FakeRoot): ParentNode {
  return root as unknown as ParentNode;
}

function keyboardEvent(key: string): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: key });
  return event as KeyboardEvent;
}

function frameQueue() {
  const callbacks: FrameRequestCallback[] = [];
  return {
    request(callback: FrameRequestCallback) {
      callbacks.push(callback);
      return callbacks.length;
    },
    flush() {
      let timestamp = 0;
      while (callbacks.length > 0) {
        const callback = callbacks.shift();
        timestamp += 16;
        callback?.(timestamp);
      }
    },
  };
}

function attachLocalizedControl(spoiler: FakeElement, label: string) {
  const container = new FakeElement('div');
  container.dataset.spoilerRevealLabel = label;
  spoiler.labelContainer = container;
  const control = new FakeElement('button');
  control.setAttribute('aria-label', 'Click to reveal spoiler');
  spoiler.shadowRoot = new FakeShadowRoot(control) as unknown as ShadowRoot;
  return control;
}

test('fallback spoilers reveal with Enter and Space while the component is unavailable', () => {
  const spoilers = [new FakeElement('spoiler-span'), new FakeElement('spoiler-span')];
  const enhance = __createSpoilerEnhancer({
    componentIsDefined: () => false,
    loadComponent: () => new Promise(() => undefined),
    queryDocumentSpoilers: () => spoilers.map(asHtmlElement),
    requestFrame: () => 0,
    reportLoadError: () => undefined,
    observeVisibility: (_spoiler, onVisible) => {
      onVisible();
      return () => {};
    },
  });

  enhance(asParentNode(new FakeRoot(spoilers)));

  for (const [spoiler, key] of spoilers.map((spoiler, index) => [spoiler, index === 0 ? 'Enter' : ' '] as const)) {
    assert.equal(spoiler.getAttribute('role'), 'button');
    assert.equal(spoiler.getAttribute('aria-pressed'), 'false');
    const event = keyboardEvent(key);
    spoiler.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(spoiler.dataset.fallbackRevealed, 'true');
    assert.equal(spoiler.getAttribute('role'), null);
  }
});

test('static spoilers keep keyboard reveal without loading or using the animated component', () => {
  for (const componentDefined of [false, true]) {
    const spoiler = new FakeElement('span');
    spoiler.setAttribute('data-static-spoiler', '');
    const enhance = __createSpoilerEnhancer({
      componentIsDefined: () => componentDefined,
      loadComponent: () => assert.fail('static spoilers must not load spoilerjs'),
      queryDocumentSpoilers: () => [],
      requestFrame: () => assert.fail('static spoilers must not schedule animation frames'),
      reportLoadError: (error) => assert.fail(String(error)),
      observeVisibility: () => assert.fail('static spoilers must not be observed'),
    });
    const root = asParentNode(new FakeRoot([spoiler]));

    enhance(root);
    assert.equal(spoiler.getAttribute('role'), 'button');
    spoiler.dispatchEvent(keyboardEvent('Enter'));
    assert.equal(spoiler.dataset.fallbackRevealed, 'true');

    enhance(root);
    assert.equal(spoiler.getAttribute('role'), null);
    assert.equal(spoiler.dataset.fallbackRevealed, 'true');
  }
});

test('upgrades revealed fallback state, localizes the shadow control, and enhances appended spoilers', async () => {
  const frames = frameQueue();
  const first = new FakeElement('spoiler-span');
  const activeSpoilers = [first];
  let componentDefined = false;
  let resolveComponent!: () => void;
  const componentLoaded = new Promise<void>((resolve) => {
    resolveComponent = resolve;
  });
  const enhance = __createSpoilerEnhancer({
    componentIsDefined: () => componentDefined,
    loadComponent: () => componentLoaded,
    queryDocumentSpoilers: () => activeSpoilers.map(asHtmlElement),
    requestFrame: (callback) => frames.request(callback),
    reportLoadError: (error) => assert.fail(`unexpected load failure: ${String(error)}`),
    observeVisibility: (_spoiler, onVisible) => {
      onVisible();
      return () => {};
    },
  });

  enhance(asParentNode(new FakeRoot([first])));
  first.dispatchEvent(keyboardEvent('Enter'));
  assert.equal(first.dataset.fallbackRevealed, 'true');

  const firstControl = attachLocalizedControl(first, '显示隐藏内容');
  componentDefined = true;
  resolveComponent();
  await componentLoaded;
  await Promise.resolve();
  frames.flush();

  assert.equal(first.dataset.fallbackRevealed, undefined);
  assert.equal(firstControl.clickCount, 1);
  assert.equal(firstControl.getAttribute('aria-label'), '显示隐藏内容');

  const appended = new FakeElement('spoiler-span');
  const appendedControl = attachLocalizedControl(appended, '显示隐藏内容');
  activeSpoilers.push(appended);
  enhance(asParentNode(new FakeRoot([appended])));
  frames.flush();

  assert.equal(appended.dataset.definedEnhancementReady, 'true');
  assert.equal(appendedControl.getAttribute('aria-label'), '显示隐藏内容');
  assert.equal(appendedControl.clickCount, 0);
});

function deferredEnhancer(spoilers: FakeElement[], loadComponent: () => Promise<unknown>) {
  const visible = new Map<HTMLElement, () => void>();
  const errors: unknown[] = [];
  const frames = frameQueue();
  const enhance = __createSpoilerEnhancer({
    componentIsDefined: () => false,
    loadComponent,
    queryDocumentSpoilers: () => spoilers.filter((spoiler) => spoiler.isConnected).map(asHtmlElement),
    requestFrame: (callback) => frames.request(callback),
    reportLoadError: (error) => errors.push(error),
    observeVisibility: (spoiler, callback) => {
      visible.set(spoiler, callback);
      return () => visible.delete(spoiler);
    },
  });
  return { enhance, visible, errors, frames };
}

test('offscreen spoilers stay keyboard-accessible and share one load when visible', () => {
  const spoilers = [new FakeElement('spoiler-span'), new FakeElement('spoiler-span')];
  let loads = 0;
  const { enhance, visible } = deferredEnhancer(spoilers, () => {
    loads += 1;
    return new Promise(() => undefined);
  });
  const root = asParentNode(new FakeRoot(spoilers));
  enhance(root);
  enhance(root);
  assert.equal(loads, 0);
  assert.equal(visible.size, 2);
  assert.equal(spoilers[0].getAttribute('tabindex'), '0');
  const callbacks = [...visible.values()];
  callbacks[0]();
  callbacks[1]();
  assert.equal(loads, 1);
  assert.equal(visible.size, 0);
});

test('focus starts loading and an early keyboard reveal survives the deferred upgrade', async () => {
  const spoiler = new FakeElement('spoiler-span');
  let loads = 0;
  let resolve!: () => void;
  const loaded = new Promise<void>((done) => {
    resolve = done;
  });
  const { enhance, visible, frames } = deferredEnhancer([spoiler], () => {
    loads += 1;
    return loaded;
  });
  enhance(asParentNode(new FakeRoot([spoiler])));
  spoiler.dispatchEvent(new Event('focus'));
  spoiler.dispatchEvent(keyboardEvent('Enter'));
  assert.equal(loads, 1);
  assert.equal(visible.size, 0);
  assert.equal(spoiler.dataset.fallbackRevealed, 'true');
  const control = attachLocalizedControl(spoiler, '显示隐藏内容');
  resolve();
  await loaded;
  await Promise.resolve();
  frames.flush();
  assert.equal(spoiler.dataset.fallbackRevealed, undefined);
  assert.equal(control.clickCount, 1);
});

test('navigation cleanup releases visibility and intent listeners on the old page', () => {
  const old = new FakeElement('spoiler-span');
  const fresh = new FakeElement('spoiler-span');
  let loads = 0;
  const { enhance, visible } = deferredEnhancer([old, fresh], () => {
    loads += 1;
    return new Promise(() => undefined);
  });
  enhance(asParentNode(new FakeRoot([old])));
  enhance.cleanup();
  old.isConnected = false;
  old.dispatchEvent(new Event('pointerenter'));
  assert.equal(loads, 0);
  assert.equal(visible.size, 0);
  enhance(asParentNode(new FakeRoot([fresh])));
  visible.get(asHtmlElement(fresh))?.();
  assert.equal(loads, 1);
});

test('disconnected spoilers cannot trigger a load after a motion replacement', () => {
  const spoiler = new FakeElement('spoiler-span');
  const { enhance, visible } = deferredEnhancer([spoiler], () => assert.fail('detached spoilers must not load'));
  enhance(asParentNode(new FakeRoot([spoiler])));
  const callback = visible.get(asHtmlElement(spoiler));
  spoiler.isConnected = false;
  callback?.();
  enhance(asParentNode(new FakeRoot([])));
  assert.equal(visible.size, 0);
});

test('a failed visible load keeps the fallback and retries only on reader intent', async () => {
  const spoiler = new FakeElement('spoiler-span');
  let loads = 0;
  const failure = new Error('unavailable');
  const { enhance, visible, errors } = deferredEnhancer([spoiler], () => {
    loads += 1;
    return loads === 1 ? Promise.reject(failure) : new Promise(() => undefined);
  });
  enhance(asParentNode(new FakeRoot([spoiler])));
  visible.get(asHtmlElement(spoiler))?.();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(errors, [failure]);
  assert.equal(loads, 1);
  assert.equal(visible.size, 0);
  assert.equal(spoiler.getAttribute('role'), 'button');
  spoiler.click();
  assert.equal(loads, 2);
  assert.equal(spoiler.dataset.fallbackRevealed, 'true');
});

test('the real card interaction selector treats a spoiler as interactive instead of navigating', async () => {
  const source = await readFile(new URL('../../src/components/moments/MessageCard.astro', import.meta.url), 'utf8');
  const selector = source.match(/const cardInteractiveSelector =\s*\n?\s*'([^']+)'/)?.[1];
  assert.ok(selector, 'MessageCard must expose its interactive selector');

  const spoiler = new FakeElement('spoiler-span');
  const staticSpoiler = new FakeElement('span');
  staticSpoiler.setAttribute('data-static-spoiler', '');
  staticSpoiler.dataset.fallbackRevealed = 'true';
  let navigationCount = 0;
  for (const target of [spoiler, staticSpoiler]) {
    if (!target.closest(selector)) navigationCount += 1;
  }

  assert.equal(navigationCount, 0);
});

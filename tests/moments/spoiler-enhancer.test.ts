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
    assert.equal(selector, 'spoiler-span');
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

test('the real card interaction selector treats a spoiler as interactive instead of navigating', async () => {
  const source = await readFile(new URL('../../src/components/moments/MessageCard.astro', import.meta.url), 'utf8');
  const selector = source.match(/const cardInteractiveSelector =\s*\n?\s*'([^']+)'/)?.[1];
  assert.ok(selector, 'MessageCard must expose its interactive selector');

  const spoiler = new FakeElement('spoiler-span');
  let navigationCount = 0;
  if (!spoiler.closest(selector)) navigationCount += 1;

  assert.equal(navigationCount, 0);
});

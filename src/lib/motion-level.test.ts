import assert from 'node:assert/strict';
import test from 'node:test';
import { getScrollBehavior, readMotionLevel, subscribeMotionLevel } from './motion-level';

test('motion subscribers share native observers and preserve the chosen level through OS changes', () => {
  assert.equal(readMotionLevel(), 'reduced');
  assert.equal(getScrollBehavior(), 'instant');

  const previous = new Map(
    ['window', 'document', 'MutationObserver'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  const root = { dataset: { motion: 'subtle' } };
  const media = Object.assign(new EventTarget(), { matches: false });
  let queryCount = 0;
  let observerCount = 0;
  let disconnectCount = 0;
  let changed = () => {};
  class Observer {
    constructor(callback: () => void) {
      observerCount++;
      changed = callback;
    }
    observe(target: unknown, options: unknown) {
      assert.equal(target, root);
      assert.deepEqual(options, { attributes: true, attributeFilter: ['data-motion'] });
    }
    disconnect() {
      disconnectCount++;
    }
  }
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: { documentElement: root } },
    window: {
      configurable: true,
      value: {
        matchMedia(query: string) {
          assert.equal(query, '(prefers-reduced-motion: reduce)');
          queryCount++;
          return media;
        },
      },
    },
    MutationObserver: { configurable: true, value: Observer },
  });

  const snapshots: string[][] = [[], []];
  const stops: (() => void)[] = [];
  try {
    stops.push(...snapshots.map((values) => subscribeMotionLevel(() => values.push(readMotionLevel()))));
    assert.equal(readMotionLevel(), 'subtle');
    assert.equal(getScrollBehavior(), 'smooth');
    assert.equal(observerCount, 1);
    assert.equal(queryCount, 1);

    media.matches = true;
    media.dispatchEvent(new Event('change'));
    assert.equal(readMotionLevel(), 'reduced');
    assert.equal(getScrollBehavior(), 'instant');
    assert.equal(root.dataset.motion, 'subtle');
    assert.deepEqual(snapshots, [['reduced'], ['reduced']]);

    root.dataset.motion = 'lively';
    changed();
    assert.equal(readMotionLevel(), 'reduced');
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    assert.equal(readMotionLevel(), 'lively');

    stops.shift()?.();
    assert.equal(disconnectCount, 0);
    const firstCount = snapshots[0].length;
    root.dataset.motion = 'reduced';
    changed();
    assert.equal(snapshots[0].length, firstCount);
    assert.equal(snapshots[1].at(-1), 'reduced');
    stops.shift()?.();
    assert.equal(disconnectCount, 1);
    const finalCount = snapshots[1].length;
    media.dispatchEvent(new Event('change'));
    assert.equal(snapshots[1].length, finalCount);

    stops.push(subscribeMotionLevel(() => {}));
    assert.equal(observerCount, 2);
    assert.equal(queryCount, 1);
  } finally {
    for (const stop of stops) stop();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});

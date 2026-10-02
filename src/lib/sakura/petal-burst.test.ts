import assert from 'node:assert/strict';
import test from 'node:test';
import { holdPetalBurst, setupPetalBurst } from './petal-burst';

class FakeFlight {
  cancelCount = 0;
  pauseCount = 0;
  playCount = 0;
  private reject!: (error: Error) => void;
  finished = new Promise<void>((_resolve, reject) => {
    this.reject = reject;
  });

  cancel() {
    this.cancelCount += 1;
    this.reject(new Error('cancelled'));
  }

  pause() {
    this.pauseCount += 1;
  }

  play() {
    this.playCount += 1;
  }
}

class FakeElement extends EventTarget {
  isConnected = true;
  className = '';
  dataset = { motion: 'lively' };
  children: FakeElement[] = [];
  style = {
    viewTransitionName: '',
    setProperty: () => {},
    removeProperty: (name: string) => {
      if (name === 'view-transition-name') this.style.viewTransitionName = '';
    },
  };

  constructor(readonly flights: FakeFlight[]) {
    super();
  }

  closest(selector: string) {
    return selector.startsWith('a[href]') ? this : null;
  }

  setAttribute() {}

  append(child: FakeElement) {
    this.children.push(child);
  }

  replaceChildren() {
    this.children = [];
  }

  remove() {
    this.isConnected = false;
  }

  animate() {
    const flight = new FakeFlight();
    this.flights.push(flight);
    return flight;
  }
}

test('petal bursts cancel on motion/visibility changes and cannot resume after transition readiness', async () => {
  const previous = new Map(
    ['document', 'window', 'Element', 'MutationObserver'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  const flights: FakeFlight[] = [];
  const root = new FakeElement(flights);
  const documentEvents = new EventTarget();
  const documentMock = Object.assign(documentEvents, {
    documentElement: root,
    hidden: false,
    createElement: () => new FakeElement(flights),
  });
  const media = Object.assign(new EventTarget(), { matches: false });
  let notifyMotion = () => {};
  class FakeMutationObserver {
    constructor(callback: () => void) {
      notifyMotion = callback;
    }
    observe() {}
    disconnect() {}
  }
  Object.defineProperties(globalThis, {
    document: { value: documentMock, configurable: true },
    window: { value: { matchMedia: () => media }, configurable: true },
    Element: { value: FakeElement, configurable: true },
    MutationObserver: { value: FakeMutationObserver, configurable: true },
  });

  const press = () => {
    const event = new Event('pointerdown');
    Object.defineProperties(event, {
      target: { value: new FakeElement(flights) },
      button: { value: 0 },
      isPrimary: { value: true },
      clientX: { value: 20 },
      clientY: { value: 30 },
    });
    documentEvents.dispatchEvent(event);
  };

  try {
    setupPetalBurst();
    press();
    assert.equal(flights.length, 7);
    let ready!: () => void;
    const transitionReady = new Promise<void>((resolve) => {
      ready = resolve;
    });
    holdPetalBurst({ ready: transitionReady } as ViewTransition);
    assert.ok(flights.every((flight) => flight.pauseCount === 1));

    root.dataset.motion = 'reduced';
    notifyMotion();
    ready();
    await transitionReady;
    assert.ok(flights.every((flight) => flight.cancelCount === 1 && flight.playCount === 0));
    assert.equal(root.children[0].children.length, 0);
    assert.equal(root.children[0].style.viewTransitionName, '');
    press();
    assert.equal(flights.length, 7);

    root.dataset.motion = 'lively';
    notifyMotion();
    press();
    assert.equal(flights.length, 14);
    documentMock.hidden = true;
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    assert.ok(flights.every((flight) => flight.cancelCount === 1));
    press();
    assert.equal(flights.length, 14);

    documentMock.hidden = false;
    root.dataset.motion = 'subtle';
    notifyMotion();
    press();
    assert.equal(flights.length, 14);
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});

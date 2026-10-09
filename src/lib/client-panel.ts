import type { ClientDirective } from 'astro';

declare module 'astro' {
  interface AstroClientDirectives {
    'client:panel'?: 'bgm' | 'announcement';
  }
}

/** Load closed global panels on demand; the existing stores own their state. */
const panelDirective: ClientDirective = (load, options, island) => {
  const openEvent = `koharu:${options.value}-open`;
  const readyEvent = `koharu:${options.value}-ready`;
  let disposed = false;
  let started = false;
  let generation = 0;
  const cleanup = () => {
    disposed = true;
    window.removeEventListener(openEvent, start);
    island.removeEventListener('astro:unmount', cleanup);
    island.removeEventListener('astro:hydrate', cleanup);
    island.removeEventListener('astro:hydration-error', failed);
  };
  const failed = () => {
    started = false;
    generation += 1;
  };
  const hydrate = async () => {
    if (started || disposed || !island.isConnected) return;
    started = true;
    const attempt = ++generation;
    try {
      const mount = await load();
      if (!disposed && island.isConnected && attempt === generation) await mount();
    } catch (error) {
      started = false;
      console.error('Panel failed to load:', error);
    }
  };
  function start() {
    void hydrate();
  }

  window.addEventListener(openEvent, start);
  // Persisted music islands survive swaps. Only dispose when Astro actually
  // unmounts this island, so a pending import can finish after navigation.
  island.addEventListener('astro:unmount', cleanup);
  // Astro reports exhausted import retries via an event and returns a no-op
  // mount. Keep the intent listener until hydration has actually succeeded.
  island.addEventListener('astro:hydrate', cleanup);
  island.addEventListener('astro:hydration-error', failed);
  // Directive entrypoints are bundled separately. A DOM handshake avoids
  // bundling a second copy of the Nanostores used by the React components.
  window.dispatchEvent(new Event(readyEvent));
};

export default panelDirective;

/**
 * Lightweight external store for playback time data.
 *
 * Holds `currentTime` and `duration` outside of React state so that
 * high-frequency `timeupdate` events (~4/s) don't trigger component
 * re-renders. Consumers subscribe via `useSyncExternalStore` or
 * imperative `subscribe()` for DOM-level updates.
 */

export function createPlaybackTimeStore() {
  let currentTime = 0;
  let duration = 0;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const l of listeners) l();
  };

  return {
    setCurrentTime(t: number) {
      currentTime = t;
      notify();
    },
    setDuration(d: number) {
      duration = d;
      notify();
    },
    reset() {
      currentTime = 0;
      duration = 0;
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    getProgress: () => (duration > 0 ? (currentTime / duration) * 100 : 0),
  };
}

export type PlaybackTimeStore = ReturnType<typeof createPlaybackTimeStore>;

import { useCallback, useRef } from 'react';

/**
 * A hook that manages a single timer, automatically clearing the previous one
 * when a new timer is set. Compatible with both Node.js and browser environments.
 *
 * change from https://github.com/SukkaW/foxact/blob/master/packages/foxact/src/use-retimer/index.ts
 */
export function useRetimer() {
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return useCallback((timerId?: ReturnType<typeof setTimeout> | null) => {
    if (timerIdRef.current !== undefined) {
      clearTimeout(timerIdRef.current);
    }
    timerIdRef.current = timerId ?? undefined;
  }, []);
}

import { useState } from 'react';

/** Keeps returning the last non-null value after it clears, so a closing modal can still render its exit animation. */
export function useRetainedValue<T>(value: T | null): T | null {
  const [retained, setRetained] = useState(value);
  if (value !== null && value !== retained) setRetained(value);
  return value ?? retained;
}

/**
 * React hook for HTML5 Audio playback.
 *
 * Creates a persistent Audio element internally and delegates
 * all playback logic to the shared useMediaPlayer hook.
 */

import type { MetingSong } from '@lib/meting';
import { useCallback, useEffect, useRef } from 'react';
import { getStoredVolume } from '../store/player';
import { useMediaPlayer } from './useMediaPlayer';

export function useAudioPlayer(tracks: MetingSong[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = getStoredVolume();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const getElement = useCallback(() => audioRef.current, []);

  return useMediaPlayer({
    tracks,
    getUrl: (track) => track.url,
    getElement,
  });
}

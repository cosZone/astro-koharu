/**
 * React hook for HTML5 Video playback.
 *
 * Accepts an external video element ref (must be rendered in JSX)
 * and delegates all playback logic to the shared useMediaPlayer hook.
 */

import { type RefObject, useCallback, useEffect } from 'react';
import type { VideoTrack } from '../components/markdown/video-player/utils';
import { getStoredVolume } from '../store/player';
import { useMediaPlayer } from './useMediaPlayer';

export function useVideoPlayer(tracks: VideoTrack[], videoRef: RefObject<HTMLVideoElement | null>) {
  // Set initial volume on the video element
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref.current is stable, not a reactive dependency
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = getStoredVolume();
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref container is stable, callback intentionally always reads latest .current
  const getElement = useCallback(() => videoRef.current, []);

  return useMediaPlayer({
    tracks,
    getUrl: (track) => track.url,
    getElement,
  });
}

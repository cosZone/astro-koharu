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

function getTrackUrl(track: VideoTrack): string {
  return track.url;
}

export function useVideoPlayer(tracks: VideoTrack[], videoRef: RefObject<HTMLVideoElement | null>) {
  // Set initial volume on the video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = getStoredVolume();
    }
  }, [videoRef]);

  const getElement = useCallback(() => videoRef.current, [videoRef]);

  return useMediaPlayer({
    tracks,
    getUrl: getTrackUrl,
    getElement,
  });
}

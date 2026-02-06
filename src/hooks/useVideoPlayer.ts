/**
 * React hook encapsulating HTML5 Video API for a single VideoPlayer instance.
 *
 * Manages playback state for an externally-rendered <video> element, binds
 * event listeners, and synchronizes state. Integrates with the global
 * $activePlayerId store to ensure only one player (audio or video) is active.
 *
 * Key difference from useAudioPlayer: the video element is rendered in JSX
 * (must be visible), so we accept a ref rather than creating an element internally.
 */

import { useStore } from '@nanostores/react';
import { type RefObject, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { VideoTrack } from '../components/markdown/video-player/utils';
import {
  $activePlayerId,
  getStoredMode,
  getStoredVolume,
  type PlayMode,
  setStoredMode,
  setStoredVolume,
} from '../store/player';

export interface VideoPlayerState {
  playing: boolean;
  currentIndex: number;
  duration: number;
  currentTime: number;
  loading: boolean;
  mode: PlayMode;
  volume: number;
  muted: boolean;
}

export function useVideoPlayer(tracks: VideoTrack[], videoRef: RefObject<HTMLVideoElement | null>) {
  const playerId = useId();
  const activeId = useStore($activePlayerId);

  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const loadAndPlayRef = useRef<(index: number) => void>(() => {});

  const [state, setState] = useState<VideoPlayerState>({
    playing: false,
    currentIndex: 0,
    duration: 0,
    currentTime: 0,
    loading: false,
    mode: getStoredMode(),
    volume: getStoredVolume(),
    muted: false,
  });

  // Set initial volume on the video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = getStoredVolume();
    }
  }, [videoRef]);

  const loadAndPlay = useCallback(
    (index: number) => {
      const video = videoRef.current;
      if (!video || !tracks[index]) return;
      video.src = tracks[index].url;
      video.play().catch(() => {});
      $activePlayerId.set(playerId);
      setState((s) => ({ ...s, currentIndex: index, currentTime: 0, duration: 0, loading: true }));
    },
    [tracks, playerId, videoRef],
  );
  loadAndPlayRef.current = loadAndPlay;

  // Bind video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setState((s) => ({ ...s, currentTime: video.currentTime }));
    const onDurationChange = () => setState((s) => ({ ...s, duration: video.duration || 0 }));
    const onPlaying = () => setState((s) => ({ ...s, playing: true, loading: false }));
    const onPause = () => setState((s) => ({ ...s, playing: false }));
    const onWaiting = () => setState((s) => ({ ...s, loading: true }));
    const onError = () => setState((s) => ({ ...s, playing: false, loading: false }));
    const onEnded = () => {
      const currentTracks = tracksRef.current;
      setState((prev) => {
        if (currentTracks.length === 0) return { ...prev, playing: false };
        let nextIndex: number;
        if (prev.mode === 'loop') {
          nextIndex = prev.currentIndex;
        } else if (prev.mode === 'random') {
          nextIndex = currentTracks.length > 1 ? Math.floor(Math.random() * currentTracks.length) : 0;
        } else {
          nextIndex = prev.currentIndex + 1 >= currentTracks.length ? 0 : prev.currentIndex + 1;
        }
        queueMicrotask(() => loadAndPlayRef.current(nextIndex));
        return prev;
      });
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onEnded);
    };
  }, [videoRef]);

  // Pause when another player starts
  useEffect(() => {
    if (activeId !== null && activeId !== playerId && state.playing) {
      videoRef.current?.pause();
    }
  }, [activeId, playerId, state.playing, videoRef]);

  const play = useCallback(
    (index?: number) => {
      const video = videoRef.current;
      if (!video || tracks.length === 0) return;
      const targetIndex = index ?? state.currentIndex;
      if (index != null || !video.src) {
        loadAndPlay(targetIndex);
      } else {
        video.play().catch(() => {});
        $activePlayerId.set(playerId);
      }
    },
    [state.currentIndex, tracks.length, loadAndPlay, playerId, videoRef],
  );

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    if (state.playing) pause();
    else play();
  }, [state.playing, pause, play]);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    let next: number;
    if (state.mode === 'random') {
      next = tracks.length > 1 ? Math.floor(Math.random() * tracks.length) : 0;
    } else {
      next = (state.currentIndex + 1) % tracks.length;
    }
    loadAndPlay(next);
  }, [tracks.length, state.mode, state.currentIndex, loadAndPlay]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    let prev: number;
    if (state.mode === 'random') {
      prev = tracks.length > 1 ? Math.floor(Math.random() * tracks.length) : 0;
    } else {
      prev = state.currentIndex - 1 < 0 ? tracks.length - 1 : state.currentIndex - 1;
    }
    loadAndPlay(prev);
  }, [tracks.length, state.mode, state.currentIndex, loadAndPlay]);

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (video) {
        video.currentTime = time;
        setState((s) => ({ ...s, currentTime: time }));
      }
    },
    [videoRef],
  );

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      if (videoRef.current) videoRef.current.volume = clamped;
      setStoredVolume(clamped);
      setState((s) => ({ ...s, volume: clamped, muted: clamped === 0 }));
    },
    [videoRef],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !state.muted;
    video.muted = newMuted;
    setState((s) => ({ ...s, muted: newMuted }));
  }, [state.muted, videoRef]);

  const setMode = useCallback((mode: PlayMode) => {
    setStoredMode(mode);
    setState((s) => ({ ...s, mode }));
  }, []);

  return {
    state,
    play,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    setMode,
  };
}

/**
 * React hook encapsulating HTML5 Audio API for a single AudioPlayer instance.
 *
 * Manages a persistent Audio element, binds event listeners, and synchronizes
 * playback state. Integrates with the global $activePlayerId store to ensure
 * only one player is active at a time.
 */

import type { MetingSong } from '@lib/meting';
import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  $activePlayerId,
  getStoredMode,
  getStoredVolume,
  type PlayMode,
  setStoredMode,
  setStoredVolume,
} from '../store/player';

export interface AudioPlayerState {
  playing: boolean;
  currentIndex: number;
  duration: number;
  currentTime: number;
  loading: boolean;
  error: string | null;
  mode: PlayMode;
  volume: number;
  muted: boolean;
}

export function useAudioPlayer(tracks: MetingSong[]) {
  const playerId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeId = useStore($activePlayerId);

  // Refs for latest values — used by stable event listeners to avoid stale closures
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const loadAndPlayRef = useRef<(index: number) => void>(() => {});

  const [state, setState] = useState<AudioPlayerState>({
    playing: false,
    currentIndex: 0,
    duration: 0,
    currentTime: 0,
    loading: false,
    error: null,
    mode: getStoredMode(),
    volume: getStoredVolume(),
    muted: false,
  });

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

  const loadAndPlay = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      if (!audio || !tracks[index]) return;
      audio.src = tracks[index].url;
      audio.play().catch(() => {});
      $activePlayerId.set(playerId);
      setState((s) => ({ ...s, currentIndex: index, currentTime: 0, duration: 0, loading: true, error: null }));
    },
    [tracks, playerId],
  );
  loadAndPlayRef.current = loadAndPlay;

  // Bind audio events (stable — uses refs for callbacks that change)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () => setState((s) => ({ ...s, duration: audio.duration || 0 }));
    const onPlaying = () => setState((s) => ({ ...s, playing: true, loading: false, error: null }));
    const onPause = () => setState((s) => ({ ...s, playing: false }));
    const onWaiting = () => setState((s) => ({ ...s, loading: true }));
    const onError = () => setState((s) => ({ ...s, playing: false, loading: false, error: 'Failed to load audio' }));
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
        // Schedule the actual audio source change after state update
        queueMicrotask(() => loadAndPlayRef.current(nextIndex));
        return prev;
      });
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Pause when another player starts
  useEffect(() => {
    if (activeId !== null && activeId !== playerId && state.playing) {
      audioRef.current?.pause();
    }
  }, [activeId, playerId, state.playing]);

  const play = useCallback(
    (index?: number) => {
      const audio = audioRef.current;
      if (!audio || tracks.length === 0) return;
      const targetIndex = index ?? state.currentIndex;
      if (index != null || !audio.src) {
        loadAndPlay(targetIndex);
      } else {
        audio.play().catch(() => {});
        $activePlayerId.set(playerId);
      }
    },
    [state.currentIndex, tracks.length, loadAndPlay, playerId],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

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

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setState((s) => ({ ...s, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    if (audioRef.current) audioRef.current.volume = clamped;
    setStoredVolume(clamped);
    setState((s) => ({ ...s, volume: clamped, muted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newMuted = !state.muted;
    audio.muted = newMuted;
    setState((s) => ({ ...s, muted: newMuted }));
  }, [state.muted]);

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

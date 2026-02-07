/**
 * Shared media player hook for audio and video players.
 *
 * Encapsulates common playback logic: state management, event binding,
 * play mode cycling, track navigation, volume, and global mutex.
 * Audio/video specifics are abstracted via the `getElement` accessor.
 */

import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPlaybackTimeStore, type PlaybackTimeStore } from '../lib/playback-time-store';
import {
  $activePlayerId,
  getStoredMode,
  getStoredVolume,
  type PlayMode,
  setStoredMode,
  setStoredVolume,
} from '../store/player';

export interface MediaPlayerState {
  playing: boolean;
  currentIndex: number;
  loading: boolean;
  error: string | null;
  mode: PlayMode;
  volume: number;
  muted: boolean;
}

export type { PlaybackTimeStore };

export interface UseMediaPlayerOptions<T> {
  tracks: T[];
  getUrl: (track: T) => string;
  getElement: () => HTMLMediaElement | null;
}

export function useMediaPlayer<T>({ tracks, getUrl, getElement }: UseMediaPlayerOptions<T>) {
  const playerId = useId();
  const activeId = useStore($activePlayerId);

  // Track the media element via callback-ref pattern so that the event-binding
  // effect re-runs when the element becomes available (handles video ref timing).
  const [boundElement, setBoundElement] = useState<HTMLMediaElement | null>(null);

  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const getUrlRef = useRef(getUrl);
  getUrlRef.current = getUrl;
  const getElementRef = useRef(getElement);
  getElementRef.current = getElement;
  const loadAndPlayRef = useRef<(index: number) => void>(() => {});
  const [timeStore] = useState(() => createPlaybackTimeStore());

  const [state, setState] = useState<MediaPlayerState>({
    playing: false,
    currentIndex: 0,
    loading: false,
    error: null,
    mode: getStoredMode(),
    volume: getStoredVolume(),
    muted: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadAndPlay = useCallback(
    (index: number) => {
      const el = getElementRef.current();
      const currentTracks = tracksRef.current;
      if (!el || !currentTracks[index]) return;
      el.src = getUrlRef.current(currentTracks[index]);
      el.play().catch(() => {});
      $activePlayerId.set(playerId);
      timeStore.reset();
      setState((s) => ({ ...s, currentIndex: index, loading: true, error: null }));
    },
    [playerId, timeStore],
  );
  loadAndPlayRef.current = loadAndPlay;

  // Poll for the media element becoming available (handles video ref timing).
  // Once resolved, setBoundElement triggers the event-binding effect below.
  useEffect(() => {
    const el = getElementRef.current();
    if (el) {
      setBoundElement(el);
      return;
    }
    // Element not yet available — poll until it is (e.g. video ref after first render)
    let unmounted = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 100; // 5 seconds at 50ms intervals
    const id = setInterval(() => {
      if (unmounted) {
        clearInterval(id);
        return;
      }
      const resolved = getElementRef.current();
      if (resolved) {
        setBoundElement(resolved);
        clearInterval(id);
      } else if (++attempts >= MAX_ATTEMPTS) {
        clearInterval(id);
      }
    }, 50);
    return () => {
      unmounted = true;
      clearInterval(id);
    };
  }, []);

  // Bind media events — re-runs when boundElement changes from null → element
  useEffect(() => {
    const el = boundElement;
    if (!el) return;

    const onTimeUpdate = () => timeStore.setCurrentTime(el.currentTime);
    const onDurationChange = () => timeStore.setDuration(el.duration || 0);
    const onPlaying = () => setState((s) => ({ ...s, playing: true, loading: false, error: null }));
    const onPause = () => setState((s) => ({ ...s, playing: false }));
    const onWaiting = () => setState((s) => ({ ...s, loading: true }));
    const onError = () => setState((s) => ({ ...s, playing: false, loading: false, error: 'Failed to load media' }));
    const onEnded = () => {
      const currentTracks = tracksRef.current;
      const prev = stateRef.current;
      if (currentTracks.length === 0) {
        setState((s) => ({ ...s, playing: false }));
        return;
      }
      let nextIndex: number;
      if (prev.mode === 'loop') {
        nextIndex = prev.currentIndex;
      } else if (prev.mode === 'random') {
        nextIndex = currentTracks.length > 1 ? Math.floor(Math.random() * currentTracks.length) : 0;
      } else {
        nextIndex = prev.currentIndex + 1 >= currentTracks.length ? 0 : prev.currentIndex + 1;
      }
      loadAndPlayRef.current(nextIndex);
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('error', onError);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('error', onError);
      el.removeEventListener('ended', onEnded);
    };
  }, [boundElement, timeStore]);

  // Pause when another player starts
  useEffect(() => {
    if (activeId !== null && activeId !== playerId && state.playing) {
      getElementRef.current()?.pause();
    }
  }, [activeId, playerId, state.playing]);

  const play = useCallback(
    (index?: number) => {
      const el = getElementRef.current();
      if (!el || tracksRef.current.length === 0) return;
      const targetIndex = index ?? state.currentIndex;
      if (index != null || !el.src) {
        loadAndPlay(targetIndex);
      } else {
        el.play().catch(() => {});
        $activePlayerId.set(playerId);
      }
    },
    [state.currentIndex, loadAndPlay, playerId],
  );

  const pause = useCallback(() => {
    getElementRef.current()?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (state.playing) pause();
    else play();
  }, [state.playing, pause, play]);

  const nextTrack = useCallback(() => {
    const currentTracks = tracksRef.current;
    if (currentTracks.length === 0) return;
    let next: number;
    if (state.mode === 'random') {
      next = currentTracks.length > 1 ? Math.floor(Math.random() * currentTracks.length) : 0;
    } else {
      next = (state.currentIndex + 1) % currentTracks.length;
    }
    loadAndPlay(next);
  }, [state.mode, state.currentIndex, loadAndPlay]);

  const prevTrack = useCallback(() => {
    const currentTracks = tracksRef.current;
    if (currentTracks.length === 0) return;
    let prev: number;
    if (state.mode === 'random') {
      prev = currentTracks.length > 1 ? Math.floor(Math.random() * currentTracks.length) : 0;
    } else {
      prev = state.currentIndex - 1 < 0 ? currentTracks.length - 1 : state.currentIndex - 1;
    }
    loadAndPlay(prev);
  }, [state.mode, state.currentIndex, loadAndPlay]);

  const seek = useCallback(
    (time: number) => {
      const el = getElementRef.current();
      if (el) {
        el.currentTime = time;
        timeStore.setCurrentTime(time);
      }
    },
    [timeStore],
  );

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    const el = getElementRef.current();
    if (el) el.volume = clamped;
    setStoredVolume(clamped);
    setState((s) => ({ ...s, volume: clamped, muted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const el = getElementRef.current();
    if (!el) return;
    const newMuted = !state.muted;
    el.muted = newMuted;
    setState((s) => ({ ...s, muted: newMuted }));
  }, [state.muted]);

  const setMode = useCallback((mode: PlayMode) => {
    setStoredMode(mode);
    setState((s) => ({ ...s, mode }));
  }, []);

  return {
    state,
    timeStore,
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

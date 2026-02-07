/**
 * AudioPlayer — main container component for the custom Meting audio player.
 *
 * Rendered via portal from ContentEnhancer. Resolves music URLs through the
 * Meting API at runtime, builds a grouped playlist, and renders the player UI.
 */

import { useAudioPlayer } from '@hooks/useAudioPlayer';
import type { MetingSong } from '@lib/meting';
import { resolvePlaylist } from '@lib/meting';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlayerPlaylist } from './audio-player/PlayerPlaylist';
import { PlayerPreview } from './audio-player/PlayerPreview';
import { MediaControls } from './shared/MediaControls';

interface AudioGroup {
  title?: string;
  list: string[];
}

interface PlaylistGroup {
  title?: string;
  startIndex: number;
  count: number;
}

interface AudioPlayerProps {
  element: HTMLElement;
}

export function AudioPlayer({ element }: AudioPlayerProps) {
  const dataSrc = element.dataset.src || '[]';
  const apiUrl = element.dataset.api;

  const audioGroups: AudioGroup[] = useMemo(() => {
    try {
      return JSON.parse(dataSrc);
    } catch {
      return [];
    }
  }, [dataSrc]);

  const [tracks, setTracks] = useState<MetingSong[]>([]);
  const [groups, setGroups] = useState<PlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Resolve all URLs via Meting API
  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount is an intentional trigger to re-run the effect
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      setError(null);

      try {
        const allTracks: MetingSong[] = [];
        const resolvedGroups: PlaylistGroup[] = [];

        for (const group of audioGroups) {
          const startIndex = allTracks.length;
          const songs = await resolvePlaylist(group.list, apiUrl);
          allTracks.push(...songs);
          resolvedGroups.push({
            title: group.title,
            startIndex,
            count: songs.length,
          });
        }

        if (!cancelled) {
          setTracks(allTracks);
          setGroups(resolvedGroups);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load playlist');
          setLoading(false);
        }
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [audioGroups, apiUrl, retryCount]);

  const player = useAudioPlayer(tracks);
  const currentTrack = tracks[player.state.currentIndex] ?? null;

  const handleTrackSelect = useCallback(
    (index: number) => {
      player.play(index);
    },
    [player.play],
  );

  if (loading) {
    return (
      <div className="audio-player audio-player-loading">
        <div className="audio-player-spinner" />
        <span>加载播放列表…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audio-player audio-player-error">
        <span>加载失败: {error}</span>
        <button type="button" className="audio-player-btn" onClick={() => setRetryCount((c) => c + 1)}>
          重试
        </button>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="audio-player audio-player-empty">
        <span>暂无曲目</span>
      </div>
    );
  }

  return (
    <div className="audio-player not-prose">
      <PlayerPreview track={currentTrack} playing={player.state.playing} timeStore={player.timeStore} />
      <MediaControls
        playing={player.state.playing}
        loading={player.state.loading}
        mode={player.state.mode}
        volume={player.state.volume}
        muted={player.state.muted}
        timeStore={player.timeStore}
        onTogglePlay={player.togglePlay}
        onPrev={player.prevTrack}
        onNext={player.nextTrack}
        onSeek={player.seek}
        onSetMode={player.setMode}
        onSetVolume={player.setVolume}
        onToggleMute={player.toggleMute}
      />
      <PlayerPlaylist
        tracks={tracks}
        groups={groups}
        currentIndex={player.state.currentIndex}
        timeStore={player.timeStore}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTrackSelect={handleTrackSelect}
        onSeek={player.seek}
      />
    </div>
  );
}

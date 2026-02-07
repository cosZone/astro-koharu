/**
 * PlayerPlaylist — tab groups + song list with play icon, time display,
 * progress background on current track, and click-to-seek.
 *
 * Progress bar and time display are updated outside React's render cycle
 * to avoid re-renders from high-frequency timeupdate events.
 */

import { usePlaybackFormattedTime, usePlaybackProgress } from '@hooks/usePlaybackTime';
import { Icon } from '@iconify/react';
import type { MetingSong } from '@lib/meting';
import type { PlaybackTimeStore } from '@lib/playback-time-store';
import { cn } from '@lib/utils';
import { memo, useRef } from 'react';

export interface PlaylistGroup {
  title?: string;
  startIndex: number;
  count: number;
}

interface PlayerPlaylistProps {
  tracks: MetingSong[];
  groups: PlaylistGroup[];
  currentIndex: number;
  timeStore: PlaybackTimeStore;
  activeTab: number;
  onTabChange: (tab: number) => void;
  onTrackSelect: (index: number) => void;
  onSeek: (time: number) => void;
}

/** Isolated time display — re-renders at most 1/s via useSyncExternalStore. */
function TrackTimeDisplay({ timeStore }: { timeStore: PlaybackTimeStore }) {
  return <>{usePlaybackFormattedTime(timeStore)}</>;
}

export const PlayerPlaylist = memo(function PlayerPlaylist({
  tracks,
  groups,
  currentIndex,
  timeStore,
  activeTab,
  onTabChange,
  onTrackSelect,
  onSeek,
}: PlayerPlaylistProps) {
  const showTabs = groups.length > 1 || (groups.length === 1 && groups[0].title);
  const activeGroup = groups[activeTab] || groups[0];
  const visibleTracks = activeGroup ? tracks.slice(activeGroup.startIndex, activeGroup.startIndex + activeGroup.count) : tracks;

  const progressBgRef = useRef<HTMLDivElement>(null);
  usePlaybackProgress(timeStore, progressBgRef);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, globalIdx: number) => {
    if (globalIdx === currentIndex) {
      // Click on current track → seek by position percentage
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(ratio * timeStore.getDuration());
    } else {
      onTrackSelect(globalIdx);
    }
  };

  return (
    <div className="audio-player-playlist">
      {/* Tab headers */}
      {showTabs && (
        <div className="audio-player-tabs" role="tablist">
          {groups.map((g, i) => (
            <button
              key={g.title || i}
              type="button"
              role="tab"
              aria-selected={i === activeTab}
              className={cn('audio-player-tab', i === activeTab && 'active')}
              onClick={() => onTabChange(i)}
            >
              {g.title || `列表 ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Song list */}
      <div className="audio-player-song-list">
        {visibleTracks.map((track, localIdx) => {
          const globalIdx = (activeGroup?.startIndex ?? 0) + localIdx;
          const isCurrent = globalIdx === currentIndex;

          return (
            <button
              key={`${track.name}-${globalIdx}`}
              type="button"
              className={cn('audio-player-song-item', isCurrent && 'current')}
              onClick={(e) => handleClick(e, globalIdx)}
            >
              {/* Progress background for current track */}
              {isCurrent && <div ref={progressBgRef} className="audio-player-song-progress-bg" style={{ width: '0%' }} />}
              <span className="audio-player-song-index">{isCurrent ? <Icon icon="ri:play-fill" /> : localIdx + 1}</span>
              <span className="audio-player-song-title">{track.name}</span>
              <span className="audio-player-song-artist">
                {isCurrent ? <TrackTimeDisplay timeStore={timeStore} /> : track.artist}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

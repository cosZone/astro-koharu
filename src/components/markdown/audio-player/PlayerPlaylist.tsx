/**
 * PlayerPlaylist — tab groups + song list with play icon, time display,
 * progress background on current track, and click-to-seek.
 */

import { Icon } from '@iconify/react';
import type { MetingSong } from '@lib/meting';
import { cn } from '@lib/utils';
import { motion } from 'motion/react';
import { formatTime } from './utils';

interface PlaylistGroup {
  title?: string;
  startIndex: number;
  count: number;
}

interface PlayerPlaylistProps {
  tracks: MetingSong[];
  groups: PlaylistGroup[];
  currentIndex: number;
  currentTime: number;
  duration: number;
  activeTab: number;
  onTabChange: (tab: number) => void;
  onTrackSelect: (index: number) => void;
  onSeek: (time: number) => void;
}

export function PlayerPlaylist({
  tracks,
  groups,
  currentIndex,
  currentTime,
  duration,
  activeTab,
  onTabChange,
  onTrackSelect,
  onSeek,
}: PlayerPlaylistProps) {
  const showTabs = groups.length > 1 || (groups.length === 1 && groups[0].title);
  const activeGroup = groups[activeTab] || groups[0];
  const visibleTracks = activeGroup ? tracks.slice(activeGroup.startIndex, activeGroup.startIndex + activeGroup.count) : tracks;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, globalIdx: number) => {
    if (globalIdx === currentIndex) {
      // Click on current track → seek by position percentage
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
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
              {isCurrent && (
                <motion.div
                  className="audio-player-song-progress-bg"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25, ease: 'linear' }}
                />
              )}
              <span className="audio-player-song-index">{isCurrent ? <Icon icon="ri:play-fill" /> : localIdx + 1}</span>
              <span className="audio-player-song-title">{track.name}</span>
              <span className="audio-player-song-artist">
                {isCurrent ? `${formatTime(currentTime)} / ${formatTime(duration)}` : track.artist}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

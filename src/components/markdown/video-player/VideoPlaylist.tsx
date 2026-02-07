/**
 * VideoPlaylist — song list with play icon, time display,
 * progress background on current track, and click-to-seek.
 *
 * Reuses audio-player CSS classes for consistent styling.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { motion } from 'motion/react';
import { formatTime, type VideoTrack } from './utils';

interface VideoPlaylistProps {
  tracks: VideoTrack[];
  currentIndex: number;
  currentTime: number;
  duration: number;
  onTrackSelect: (index: number) => void;
  onSeek: (time: number) => void;
}

export function VideoPlaylist({ tracks, currentIndex, currentTime, duration, onTrackSelect, onSeek }: VideoPlaylistProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (index === currentIndex) {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    } else {
      onTrackSelect(index);
    }
  };

  return (
    <div className="audio-player-playlist">
      <div className="audio-player-song-list">
        {tracks.map((track, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={`${track.url}-${index}`}
              type="button"
              className={cn('audio-player-song-item', isCurrent && 'current')}
              onClick={(e) => handleClick(e, index)}
            >
              {isCurrent && (
                <motion.div
                  className="audio-player-song-progress-bg"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25, ease: 'linear' }}
                />
              )}
              <span className="audio-player-song-index">{isCurrent ? <Icon icon="ri:play-fill" /> : index + 1}</span>
              <span className="audio-player-song-title">{track.name}</span>
              <span className="audio-player-song-artist">
                {isCurrent ? `${formatTime(currentTime)} / ${formatTime(duration)}` : (track.author ?? '')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

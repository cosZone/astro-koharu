/**
 * VideoControls — playback mode, prev/play/next, volume, fullscreen, thin progress line.
 *
 * Reuses audio-player CSS classes for consistent styling.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import type { RefObject } from 'react';
import type { PlayMode } from '@/store/player';

interface VideoControlsProps {
  playing: boolean;
  loading: boolean;
  mode: PlayMode;
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  showTrackButtons: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onSetMode: (mode: PlayMode) => void;
  onSetVolume: (volume: number) => void;
  onToggleMute: () => void;
}

const MODE_ICONS: Record<PlayMode, string> = {
  order: 'ri:order-play-line',
  random: 'ri:shuffle-line',
  loop: 'ri:repeat-one-line',
};

const MODE_LABELS: Record<PlayMode, string> = {
  order: '顺序播放',
  random: '随机播放',
  loop: '单曲循环',
};

const MODE_CYCLE: PlayMode[] = ['order', 'random', 'loop'];

function getVolumeIcon(volume: number, muted: boolean): string {
  if (muted || volume === 0) return 'ri:volume-mute-line';
  if (volume < 0.5) return 'ri:volume-down-line';
  return 'ri:volume-up-line';
}

export function VideoControls({
  playing,
  loading,
  mode,
  volume,
  muted,
  currentTime,
  duration,
  showTrackButtons,
  videoRef,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onSetMode,
  onSetVolume,
  onToggleMute,
}: VideoControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const cycleMode = () => {
    const idx = MODE_CYCLE.indexOf(mode);
    onSetMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSetVolume(Number.parseFloat(e.target.value));
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      video.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className="audio-player-controls">
      <div className="audio-player-buttons">
        {showTrackButtons && (
          <button type="button" className="audio-player-btn" onClick={cycleMode} title={MODE_LABELS[mode]}>
            <Icon icon={MODE_ICONS[mode]} />
          </button>
        )}
        {showTrackButtons && (
          <button type="button" className="audio-player-btn" onClick={onPrev} title="上一个">
            <Icon icon="ri:skip-back-line" />
          </button>
        )}
        <button
          type="button"
          className={cn('audio-player-btn audio-player-btn-play', loading && 'loading')}
          onClick={onTogglePlay}
          title={playing ? '暂停' : '播放'}
        >
          {loading ? (
            <Icon icon="ri:loader-4-line" className="animate-spin" />
          ) : playing ? (
            <Icon icon="ri:pause-large-line" />
          ) : (
            <Icon icon="ri:play-large-fill" />
          )}
        </button>
        {showTrackButtons && (
          <button type="button" className="audio-player-btn" onClick={onNext} title="下一个">
            <Icon icon="ri:skip-forward-line" />
          </button>
        )}

        <button type="button" className="audio-player-btn" onClick={handleFullscreen} title="全屏">
          <Icon icon="ri:fullscreen-line" />
        </button>

        <div className="audio-player-volume-group">
          <button type="button" className="audio-player-btn" onClick={onToggleMute} title="静音">
            <Icon icon={getVolumeIcon(volume, muted)} />
          </button>
          <input
            type="range"
            className="audio-player-volume"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            title={`音量 ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>

      <div
        className="audio-player-progress"
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        aria-label="播放进度"
        onClick={handleProgressClick}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
          else if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
        }}
      >
        <div className="audio-player-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

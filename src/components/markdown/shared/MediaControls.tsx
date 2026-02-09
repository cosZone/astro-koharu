/**
 * Shared media controls for audio and video players.
 *
 * Renders playback mode, prev/play/next, volume, and progress bar.
 * Accepts optional extra buttons (e.g. fullscreen) and conditional track buttons.
 *
 * Progress bar width is updated imperatively via ref (zero re-renders from timeupdate).
 */

import { usePlaybackProgress } from '@hooks/usePlaybackTime';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import type { PlaybackTimeStore } from '@lib/playback-time-store';
import { cn } from '@lib/utils';
import { memo, useRef } from 'react';
import type { PlayMode } from '@/store/player';

export interface MediaControlsProps {
  playing: boolean;
  loading: boolean;
  mode: PlayMode;
  volume: number;
  muted: boolean;
  timeStore: PlaybackTimeStore;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onSetMode: (mode: PlayMode) => void;
  onSetVolume: (volume: number) => void;
  onToggleMute: () => void;
  showModeButton?: boolean;
  showTrackButtons?: boolean;
  extraButtons?: React.ReactNode;
}

const MODE_ICONS: Record<PlayMode, string> = {
  order: 'ri:order-play-line',
  random: 'ri:shuffle-line',
  loop: 'ri:repeat-one-line',
};

const MODE_LABEL_KEYS: Record<PlayMode, 'media.playModeOrder' | 'media.playModeRandom' | 'media.playModeLoop'> = {
  order: 'media.playModeOrder',
  random: 'media.playModeRandom',
  loop: 'media.playModeLoop',
};

const MODE_CYCLE: PlayMode[] = ['order', 'random', 'loop'];

function getVolumeIcon(volume: number, muted: boolean): string {
  if (muted || volume === 0) return 'ri:volume-mute-line';
  if (volume < 0.5) return 'ri:volume-down-line';
  return 'ri:volume-up-line';
}

export const MediaControls = memo(function MediaControls({
  playing,
  loading,
  mode,
  volume,
  muted,
  timeStore,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onSetMode,
  onSetVolume,
  onToggleMute,
  showModeButton = true,
  showTrackButtons = true,
  extraButtons,
}: MediaControlsProps) {
  const { t } = useTranslation();
  const progressBarRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  usePlaybackProgress(timeStore, progressBarRef, sliderRef);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * timeStore.getDuration());
  };

  const cycleMode = () => {
    const idx = MODE_CYCLE.indexOf(mode);
    onSetMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSetVolume(Number.parseFloat(e.target.value));
  };

  return (
    <div className="audio-player-controls">
      <div className="audio-player-buttons">
        {showModeButton && (
          <button type="button" className="audio-player-btn" onClick={cycleMode} title={t(MODE_LABEL_KEYS[mode])}>
            <Icon icon={MODE_ICONS[mode]} />
          </button>
        )}
        {showTrackButtons && (
          <button type="button" className="audio-player-btn" onClick={onPrev} title={t('media.prevTrack')}>
            <Icon icon="ri:skip-back-line" />
          </button>
        )}
        <button
          type="button"
          className={cn('audio-player-btn audio-player-btn-play', loading && 'loading')}
          onClick={onTogglePlay}
          title={playing ? t('media.pause') : t('media.play')}
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
          <button type="button" className="audio-player-btn" onClick={onNext} title={t('media.nextTrack')}>
            <Icon icon="ri:skip-forward-line" />
          </button>
        )}

        {extraButtons}

        <div className="audio-player-volume-group">
          <button type="button" className="audio-player-btn" onClick={onToggleMute} title={t('media.mute')}>
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
            title={t('media.volume', { percent: String(Math.round(volume * 100)) })}
          />
        </div>
      </div>

      <div
        ref={sliderRef}
        className="audio-player-progress"
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={Math.floor(timeStore.getDuration())}
        aria-valuenow={Math.floor(timeStore.getCurrentTime())}
        aria-label={t('media.progress')}
        onClick={handleProgressClick}
        onKeyDown={(e) => {
          const ct = timeStore.getCurrentTime();
          const dur = timeStore.getDuration();
          if (e.key === 'ArrowRight') onSeek(Math.min(dur, ct + 5));
          else if (e.key === 'ArrowLeft') onSeek(Math.max(0, ct - 5));
        }}
      >
        <div ref={progressBarRef} className="audio-player-progress-bar" style={{ width: '0%' }} />
      </div>
    </div>
  );
});

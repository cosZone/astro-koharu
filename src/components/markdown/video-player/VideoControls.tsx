/**
 * VideoControls — video player controls wrapper.
 * Delegates to shared MediaControls with fullscreen button.
 */

import { Icon } from '@iconify/react';
import type { PlaybackTimeStore } from '@lib/playback-time-store';
import type { RefObject } from 'react';
import type { PlayMode } from '@/store/player';
import { MediaControls } from '../shared/MediaControls';

interface VideoControlsProps {
  playing: boolean;
  loading: boolean;
  mode: PlayMode;
  volume: number;
  muted: boolean;
  timeStore: PlaybackTimeStore;
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

export function VideoControls({ showTrackButtons, videoRef, ...controlProps }: VideoControlsProps) {
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
    <MediaControls
      {...controlProps}
      showModeButton={showTrackButtons}
      showTrackButtons={showTrackButtons}
      extraButtons={
        <button type="button" className="audio-player-btn" onClick={handleFullscreen} title="全屏">
          <Icon icon="ri:fullscreen-line" />
        </button>
      }
    />
  );
}

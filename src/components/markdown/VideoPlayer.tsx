/**
 * VideoPlayer — main container component for the custom video player.
 *
 * Rendered via portal from ContentEnhancer. Parses video track data from
 * the element's dataset, renders a video screen with custom controls and
 * an optional playlist (shown only for multiple videos).
 */

import { useVideoPlayer } from '@hooks/useVideoPlayer';
import { useCallback, useMemo, useRef } from 'react';
import type { VideoTrack } from './video-player/utils';
import { VideoControls } from './video-player/VideoControls';
import { VideoPlaylist } from './video-player/VideoPlaylist';

interface VideoPlayerProps {
  element: HTMLElement;
}

export function VideoPlayer({ element }: VideoPlayerProps) {
  const dataSrc = element.dataset.src || '[]';
  const videoRef = useRef<HTMLVideoElement>(null);

  const tracks: VideoTrack[] = useMemo(() => {
    try {
      return JSON.parse(dataSrc);
    } catch {
      return [];
    }
  }, [dataSrc]);

  const player = useVideoPlayer(tracks, videoRef);
  const currentTrack = tracks[player.state.currentIndex] ?? null;
  const hasMultiple = tracks.length > 1;

  const handleTrackSelect = useCallback(
    (index: number) => {
      player.play(index);
    },
    [player.play],
  );

  const handleVideoClick = useCallback(() => {
    player.togglePlay();
  }, [player.togglePlay]);

  if (tracks.length === 0) return null;

  return (
    <div className="video-player not-prose">
      <div className="video-player-screen">
        {/* biome-ignore lint/a11y/useMediaCaption: user-provided content without caption tracks */}
        <video ref={videoRef} preload="metadata" playsInline onClick={handleVideoClick} />
        {currentTrack?.author && <span className="video-player-source">{currentTrack.author}</span>}
      </div>
      <VideoControls
        playing={player.state.playing}
        loading={player.state.loading}
        mode={player.state.mode}
        volume={player.state.volume}
        muted={player.state.muted}
        timeStore={player.timeStore}
        showTrackButtons={hasMultiple}
        videoRef={videoRef}
        onTogglePlay={player.togglePlay}
        onPrev={player.prevTrack}
        onNext={player.nextTrack}
        onSeek={player.seek}
        onSetMode={player.setMode}
        onSetVolume={player.setVolume}
        onToggleMute={player.toggleMute}
      />
      {hasMultiple && (
        <VideoPlaylist
          tracks={tracks}
          currentIndex={player.state.currentIndex}
          timeStore={player.timeStore}
          onTrackSelect={handleTrackSelect}
          onSeek={player.seek}
        />
      )}
    </div>
  );
}

/**
 * PlayerPreview — vinyl disc with tonearm (left) + song info + centered lyrics (right).
 */

import { usePlaybackLrcIndex } from '@hooks/usePlaybackTime';
import type { MetingSong } from '@lib/meting';
import type { PlaybackTimeStore } from '@lib/playback-time-store';
import { cn } from '@lib/utils';
import { memo, useEffect, useMemo, useState } from 'react';
import { parseLrc } from './LrcParser';

interface PlayerPreviewProps {
  track: MetingSong | null;
  playing: boolean;
  timeStore: PlaybackTimeStore;
  /** Line height in px — must match CSS `.audio-player-lrc p` height. @default 32 */
  lrcLineHeight?: number;
  /** Container height in px — must match CSS `.audio-player-lrc` height. @default 128 */
  lrcContainerHeight?: number;
}

/** Default line height and container height (match CSS values) */
const DEFAULT_LRC_LINE_HEIGHT = 32;
const DEFAULT_LRC_CONTAINER_HEIGHT = 128;

/** Resolve LRC: if it's a URL, fetch it; otherwise use as-is. */
function useLrcText(lrcSource: string | undefined): string {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!lrcSource) {
      setText('');
      return;
    }

    if (lrcSource.startsWith('http')) {
      let cancelled = false;
      fetch(lrcSource)
        .then((r) => r.text())
        .then((t) => {
          if (!cancelled) setText(t);
        })
        .catch(() => {
          if (!cancelled) setText('');
        });
      return () => {
        cancelled = true;
      };
    }

    setText(lrcSource);
  }, [lrcSource]);

  return text;
}

export const PlayerPreview = memo(function PlayerPreview({
  track,
  playing,
  timeStore,
  lrcLineHeight = DEFAULT_LRC_LINE_HEIGHT,
  lrcContainerHeight = DEFAULT_LRC_CONTAINER_HEIGHT,
}: PlayerPreviewProps) {
  const lrcText = useLrcText(track?.lrc);
  const lrcLines = useMemo(() => parseLrc(lrcText), [lrcText]);
  const currentLrcIndex = usePlaybackLrcIndex(timeStore, lrcLines);

  const lrcCenterOffset = (lrcContainerHeight - lrcLineHeight) / 2;

  return (
    <div className="audio-player-preview">
      {/* Disc wrapper: vinyl disc + tonearm */}
      <div className="audio-player-disc-wrapper">
        <div className={cn('audio-player-disc', playing && 'spinning')}>
          {track?.pic ? (
            <img src={track.pic} alt={track.name || ''} className="audio-player-cover" draggable={false} />
          ) : (
            <div className="audio-player-cover audio-player-cover-placeholder" />
          )}
        </div>
        <div className={cn('audio-player-needle', playing && 'playing')}>
          <div className="audio-player-needle-arm">
            <div className="audio-player-needle-head" />
          </div>
        </div>
      </div>

      {/* Song info + lyrics */}
      <div className="audio-player-info">
        <div className="audio-player-song-name" title={track?.name}>
          {track?.name || 'No track'}
        </div>
        <div className="audio-player-artist" title={track?.artist}>
          {track?.artist || ''}
        </div>

        {/* Lyrics area — current line centered vertically */}
        {lrcLines.length > 0 && (
          <div className="audio-player-lrc">
            <div
              className="audio-player-lrc-inner"
              style={{
                transform: `translateY(${lrcCenterOffset - Math.max(0, currentLrcIndex) * lrcLineHeight}px)`,
              }}
            >
              {lrcLines.map((line, i) => (
                <p key={`${line.time}-${i}`} className={cn(i === currentLrcIndex && 'current')}>
                  {line.text || '\u00A0'}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

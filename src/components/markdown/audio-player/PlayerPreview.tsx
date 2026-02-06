/**
 * PlayerPreview — vinyl disc with tonearm (left) + song info + centered lyrics (right).
 */

import type { MetingSong } from '@lib/meting';
import { cn } from '@lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { type LrcLine, parseLrc } from './LrcParser';

interface PlayerPreviewProps {
  track: MetingSong | null;
  playing: boolean;
  currentTime: number;
}

/** Line height and container height must match CSS values */
const LRC_LINE_HEIGHT = 32;
const LRC_CONTAINER_HEIGHT = 128;
/** Offset to vertically center the current line within the container */
const LRC_CENTER_OFFSET = (LRC_CONTAINER_HEIGHT - LRC_LINE_HEIGHT) / 2; // 48

function findCurrentLrcIndex(lines: LrcLine[], time: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].time <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

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

export function PlayerPreview({ track, playing, currentTime }: PlayerPreviewProps) {
  const lrcText = useLrcText(track?.lrc);
  const lrcLines = useMemo(() => parseLrc(lrcText), [lrcText]);
  const currentLrcIndex = findCurrentLrcIndex(lrcLines, currentTime);

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
                transform: `translateY(${LRC_CENTER_OFFSET - Math.max(0, currentLrcIndex) * LRC_LINE_HEIGHT}px)`,
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
}

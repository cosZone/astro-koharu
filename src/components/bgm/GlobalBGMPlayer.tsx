/**
 * GlobalBGMPlayer — floating background music player panel.
 *
 * Audio element lives at the component top level (outside AnimatePresence)
 * so that music continues playing when the panel UI is closed.
 * The panel is rendered via AnimatePresence for smooth enter/exit transitions.
 *
 * Playlist resolution is lazy — only triggered on first panel open.
 */

import { PlayerPlaylist, type PlaylistGroup } from '@components/markdown/audio-player/PlayerPlaylist';
import { PlayerPreview } from '@components/markdown/audio-player/PlayerPreview';
import { MediaControls } from '@components/markdown/shared/MediaControls';
import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { useAudioPlayer } from '@hooks/useAudioPlayer';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { Icon } from '@iconify/react';
import type { BgmAudioGroup } from '@lib/config/types';
import type { MetingSong } from '@lib/meting';
import { resolvePlaylist } from '@lib/meting';
import { useStore } from '@nanostores/react';
import { $isAnyModalOpen, $isDrawerOpen } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { $bgmPanelOpen, closeBgmPanel } from '@/store/bgm';

interface GlobalBGMPlayerProps {
  audioGroups: BgmAudioGroup[];
}

export default function GlobalBGMPlayer({ audioGroups }: GlobalBGMPlayerProps) {
  const panelOpen = useStore($bgmPanelOpen);
  const isDrawerOpen = useStore($isDrawerOpen);
  const isAnyModalOpen = useStore($isAnyModalOpen);
  const isMobilePlayer = useMediaQuery('(max-width: 600px)');

  const [tracks, setTracks] = useState<MetingSong[]>([]);
  const [groups, setGroups] = useState<PlaylistGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  // Track which retryKey has been resolved to avoid duplicate fetches.
  // Starts at -1 so the first open (retryKey=0) always triggers a load.
  const resolvedRetryRef = useRef(-1);

  useEffect(() => {
    if (!panelOpen || resolvedRetryRef.current === retryKey) return;
    resolvedRetryRef.current = retryKey;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function resolve() {
      try {
        const results = await Promise.all(audioGroups.map((group) => resolvePlaylist(group.list)));

        if (!cancelled) {
          const allTracks: MetingSong[] = [];
          const resolvedGroups: PlaylistGroup[] = [];
          for (let i = 0; i < results.length; i++) {
            const startIndex = allTracks.length;
            allTracks.push(...results[i]);
            resolvedGroups.push({ title: audioGroups[i].title, startIndex, count: results[i].length });
          }
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
  }, [panelOpen, audioGroups, retryKey]);

  // Audio hook at top level — Audio element persists across panel open/close
  const player = useAudioPlayer(tracks);
  const currentTrack = tracks[player.state.currentIndex] ?? null;

  // Hide panel when drawer is open
  const isHidden = isDrawerOpen || isAnyModalOpen;

  // floating-ui: dismiss on ESC / outside click
  const { refs, context } = useFloating({
    open: panelOpen && !isHidden,
    onOpenChange: (open) => {
      if (!open) closeBgmPanel();
    },
  });
  const dismiss = useDismiss(context, {
    outsidePressEvent: 'mousedown',
    // Exclude the BGM toggle button in FloatingGroup to prevent toggle/dismiss race
    outsidePress: (event) => {
      const target = event.target as HTMLElement;
      return !target.closest('[aria-label="背景音乐"]');
    },
  });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const renderPanelContent = () => {
    if (loading) {
      return (
        <output className="audio-player audio-player-loading bgm-panel-player">
          <div className="audio-player-spinner" />
          <span>加载播放列表…</span>
        </output>
      );
    }

    if (error) {
      return (
        <div className="audio-player audio-player-error bgm-panel-player" role="alert">
          <span>加载失败: {error}</span>
          <button type="button" className="audio-player-btn" onClick={() => setRetryKey((k) => k + 1)}>
            重试
          </button>
        </div>
      );
    }

    if (tracks.length === 0) {
      return (
        <div className="audio-player audio-player-empty bgm-panel-player">
          <span>暂无曲目</span>
        </div>
      );
    }

    return (
      <div className="audio-player not-prose bgm-panel-player">
        <PlayerPreview
          track={currentTrack}
          playing={player.state.playing}
          timeStore={player.timeStore}
          lrcLineHeight={28}
          lrcContainerHeight={isMobilePlayer ? 168 : 140}
        />
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
          onTrackSelect={player.play}
          onSeek={player.seek}
        />
      </div>
    );
  };

  return (
    <FloatingPortal>
      <AnimatePresence>
        {panelOpen && !isHidden && (
          <FloatingFocusManager context={context} modal={false}>
            <motion.div
              ref={refs.setFloating}
              {...getFloatingProps()}
              className="fixed right-16 bottom-20 z-40 w-[460px] max-w-[calc(100vw-5rem)]"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="bgm-panel max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl sm:max-h-[70vh] sm:overflow-hidden">
                {/* Close button */}
                <button
                  type="button"
                  className="absolute top-2 right-2 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
                  onClick={closeBgmPanel}
                  aria-label="关闭面板"
                >
                  <Icon icon="ri:close-line" className="h-4 w-4" />
                </button>
                {renderPanelContent()}
              </div>
            </motion.div>
          </FloatingFocusManager>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}

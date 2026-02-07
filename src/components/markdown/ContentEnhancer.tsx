/**
 * ContentEnhancer - Portal-based React orchestrator for markdown content toolbars.
 *
 * Replaces vanilla DOM enhancers with a single React component that scans the DOM
 * and renders toolbars via createPortal. Scanning logic lives in content-scanner.ts.
 *
 * Strategy: One React root → many portals (avoids creating separate React roots per block).
 */

import { setupCollapseAnimations } from '@lib/collapse-animation';
import {
  scanAudioPlayers,
  scanEncryptedBlocks,
  scanFriendLinks,
  scanNoteBlocks,
  scanPreElements,
  scanQuizElements,
  scanVideoPlayers,
  type ToolbarEntry,
} from '@lib/content-scanner';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioPlayer } from './AudioPlayer';
import { CodeBlockToolbar } from './CodeBlockToolbar';
import { EncryptedBlock } from './EncryptedBlock';
import { FriendLinksGrid } from './FriendLinksGrid';
import { InfographicToolbar } from './InfographicToolbar';
import { MermaidToolbar } from './MermaidToolbar';
import { extractNoteType, NoteBlockIcon } from './NoteBlockIcon';
import { QuizBlock } from './QuizBlock';
import { VideoPlayer } from './VideoPlayer';

interface ContentEnhancerProps {
  enableCopy?: boolean;
  enableFullscreen?: boolean;
  enableQuiz?: boolean;
  enableEncryptedBlock?: boolean;
}

export default function ContentEnhancer({
  enableCopy = true,
  enableFullscreen = true,
  enableQuiz = true,
  enableEncryptedBlock = false,
}: ContentEnhancerProps) {
  const [entries, setEntries] = useState<ToolbarEntry[]>([]);

  useEffect(() => {
    function scan() {
      const container = document.querySelector('.custom-content');
      if (!container) return;

      const newEntries: ToolbarEntry[] = [
        ...scanPreElements(container),
        ...(enableQuiz ? scanQuizElements(container) : []),
        ...scanFriendLinks(container),
        ...scanAudioPlayers(container),
        ...scanVideoPlayers(container),
        ...scanNoteBlocks(container),
        ...(enableEncryptedBlock ? scanEncryptedBlocks(container) : []),
      ];

      setupCollapseAnimations(container);

      if (newEntries.length > 0) {
        setEntries((prev) => [...prev, ...newEntries]);
      }
    }

    scan();

    // Re-scan on Astro page transitions (skip first fire which overlaps with initial scan)
    let skipFirst = true;
    const handlePageLoad = () => {
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      requestAnimationFrame(() => {
        setEntries([]);
        scan();
      });
    };

    document.addEventListener('astro:page-load', handlePageLoad);
    return () => document.removeEventListener('astro:page-load', handlePageLoad);
  }, [enableQuiz, enableEncryptedBlock]);

  return (
    <>
      {entries.map((entry) => {
        switch (entry.type) {
          case 'code':
            return createPortal(
              <CodeBlockToolbar
                key={entry.id}
                preElement={entry.preElement}
                enableCopy={enableCopy}
                enableFullscreen={enableFullscreen}
              />,
              entry.mountPoint,
            );
          case 'mermaid':
            return createPortal(<MermaidToolbar key={entry.id} preElement={entry.preElement} />, entry.mountPoint);
          case 'infographic':
            return createPortal(<InfographicToolbar key={entry.id} preElement={entry.preElement} />, entry.mountPoint);
          case 'quiz':
            return createPortal(<QuizBlock key={entry.id} element={entry.preElement} />, entry.mountPoint);
          case 'friend-links':
            return createPortal(<FriendLinksGrid key={entry.id} gridElement={entry.preElement} />, entry.mountPoint);
          case 'audio':
            return createPortal(<AudioPlayer key={entry.id} element={entry.preElement} />, entry.mountPoint);
          case 'video':
            return createPortal(<VideoPlayer key={entry.id} element={entry.preElement} />, entry.mountPoint);
          case 'note':
            return createPortal(
              <NoteBlockIcon key={entry.id} noteType={extractNoteType(entry.preElement)} />,
              entry.mountPoint,
            );
          case 'encrypted':
            return createPortal(<EncryptedBlock key={entry.id} element={entry.preElement} />, entry.mountPoint);
          default:
            return null;
        }
      })}
    </>
  );
}

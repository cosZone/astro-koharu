/**
 * ContentEnhancer - Portal-based React orchestrator for markdown content toolbars.
 *
 * Replaces vanilla DOM enhancers (code-block-enhancer, mermaid-enhancer, infographic-enhancer)
 * with a single React component that scans the DOM and renders toolbars via createPortal.
 *
 * Strategy: One React root → many portals (avoids creating separate React roots per block).
 * Pattern: Follows EmbedHydrator.tsx approach.
 */

import { setupCollapseAnimations } from '@lib/collapse-animation';
import { extractLanguage, isInfographicBlock, wrapElement } from '@lib/content-enhancer-utils';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioPlayer } from './AudioPlayer';
import { CodeBlockToolbar } from './CodeBlockToolbar';
import { FriendLinksGrid } from './FriendLinksGrid';
import { InfographicToolbar } from './InfographicToolbar';
import { MermaidToolbar } from './MermaidToolbar';
import { extractNoteType, NoteBlockIcon } from './NoteBlockIcon';
import { QuizBlock } from './QuizBlock';
import { VideoPlayer } from './VideoPlayer';

interface ToolbarEntry {
  id: string;
  type: 'code' | 'mermaid' | 'infographic' | 'quiz' | 'friend-links' | 'audio' | 'video' | 'note';
  mountPoint: HTMLElement;
  preElement: HTMLElement;
}

interface ContentEnhancerProps {
  enableCopy?: boolean;
  enableFullscreen?: boolean;
  enableQuiz?: boolean;
}

export default function ContentEnhancer({
  enableCopy = true,
  enableFullscreen = true,
  enableQuiz = true,
}: ContentEnhancerProps) {
  const [entries, setEntries] = useState<ToolbarEntry[]>([]);

  useEffect(() => {
    function scan() {
      const container = document.querySelector('.custom-content');
      if (!container) return;

      const preElements = container.querySelectorAll<HTMLElement>('pre');
      const newEntries: ToolbarEntry[] = [];

      preElements.forEach((pre, index) => {
        // Skip already enhanced elements
        if (pre.dataset.reactEnhanced === 'true') return;

        const language = extractLanguage(pre);

        if (language === 'mermaid') {
          const wrapper = wrapElement(pre, 'mermaid-wrapper');
          const mount = wrapper.querySelector('.mermaid-wrapper-toolbar-mount') as HTMLElement;
          pre.dataset.reactEnhanced = 'true';
          newEntries.push({ id: `mermaid-${index}`, type: 'mermaid', mountPoint: mount, preElement: pre });
        } else if (isInfographicBlock(pre)) {
          const wrapper = wrapElement(pre, 'infographic-wrapper');
          const mount = wrapper.querySelector('.infographic-wrapper-toolbar-mount') as HTMLElement;
          pre.dataset.reactEnhanced = 'true';
          newEntries.push({ id: `infographic-${index}`, type: 'infographic', mountPoint: mount, preElement: pre });
        } else {
          const wrapper = wrapElement(pre, 'code-block-wrapper');
          const mount = wrapper.querySelector('.code-block-wrapper-toolbar-mount') as HTMLElement;
          pre.dataset.reactEnhanced = 'true';
          newEntries.push({ id: `code-${index}`, type: 'code', mountPoint: mount, preElement: pre });
        }
      });

      // Scan for quiz elements
      if (enableQuiz) {
        const quizElements = container.querySelectorAll<HTMLElement>('li.quiz');
        quizElements.forEach((quizLi, qIndex) => {
          if (quizLi.dataset.reactEnhanced === 'true') return;
          // Create mount point after the quiz li
          const mount = document.createElement('div');
          mount.className = 'quiz-mount';
          quizLi.parentElement?.insertBefore(mount, quizLi.nextSibling);
          quizLi.dataset.reactEnhanced = 'true';
          // Hide original options (they'll be rendered by React)
          const optionsList = quizLi.querySelector('ul, ol');
          if (optionsList) optionsList.style.display = 'none';
          newEntries.push({ id: `quiz-${qIndex}`, type: 'quiz', mountPoint: mount, preElement: quizLi });
        });
      }

      // Scan for friend links grids
      const friendGrids = container.querySelectorAll<HTMLElement>('.friend-links-grid[data-links]');
      friendGrids.forEach((grid, fIndex) => {
        if (grid.dataset.reactEnhanced === 'true') return;
        // Hide original HTML cards (kept as no-JS fallback)
        for (const child of Array.from(grid.children)) {
          (child as HTMLElement).style.display = 'none';
        }
        // Override parent CSS grid — React component manages its own grid layout
        grid.style.display = 'block';
        const mount = document.createElement('div');
        grid.appendChild(mount);
        grid.dataset.reactEnhanced = 'true';
        newEntries.push({ id: `friend-links-${fIndex}`, type: 'friend-links', mountPoint: mount, preElement: grid });
      });

      // Scan for audio players
      const audioPlayers = container.querySelectorAll<HTMLElement>('[data-audio-player]');
      audioPlayers.forEach((el, aIndex) => {
        if (el.dataset.reactEnhanced === 'true') return;
        const mount = document.createElement('div');
        mount.className = 'audio-player-mount';
        el.appendChild(mount);
        el.dataset.reactEnhanced = 'true';
        newEntries.push({ id: `audio-${aIndex}`, type: 'audio', mountPoint: mount, preElement: el });
      });

      // Scan for video players
      const videoPlayers = container.querySelectorAll<HTMLElement>('[data-video-player]');
      videoPlayers.forEach((el, vIndex) => {
        if (el.dataset.reactEnhanced === 'true') return;
        const mount = document.createElement('div');
        mount.className = 'video-player-mount';
        el.appendChild(mount);
        el.dataset.reactEnhanced = 'true';
        newEntries.push({ id: `video-${vIndex}`, type: 'video', mountPoint: mount, preElement: el });
      });

      // Scan for note blocks (replace emoji icons with Iconify)
      const noteBlocks = container.querySelectorAll<HTMLElement>('.note-block:not(.no-icon)');
      noteBlocks.forEach((noteBlock, nIndex) => {
        if (noteBlock.dataset.reactEnhanced === 'true') return;
        const mount = document.createElement('span');
        mount.className = 'note-icon-mount';
        noteBlock.insertBefore(mount, noteBlock.firstChild);
        noteBlock.dataset.reactEnhanced = 'true';
        newEntries.push({ id: `note-${nIndex}`, type: 'note', mountPoint: mount, preElement: noteBlock });
      });

      // Animate <details> collapse blocks
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
      // Defer scan to let DOM update, then replace entries atomically to avoid flicker
      requestAnimationFrame(() => {
        setEntries([]);
        scan();
      });
    };

    document.addEventListener('astro:page-load', handlePageLoad);
    return () => document.removeEventListener('astro:page-load', handlePageLoad);
  }, [enableQuiz]);

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
          default:
            return null;
        }
      })}
    </>
  );
}

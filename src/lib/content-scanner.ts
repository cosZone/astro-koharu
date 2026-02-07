/**
 * DOM scanning functions for ContentEnhancer.
 *
 * Each scanner finds elements of a specific type in a container,
 * creates mount points for React portals, and returns ToolbarEntry objects.
 * Extracted to keep ContentEnhancer focused on rendering.
 */

import { extractLanguage, isInfographicBlock, wrapElement } from './content-enhancer-utils';

export interface ToolbarEntry {
  id: string;
  type: 'code' | 'mermaid' | 'infographic' | 'quiz' | 'friend-links' | 'audio' | 'video' | 'note' | 'encrypted';
  mountPoint: HTMLElement;
  preElement: HTMLElement;
}

/** Scan <pre> elements and categorize as code/mermaid/infographic */
export function scanPreElements(container: Element): ToolbarEntry[] {
  const entries: ToolbarEntry[] = [];
  const preElements = container.querySelectorAll<HTMLElement>('pre');

  preElements.forEach((pre, index) => {
    if (pre.dataset.reactEnhanced === 'true') return;
    const language = extractLanguage(pre);

    if (language === 'mermaid') {
      const wrapper = wrapElement(pre, 'mermaid-wrapper');
      const mount = wrapper.querySelector('.mermaid-wrapper-toolbar-mount') as HTMLElement;
      pre.dataset.reactEnhanced = 'true';
      entries.push({ id: `mermaid-${index}`, type: 'mermaid', mountPoint: mount, preElement: pre });
    } else if (isInfographicBlock(pre)) {
      const wrapper = wrapElement(pre, 'infographic-wrapper');
      const mount = wrapper.querySelector('.infographic-wrapper-toolbar-mount') as HTMLElement;
      pre.dataset.reactEnhanced = 'true';
      entries.push({ id: `infographic-${index}`, type: 'infographic', mountPoint: mount, preElement: pre });
    } else {
      const wrapper = wrapElement(pre, 'code-block-wrapper');
      const mount = wrapper.querySelector('.code-block-wrapper-toolbar-mount') as HTMLElement;
      pre.dataset.reactEnhanced = 'true';
      entries.push({ id: `code-${index}`, type: 'code', mountPoint: mount, preElement: pre });
    }
  });

  return entries;
}

/** Scan quiz list items */
export function scanQuizElements(container: Element): ToolbarEntry[] {
  const entries: ToolbarEntry[] = [];
  const quizElements = container.querySelectorAll<HTMLElement>('li.quiz');

  quizElements.forEach((quizLi, qIndex) => {
    if (quizLi.dataset.reactEnhanced === 'true') return;

    // Move the blockquote that directly follows this quiz's parent list into the li.
    // Only grab it when this li is the LAST quiz item in its list, to avoid stealing
    // a blockquote that belongs to a subsequent list.
    const parentList = quizLi.closest('ul, ol');
    if (parentList) {
      const quizItems = parentList.querySelectorAll(':scope > li.quiz');
      const isLastQuiz = quizItems.length > 0 && quizItems[quizItems.length - 1] === quizLi;
      if (isLastQuiz) {
        const nextSibling = parentList.nextElementSibling;
        if (nextSibling?.tagName === 'BLOCKQUOTE') {
          quizLi.appendChild(nextSibling);
        }
      }
      parentList.classList.add('quiz-list');
    }

    // Wrap original content in hidden container so bare text nodes don't render
    const original = document.createElement('div');
    original.className = 'quiz-original';
    original.hidden = true;
    while (quizLi.firstChild) {
      original.appendChild(quizLi.firstChild);
    }
    quizLi.appendChild(original);

    const mount = document.createElement('div');
    mount.className = 'quiz-mount';
    quizLi.appendChild(mount);
    quizLi.classList.add('quiz-enhanced');
    quizLi.dataset.reactEnhanced = 'true';
    entries.push({ id: `quiz-${qIndex}`, type: 'quiz', mountPoint: mount, preElement: quizLi });
  });

  return entries;
}

/** Scan friend links grids */
export function scanFriendLinks(container: Element): ToolbarEntry[] {
  const entries: ToolbarEntry[] = [];
  const friendGrids = container.querySelectorAll<HTMLElement>('.friend-links-grid[data-links]');

  friendGrids.forEach((grid, fIndex) => {
    if (grid.dataset.reactEnhanced === 'true') return;
    for (const child of Array.from(grid.children)) {
      (child as HTMLElement).style.display = 'none';
    }
    grid.style.display = 'block';
    const mount = document.createElement('div');
    grid.appendChild(mount);
    grid.dataset.reactEnhanced = 'true';
    entries.push({ id: `friend-links-${fIndex}`, type: 'friend-links', mountPoint: mount, preElement: grid });
  });

  return entries;
}

/** Scan audio player elements */
export function scanAudioPlayers(container: Element): ToolbarEntry[] {
  const entries: ToolbarEntry[] = [];
  const audioPlayers = container.querySelectorAll<HTMLElement>('[data-audio-player]');

  audioPlayers.forEach((el, aIndex) => {
    if (el.dataset.reactEnhanced === 'true') return;
    const mount = document.createElement('div');
    mount.className = 'audio-player-mount';
    el.appendChild(mount);
    el.dataset.reactEnhanced = 'true';
    entries.push({ id: `audio-${aIndex}`, type: 'audio', mountPoint: mount, preElement: el });
  });

  return entries;
}

/** Scan video player elements */
export function scanVideoPlayers(container: Element): ToolbarEntry[] {
  const entries: ToolbarEntry[] = [];
  const videoPlayers = container.querySelectorAll<HTMLElement>('[data-video-player]');

  videoPlayers.forEach((el, vIndex) => {
    if (el.dataset.reactEnhanced === 'true') return;
    const mount = document.createElement('div');
    mount.className = 'video-player-mount';
    el.appendChild(mount);
    el.dataset.reactEnhanced = 'true';
    entries.push({ id: `video-${vIndex}`, type: 'video', mountPoint: mount, preElement: el });
  });

  return entries;
}

/** Scan note blocks for icon injection */
export function scanNoteBlocks(container: Element): ToolbarEntry[] {
  const entries: ToolbarEntry[] = [];
  const noteBlocks = container.querySelectorAll<HTMLElement>('.note-block:not(.no-icon)');

  noteBlocks.forEach((noteBlock, nIndex) => {
    if (noteBlock.dataset.reactEnhanced === 'true') return;
    const mount = document.createElement('span');
    mount.className = 'note-icon-mount';
    noteBlock.insertBefore(mount, noteBlock.firstChild);
    noteBlock.dataset.reactEnhanced = 'true';
    entries.push({ id: `note-${nIndex}`, type: 'note', mountPoint: mount, preElement: noteBlock });
  });

  return entries;
}

/** Scan encrypted blocks */
export function scanEncryptedBlocks(container: Element): ToolbarEntry[] {
  const entries: ToolbarEntry[] = [];
  const blocks = container.querySelectorAll<HTMLElement>('.encrypted-block[data-cipher]');

  blocks.forEach((block, eIndex) => {
    if (block.dataset.reactEnhanced === 'true') return;
    const mount = document.createElement('div');
    mount.className = 'encrypted-block-mount';
    block.appendChild(mount);
    block.dataset.reactEnhanced = 'true';
    entries.push({ id: `encrypted-${eIndex}`, type: 'encrypted', mountPoint: mount, preElement: block });
  });

  return entries;
}

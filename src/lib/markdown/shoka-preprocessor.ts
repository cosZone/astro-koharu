/**
 * Shoka syntax preprocessor
 *
 * Transforms Shoka-specific syntax in raw Markdown BEFORE the remark parser
 * processes it. This is necessary because some Shoka syntax conflicts with
 * standard Markdown/GFM parsing:
 *
 * - `+++style Title` would be parsed as thematicBreak
 * - `~sub~` would be parsed as GFM strikethrough (~~ is delete)
 * - `{% links %}...{% endlinks %}` YAML content would be parsed as lists
 * - `:::style` is fine (remark sees it as paragraph text) but nested content
 *   with lists would be problematic
 *
 * This preprocessor converts block-level Shoka syntax into HTML before
 * remark parsing. Inline syntax (++ins++, ==mark==, !!spoiler!!, {^ruby})
 * is handled by remark plugins since those don't conflict with Markdown.
 */
import YAML from 'js-yaml';
import {
  escapeHtml,
  type FriendLinkData,
  type MediaItem,
  renderAudioMedia,
  renderFriendLinks,
  renderVideoMedia,
} from './shoka-renderers';

interface ContainerOptions {
  enableContainers?: boolean;
  enableHexoTags?: boolean;
}

/** Maximum nesting depth for recursive container processing */
const MAX_CONTAINER_DEPTH = 10;

/**
 * Process container syntax (:::, +++, ;;;) and Hexo tags in raw markdown text.
 * Returns the text with containers/tags replaced by HTML blocks.
 */
function processContainers(text: string, opts: ContainerOptions = {}, _depth = 0): string {
  // Guard against excessive nesting (malicious or accidental)
  if (_depth >= MAX_CONTAINER_DEPTH) return text;
  const containers = opts.enableContainers !== false;
  const hexoTags = opts.enableHexoTags !== false;
  // Use regex to handle both \n and \r\n regardless of the runtime OS
  const lines = text.split(/\r?\n/);
  const output: string[] = [];
  let i = 0;

  // Track tab groups for grouping consecutive ;;; with same id
  let pendingTabId: string | null = null;
  let pendingTabs: { name: string; lines: string[] }[] = [];

  function flushTabs() {
    if (pendingTabs.length === 0 || !pendingTabId) return;
    const groupId = pendingTabId;

    output.push('');
    output.push(`<div class="tab-group" data-tab-group="${escapeHtml(groupId)}">`);
    output.push(`<div class="tab-headers" role="tablist">`);
    for (let t = 0; t < pendingTabs.length; t++) {
      const isActive = t === 0;
      output.push(
        `<button class="tab-header" role="tab" aria-selected="${isActive}" data-tab-index="${t}" data-tab-group="${escapeHtml(groupId)}">${escapeHtml(pendingTabs[t].name)}</button>`,
      );
    }
    output.push('</div>');
    for (let t = 0; t < pendingTabs.length; t++) {
      const isActive = t === 0;
      output.push(`<div class="tab-panel${isActive ? ' active' : ''}" role="tabpanel" data-tab-index="${t}">`);
      output.push('');
      // Recursively process inner content
      output.push(processContainers(pendingTabs[t].lines.join('\n'), opts, _depth + 1));
      output.push('');
      output.push('</div>');
    }
    output.push('</div>');
    output.push('');

    pendingTabs = [];
    pendingTabId = null;
  }

  // Track code fences to avoid processing container syntax inside them
  let inCodeFence = false;
  let codeFenceChar = '';
  let codeFenceLen = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect code fence boundaries (``` or ~~~ with 3+ chars)
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const matchChar = fenceMatch[1][0];
      const matchLen = fenceMatch[1].length;
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceChar = matchChar;
        codeFenceLen = matchLen;
        flushTabs();
        output.push(line);
        i++;
        continue;
      }
      // Closing fence: same char, at least same length, only whitespace after
      if (matchChar === codeFenceChar && matchLen >= codeFenceLen && /^(`{3,}|~{3,})\s*$/.test(line)) {
        inCodeFence = false;
        codeFenceChar = '';
        codeFenceLen = 0;
        output.push(line);
        i++;
        continue;
      }
    }

    // Inside code fence → pass through unchanged
    if (inCodeFence) {
      output.push(line);
      i++;
      continue;
    }

    // ::: note block
    const noteMatch = containers && line.match(/^:::(\w+)(?:\s+(no-icon))?\s*$/);
    if (noteMatch) {
      flushTabs();
      const style = noteMatch[1];
      const noIcon = noteMatch[2] === 'no-icon';
      const innerLines: string[] = [];
      i++;
      let depth = 1;
      while (i < lines.length && depth > 0) {
        if (/^:::\s*$/.test(lines[i])) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        } else if (/^:::(\w+)(?:\s+(no-icon))?\s*$/.test(lines[i])) {
          depth++;
        }
        innerLines.push(lines[i]);
        i++;
      }
      const noIconClass = noIcon ? ' no-icon' : '';
      output.push('');
      output.push(`<div class="note-block note-${style}${noIconClass}">`);
      output.push('');
      output.push(processContainers(innerLines.join('\n'), opts, _depth + 1));
      output.push('');
      output.push('</div>');
      output.push('');
      continue;
    }

    // +++ collapse block
    const collapseMatch = containers && line.match(/^\+\+\+(\w+)\s+(.+)$/);
    if (collapseMatch) {
      flushTabs();
      const style = collapseMatch[1];
      const title = collapseMatch[2];
      const innerLines: string[] = [];
      i++;
      let depth = 1;
      while (i < lines.length && depth > 0) {
        if (/^\+\+\+\s*$/.test(lines[i])) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        } else if (/^\+\+\+\w+\s+.+$/.test(lines[i])) {
          depth++;
        }
        innerLines.push(lines[i]);
        i++;
      }
      output.push('');
      output.push(`<details class="collapse-block collapse-${style}">`);
      output.push(`<summary>${escapeHtml(title)}</summary>`);
      output.push(`<div class="collapse-content">`);
      output.push('');
      output.push(processContainers(innerLines.join('\n'), opts, _depth + 1));
      output.push('');
      output.push('</div>');
      output.push('</details>');
      output.push('');
      continue;
    }

    // ;;; tab panel
    const tabMatch = containers && line.match(/^;;;(\S+)\s+(.+)$/);
    if (tabMatch) {
      const tabId = tabMatch[1];
      const tabName = tabMatch[2];
      const innerLines: string[] = [];
      i++;
      let depth = 1;
      while (i < lines.length && depth > 0) {
        if (/^;;;\s*$/.test(lines[i])) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        } else if (/^;;;\S+\s+.+$/.test(lines[i])) {
          depth++;
        }
        innerLines.push(lines[i]);
        i++;
      }

      if (pendingTabId === tabId) {
        pendingTabs.push({ name: tabName, lines: innerLines });
      } else {
        flushTabs();
        pendingTabId = tabId;
        pendingTabs = [{ name: tabName, lines: innerLines }];
      }
      continue;
    }

    // {% links %} ... {% endlinks %}
    if (hexoTags && line.trim() === '{% links %}') {
      flushTabs();
      const yamlLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '{% endlinks %}') {
        yamlLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip endlinks

      try {
        const data = YAML.load(yamlLines.join('\n')) as FriendLinkData[];
        if (Array.isArray(data)) {
          output.push('');
          output.push(renderFriendLinks(data));
          output.push('');
        }
      } catch {
        output.push(`<!-- Failed to parse links YAML -->`);
      }
      continue;
    }

    // {% media audio/video %} ... {% endmedia %}
    const mediaMatch = hexoTags && line.trim().match(/^{% media (audio|video) %}$/);
    if (mediaMatch) {
      flushTabs();
      const mediaType = mediaMatch[1];
      const yamlLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '{% endmedia %}') {
        yamlLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip endmedia

      try {
        const data = YAML.load(yamlLines.join('\n')) as MediaItem[];
        if (Array.isArray(data)) {
          if (mediaType === 'audio') {
            output.push('');
            output.push(renderAudioMedia(data));
            output.push('');
          } else {
            output.push('');
            output.push(renderVideoMedia(data));
            output.push('');
          }
        }
      } catch {
        output.push(`<!-- Failed to parse media YAML -->`);
      }
      continue;
    }

    // Don't flush pending tabs on empty lines — consecutive ;;; blocks
    // are separated by blank lines but should still group together.
    if (pendingTabId && line.trim() === '') {
      i++;
      continue;
    }
    flushTabs();
    output.push(line);
    i++;
  }

  flushTabs();
  return output.join('\n');
}

/**
 * Process inline ~sub~ and ^sup^ syntax, skipping protected regions.
 * Must be done before GFM parsing to avoid ~text~ being treated as strikethrough.
 */
function processInlineSuperSub(text: string): string {
  return processOutsideProtectedRegions(text, (segment) => {
    // Replace ~sub~ (single tilde, not ~~) with <sub> — escape content to prevent XSS
    segment = segment.replace(/(?<![~\\])~([^~\s]+)~(?!~)/g, (_, content) => `<sub>${escapeHtml(content)}</sub>`);
    // Replace ^sup^ with <sup> — escape content to prevent XSS
    segment = segment.replace(/(?<![\\^])\^([^^\s]+)\^/g, (_, content) => `<sup>${escapeHtml(content)}</sup>`);
    return segment;
  });
}

/**
 * Split text into protected and unprotected segments, applying `fn` only to unprotected parts.
 * Protected regions: code fences (```/~~~), inline code (`...`), math ($$...$$, $...$).
 */
function processOutsideProtectedRegions(text: string, fn: (segment: string) => string): string {
  // Match (in priority order): code fences, inline code, block math, inline math
  const protectedRegex =
    /(^`{3,}.*\n[\s\S]*?^`{3,}\s*$|^~{3,}.*\n[\s\S]*?^~{3,}\s*$|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/gm;
  let lastIndex = 0;
  const parts: string[] = [];

  for (let match = protectedRegex.exec(text); match !== null; match = protectedRegex.exec(text)) {
    if (match.index > lastIndex) {
      parts.push(fn(text.slice(lastIndex, match.index)));
    }
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(fn(text.slice(lastIndex)));
  }

  return parts.length > 0 ? parts.join('') : fn(text);
}

/**
 * Main preprocessor function.
 * Transforms raw Markdown source text before remark parsing.
 */
export function preprocessShokaSyntax(
  source: string,
  options?: {
    enableContainers?: boolean;
    enableHexoTags?: boolean;
    enableSuperSub?: boolean;
  },
): string {
  let result = source;

  // Process block-level containers and Hexo tags
  if (options?.enableContainers !== false || options?.enableHexoTags !== false) {
    result = processContainers(result, {
      enableContainers: options?.enableContainers,
      enableHexoTags: options?.enableHexoTags,
    });
  }

  // Process inline sub/sup before GFM strikethrough conflicts
  if (options?.enableSuperSub !== false) {
    result = processInlineSuperSub(result);
  }

  return result;
}

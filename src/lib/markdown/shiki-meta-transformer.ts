/**
 * Shiki transformer for code block meta string parsing
 *
 * Parses meta strings like:
 *   ```js title="hello.js" url="https://..." linkText="Source" mark:1,3-5 command:("$":1-3)
 *
 * Adds data attributes to the <pre> element:
 * - data-title: Code block title
 * - data-url: Link URL
 * - data-link-text: Link display text
 * - data-mark: Comma-separated line numbers/ranges to highlight
 * - data-command: JSON object mapping prompts to line ranges
 */
import type { ShikiTransformer } from 'shiki';

interface CodeMeta {
  title?: string;
  url?: string;
  linkText?: string;
  mark?: string;
  command?: string;
}

const MAX_COMMAND_PROMPTS = 128;

/** Parse meta string into structured data */
function parseMeta(meta: string | undefined): CodeMeta | null {
  if (!meta) return null;

  const result: CodeMeta = {};

  // Parse key="value" pairs
  const kvRegex = /(\w+)="([^"]*)"/g;
  for (let match = kvRegex.exec(meta); match !== null; match = kvRegex.exec(meta)) {
    const key = match[1];
    const value = match[2];
    if (key === 'title') result.title = value;
    else if (key === 'url') result.url = value;
    else if (key === 'linkText') result.linkText = value;
  }

  // Parse mark:1,3-5,7
  const markMatch = meta.match(/mark:([\d,-]+)/);
  if (markMatch) result.mark = markMatch[1];

  // Parse command:("prompt":lines)
  // e.g., command:("$":1-3) or command:("$":1-3,"#":4-5)
  const commandMatch = meta.match(/command:\(([^)]+)\)/);
  if (commandMatch) result.command = commandMatch[1];

  if (!result.title && !result.url && !result.mark && !result.command) return null;
  return result;
}

/** Intersect ranges with real code lines; work stays linear for overlapping or enormous ranges. */
function expandLineRanges(rangeStr: string, lineCount: number): Set<number> {
  const lines = new Set<number>();
  if (lineCount === 0) return lines;

  const changes = new Int32Array(lineCount + 2);
  const rangeRegex = /(?:^|,)(\d+)(?:-(\d+))?(?=,|$)/g;
  let hasRange = false;
  for (let match = rangeRegex.exec(rangeStr); match !== null; match = rangeRegex.exec(rangeStr)) {
    const start = Math.max(1, Number(match[1]));
    const end = Math.min(lineCount, Number(match[2] ?? match[1]));
    if (!Number.isFinite(start) || start > end) continue;
    changes[start] += 1;
    changes[end + 1] -= 1;
    hasRange = true;
  }
  if (!hasRange) return lines;
  let activeRanges = 0;
  for (let line = 1; line <= lineCount; line++) {
    activeRanges += changes[line];
    if (activeRanges > 0) lines.add(line);
  }
  return lines;
}

/** Parse command meta: "prompt":startLine-endLine,... */
function parseCommand(commandStr: string, lineCount: number): Record<string, Set<number>> {
  const result: Record<string, Set<number>> = {};
  const pairRegex = /"([^"]+)":([\d,-]+)/g;
  let promptCount = 0;
  for (let match = pairRegex.exec(commandStr); match !== null; match = pairRegex.exec(commandStr)) {
    // The raw metadata remains intact; bound the per-line prompt scan for pasted or generated input.
    if (promptCount >= MAX_COMMAND_PROMPTS) break;
    promptCount += 1;
    result[match[1]] = expandLineRanges(match[2], lineCount);
  }
  return result;
}

export function shokaMetaTransformer(): ShikiTransformer {
  // Cache parsed meta to avoid re-parsing on every line of the same code block
  let cachedRaw: string | undefined;
  let cachedLineCount = 0;
  let cachedMeta: CodeMeta | null = null;
  let cachedMarkLines: Set<number> | null = null;
  let cachedCommands: Record<string, Set<number>> | null = null;

  function getMeta(raw: string | undefined, lineCount: number): CodeMeta | null {
    if (raw === cachedRaw && lineCount === cachedLineCount) return cachedMeta;
    cachedRaw = raw;
    cachedLineCount = lineCount;
    cachedMeta = parseMeta(raw);
    cachedMarkLines = cachedMeta?.mark ? expandLineRanges(cachedMeta.mark, lineCount) : null;
    cachedCommands = cachedMeta?.command ? parseCommand(cachedMeta.command, lineCount) : null;
    return cachedMeta;
  }

  return {
    name: 'shoka-meta',
    pre(node) {
      // Reset cache to prevent cross-block leakage
      cachedRaw = undefined;
      cachedLineCount = 0;
      cachedMeta = null;
      cachedMarkLines = null;
      cachedCommands = null;

      const meta = getMeta(this.options.meta?.__raw, this.tokens.length);
      if (!meta) return;

      // Add data attributes
      if (meta.title) node.properties['data-title'] = meta.title;
      if (meta.url) node.properties['data-url'] = meta.url;
      if (meta.linkText) node.properties['data-link-text'] = meta.linkText;
      if (meta.mark) node.properties['data-mark'] = meta.mark;
      if (meta.command) node.properties['data-command'] = meta.command;
    },
    line(node, line) {
      const meta = getMeta(this.options.meta?.__raw, this.tokens.length);
      if (!meta) return;

      // Apply mark highlighting to specific lines
      if (cachedMarkLines?.has(line)) {
        node.properties.class = `${node.properties.class || ''} line-highlight`.trim();
      }

      // Apply command prompt to specific lines
      if (cachedCommands) {
        for (const [prompt, lines] of Object.entries(cachedCommands)) {
          if (lines.has(line)) {
            node.properties['data-prompt'] = prompt;
            node.properties.class = `${node.properties.class || ''} has-prompt`.trim();
          }
        }
      }
    },
  };
}

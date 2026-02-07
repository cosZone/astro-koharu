/**
 * LRC lyrics parser.
 * Ported from Shoka player.js:477-511.
 *
 * LRC format: [mm:ss.xx]lyrics text
 * Supports multiple timestamps per line: [00:01.00][00:15.00]shared text
 */

export interface LrcLine {
  time: number; // seconds
  text: string;
}

const TIME_REGEX = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;

export function parseLrc(lrcText: string): LrcLine[] {
  if (!lrcText) return [];

  const lines: LrcLine[] = [];

  for (const line of lrcText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const timestamps: number[] = [];
    let lastIndex = 0;

    for (let match = TIME_REGEX.exec(trimmed); match !== null; match = TIME_REGEX.exec(trimmed)) {
      const min = Number.parseInt(match[1], 10);
      const sec = Number.parseInt(match[2], 10);
      const ms = match[3] ? Number.parseInt(match[3].padEnd(3, '0'), 10) : 0;
      timestamps.push(min * 60 + sec + ms / 1000);
      lastIndex = match.index + match[0].length;
    }
    TIME_REGEX.lastIndex = 0;

    if (timestamps.length === 0) continue;

    const text = trimmed.slice(lastIndex).trim();
    for (const time of timestamps) {
      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

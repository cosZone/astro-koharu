export interface IssueTitle {
  /** Issue number as written (`36`), or null when the title carries none. */
  number: string | null;
  /** Headline after the separator, or the whole title when it cannot be split. */
  headline: string;
}

// `Weekly Vol.35 | …`, `周刊第 1 期：…`, `Weekly #12 - …`, `No. 3`
const ISSUE_TITLE = /^.*?\s*(?:\bvol\.?|\bno\.|#|第)\s*(\d+)\s*期?\s*(?:[|｜:：—–-]\s*(.*))?$/i;

/** Splits a series post title into issue number and headline for the issue index. */
export function parseIssueTitle(title: string): IssueTitle {
  const match = ISSUE_TITLE.exec(title.trim());
  if (!match) return { number: null, headline: title.trim() };
  const [, number, headline] = match;
  return { number, headline: headline?.trim() || title.trim() };
}

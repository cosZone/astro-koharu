/** Different Umami API versions may return either a raw number or { value: number } */
type UmamiValue = { value: number } | number;

export interface UmamiSessionStats {
  pageviews: UmamiValue;
  [key: string]: unknown;
}

export interface UmamiStatsConfig {
  baseUrl: string;
  websiteId: string;
  /** Umami share slug, exchanged for a short-lived JWT at runtime (safe to expose on client) */
  shareToken: string;
  path?: string;
  startAt?: number;
  endAt?: number;
}

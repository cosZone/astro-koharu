/** Different Umami API versions may return either a raw number or { value: number } */
type UmamiValue = { value: number } | number;

export interface UmamiSessionStats {
  pageviews: UmamiValue;
  visitors: UmamiValue;
  visits?: UmamiValue;
  countries?: UmamiValue;
  events?: UmamiValue;
  bounces?: UmamiValue;
  totaltime?: UmamiValue;
  comparison?: {
    pageviews?: UmamiValue;
    visitors?: UmamiValue;
    visits?: UmamiValue;
    bounces?: UmamiValue;
    totaltime?: UmamiValue;
  };
}

export interface UmamiStatsConfig {
  baseUrl: string;
  websiteId: string;
  /** Umami share link token (read-only, safe to expose on client) */
  shareToken: string;
  path?: string;
  startAt?: number;
  endAt?: number;
}

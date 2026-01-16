/**
 * Configuration Types for YAML-based site configuration
 *
 * These types match the structure of config/site.yaml
 */

// =============================================================================
// Site Basic Configuration
// =============================================================================

export interface SiteBasicConfig {
  title: string;
  alternate?: string;
  subtitle?: string;
  name: string;
  description?: string;
  avatar?: string;
  showLogo?: boolean;
  author?: string;
  url: string;
  startYear?: number;
  keywords?: string[];
}

// =============================================================================
// Featured Content
// =============================================================================

export interface FeaturedCategory {
  link: string;
  image: string;
  label?: string;
  description?: string;
}

export interface FeaturedSeriesLinks {
  github?: string;
  rss?: string;
  chrome?: string;
  docs?: string;
}

export interface FeaturedSeries {
  categoryName: string;
  label?: string;
  enabled?: boolean;
  fullName?: string;
  description?: string;
  cover?: string;
  links?: FeaturedSeriesLinks;
}

// =============================================================================
// Social Configuration
// =============================================================================

export interface SocialPlatform {
  url: string;
  icon: string;
  color: string;
}

export type SocialConfig = Record<string, SocialPlatform>;

// =============================================================================
// Friends Configuration
// =============================================================================

export interface FriendLink {
  site: string;
  url: string;
  owner: string;
  desc: string;
  image: string;
  color?: string;
}

export interface FriendsIntro {
  title: string;
  subtitle?: string;
  applyTitle?: string;
  applyDesc?: string;
  exampleYaml?: string;
}

export interface FriendsConfig {
  intro: FriendsIntro;
  data: FriendLink[];
}

// =============================================================================
// Announcements
// =============================================================================

export interface AnnouncementLink {
  url: string;
  text?: string;
  external?: boolean;
}

export interface AnnouncementConfig {
  id: string;
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success' | 'important';
  publishDate?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  link?: AnnouncementLink;
  color?: string;
}

// =============================================================================
// Content Processing Configuration
// =============================================================================

export interface ContentConfig {
  addBlankTarget: boolean;
  smoothScroll: boolean;
  addHeadingLevel: boolean;
  enhanceCodeBlock: boolean;
  enableCodeCopy: boolean;
  enableCodeFullscreen: boolean;
  enableLinkEmbed: boolean;
  enableTweetEmbed: boolean;
  enableOGPreview: boolean;
  previewCacheTime: number;
  lazyLoadEmbeds: boolean;
}

// =============================================================================
// Navigation
// =============================================================================

export interface RouterItem {
  name?: string;
  path?: string;
  icon?: string;
  children?: RouterItem[];
}

// =============================================================================
// Comment Configuration
// =============================================================================

export type CommentProvider = 'remark42' | 'giscus' | 'waline' | 'none';

export interface Remark42Config {
  host: string;
  siteId: string;
}

export interface GiscusConfig {
  repo: string; // owner/repo format
  repoId: string;
  category: string;
  categoryId: string;
  mapping?: 'pathname' | 'url' | 'title' | 'og:title';
  reactionsEnabled?: boolean;
  emitMetadata?: boolean;
  inputPosition?: 'top' | 'bottom';
  lang?: string;
}

export interface WalineConfig {
  serverURL: string;
  lang?: string;
  dark?: string;
  meta?: ('nick' | 'mail' | 'link')[];
  requiredMeta?: ('nick' | 'mail' | 'link')[];
  login?: 'enable' | 'disable' | 'force';
  wordLimit?: number | [number, number];
  pageSize?: number;
  imageUploader?: boolean;
  highlighter?: boolean;
  texRenderer?: boolean;
  search?: boolean;
  reaction?: boolean | string[];
  recaptchaV3Key?: string;
  turnstileKey?: string;
}

export interface CommentConfig {
  provider?: CommentProvider;
  remark42?: Remark42Config;
  giscus?: GiscusConfig;
  waline?: WalineConfig;
}

// =============================================================================
// Analytics Configuration
// =============================================================================

export interface UmamiConfig {
  enabled: boolean;
  id: string;
  endpoint: string;
}

export interface AnalyticsConfig {
  umami?: UmamiConfig;
}

// =============================================================================
// Christmas/Seasonal Features
// =============================================================================

export interface ChristmasFeatures {
  snowfall: boolean;
  christmasColorScheme: boolean;
  christmasCoverDecoration: boolean;
  christmasHat: boolean;
  readingTimeSnow: boolean;
}

export interface SnowfallConfig {
  speed: number;
  intensity: number;
  mobileIntensity: number;
  maxLayers: number;
  maxIterations: number;
  mobileMaxLayers: number;
  mobileMaxIterations: number;
}

export interface ChristmasConfig {
  enabled: boolean;
  features: ChristmasFeatures;
  snowfall: SnowfallConfig;
}

// =============================================================================
// Root Configuration Type
// =============================================================================

export interface SiteYamlConfig {
  site: SiteBasicConfig;
  featuredCategories?: FeaturedCategory[];
  featuredSeries?: FeaturedSeries;
  social?: SocialConfig;
  friends?: FriendsConfig;
  announcements?: AnnouncementConfig[];
  content?: ContentConfig;
  navigation?: RouterItem[];
  comment?: CommentConfig;
  analytics?: AnalyticsConfig;
  categoryMap?: Record<string, string>; // TODO: i18n, now use eg: { '随笔': 'life' }
  christmas?: ChristmasConfig;
}

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
  defaultOgImage?: string;
  keywords?: string[];
  /** 面包屑导航中首页的显示名称 @default '首页' */
  breadcrumbHome?: string;
  /** 时区配置 (IANA 格式) @default 'Asia/Shanghai' */
  timezone?: string;
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

/**
 * Single featured series configuration
 */
export interface FeaturedSeriesItem {
  /** URL path for this series (e.g., 'weekly' → /weekly) */
  slug: string;
  /** Category name this series is based on */
  categoryName: string;
  /** Short label for sidebar/navigation */
  label?: string;
  /** Whether this series is enabled */
  enabled?: boolean;
  /** Full name for page title */
  fullName?: string;
  /** Series description (supports markdown) */
  description?: string;
  /** Cover image path */
  cover?: string;
  /** Navigation icon (Iconify format) */
  icon?: string;
  /** Whether to highlight latest post on home page */
  highlightOnHome?: boolean;
  /** Related links */
  links?: FeaturedSeriesLinks;
}

/**
 * @deprecated Use FeaturedSeriesItem instead
 */
export type FeaturedSeries = FeaturedSeriesItem;

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
  // Shoka compatibility features
  enableShokaContainers?: boolean;
  enableShokaAttrs?: boolean;
  enableShokaEffects?: boolean;
  enableShokaSpoiler?: boolean;
  enableShokaRuby?: boolean;
  enableShokaHexoTags?: boolean;
  enableMath?: boolean;
  enableCodeMeta?: boolean;
  enableQuiz?: boolean;
  enableEncryptedBlock?: boolean;
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

export type GiscusBooleanString = '0' | '1';
export interface GiscusConfig {
  repo: `${string}/${string}`; // owner/repo format
  repoId: string;
  category?: string;
  categoryId?: string;
  mapping?: 'url' | 'title' | 'og:title' | 'specific' | 'number' | 'pathname';
  term?: string; // Used when mapping is 'specific' or 'number'
  strict?: GiscusBooleanString;
  reactionsEnabled?: GiscusBooleanString;
  emitMetadata?: GiscusBooleanString;
  inputPosition?: 'top' | 'bottom';
  lang?: string;
  host?: string; // Custom giscus host (for self-hosted)
  theme?: string;
  loading?: 'lazy' | 'eager';
}

export type WalineMeta = 'nick' | 'mail' | 'link';
export type WalineLoginStatus = 'enable' | 'disable' | 'force';
export type WalineCommentSorting = 'latest' | 'oldest' | 'hottest';
export type WalineEmojiPresets = `//${string}` | `http://${string}` | `https://${string}`;

export interface WalineEmojiInfo {
  /**
   * Emoji 名称
   * Emoji name show on tab
   */
  name: string;
  /**
   * 所在文件夹链接
   * Current folder link
   */
  folder?: string;
  /**
   * Emoji 通用路径前缀
   * Common prefix of Emoji icons
   */
  prefix?: string;
  /**
   * Emoji 图片的类型,会作为文件扩展名使用
   * Type of Emoji icons, will be regarded as file extension
   */
  type?: string;
  /**
   * 选项卡显示的 Emoji 图标
   * Emoji icon show on tab
   */
  icon: string;
  /**
   * Emoji 图片列表
   * Emoji image list
   */
  items: string[];
}

export interface WalineConfig {
  /**
   * Waline 服务端地址 (必填)
   * Waline server address (required)
   */
  serverURL: string;

  /**
   * 显示语言
   * Display language
   * @default 'zh-CN'
   */
  lang?: string;

  /**
   * 暗黑模式适配
   * Darkmode support
   * @default 'html.dark'
   */
  dark?: string | boolean;

  /**
   * 评论者相关属性
   * Reviewer attributes
   * @default ['nick', 'mail', 'link']
   */
  meta?: WalineMeta[];

  /**
   * 必填项
   * Required fields
   * @default []
   */
  requiredMeta?: WalineMeta[];

  /**
   * 登录模式
   * Login mode status
   * @default 'enable'
   */
  login?: WalineLoginStatus;

  /**
   * 评论字数限制
   * Comment word limit (0 = no limit)
   * @default 0
   */
  wordLimit?: number | [number, number];

  /**
   * 评论列表分页，每页条数
   * Number of pages per page
   * @default 10
   */
  pageSize?: number;

  /**
   * 图片上传功能
   * Image upload feature
   * @default false
   */
  imageUploader?: boolean;

  /**
   * 代码高亮
   * Code highlighting
   * @default true
   */
  highlighter?: boolean;

  /**
   * LaTeX 渲染
   * LaTeX rendering
   * @default false
   */
  texRenderer?: boolean;

  /**
   * 搜索功能
   * Search feature
   * @default false
   */
  search?: boolean;

  /**
   * 文章反应
   * Article reaction
   * @default false
   */
  reaction?: boolean | string[];

  /**
   * reCAPTCHA v3 Key
   * reCAPTCHA v3 client key
   */
  recaptchaV3Key?: string;

  /**
   * Cloudflare Turnstile Key
   * Turnstile client key
   */
  turnstileKey?: string;

  /**
   * 表情包配置
   * Emoji configuration
   * @default ['//unpkg.com/@waline/emojis@1.2.0/weibo']
   */
  emoji?: (WalineEmojiInfo | WalineEmojiPresets)[] | boolean;

  /**
   * 评论列表排序方式
   * Sorting method for comment list
   * @default 'latest'
   */
  commentSorting?: WalineCommentSorting;

  /**
   * 是否在页脚隐藏版权信息
   * Whether hide copyright in footer
   * @default false
   */
  noCopyright?: boolean;

  /**
   * 评论数统计
   * Comment count support
   * @default true
   */
  comment?: string | boolean;

  /**
   * 页面访问量统计
   * Pageview count support
   * @default true
   */
  pageview?: string | boolean;

  /**
   * 自定义语言显示
   * Custom display language
   */
  locale?: Record<string, string>;
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
// SEO Configuration
// =============================================================================

export interface RobotsPolicyItem {
  userAgent: string;
  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
}

export interface RobotsConfig {
  policy?: RobotsPolicyItem[];
  host?: boolean;
}

export interface SeoConfig {
  robots?: RobotsConfig;
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
// Dev Tools Configuration (Dev Only - Local Editor Integration)
// =============================================================================

/**
 * Configuration for a single editor
 */
export interface EditorConfig {
  /** Unique identifier for the editor */
  id: string;
  /** Display name */
  name: string;
  /** Iconify icon identifier (e.g., 'devicon-plain:vscode') */
  icon: string;
  /** URL template with placeholder: {path} for file absolute path */
  urlTemplate: string;
}

/**
 * Development tools configuration from site.yaml
 */
export interface DevConfig {
  /** Absolute path to the local project directory */
  localProjectPath: string;
  /** Relative path from project root to content directory (default: 'src/content/blog') */
  contentRelativePath: string;
  /** List of configured editors */
  editors: EditorConfig[];
}

// =============================================================================
// Root Configuration Type
// =============================================================================

export interface SiteYamlConfig {
  site: SiteBasicConfig;
  featuredCategories?: FeaturedCategory[];
  /** Featured series configuration - supports array (multiple series) or single object (legacy) */
  featuredSeries?: FeaturedSeriesItem[] | FeaturedSeriesItem;
  social?: SocialConfig;
  friends?: FriendsConfig;
  announcements?: AnnouncementConfig[];
  content?: ContentConfig;
  navigation?: RouterItem[];
  comment?: CommentConfig;
  analytics?: AnalyticsConfig;
  /** SEO configuration for robots.txt and meta tags */
  seo?: SeoConfig;
  categoryMap?: Record<string, string>; // TODO: i18n, now use eg: { '随笔': 'life' }
  christmas?: ChristmasConfig;
  /** Development tools configuration (dev only) */
  dev?: DevConfig;
}

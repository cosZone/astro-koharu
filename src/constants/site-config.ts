// Import YAML config directly - processed by @rollup/plugin-yaml
import yamlConfig from '../../config/site.yaml';

type SiteConfig = {
  title: string;
  alternate?: string;
  subtitle?: string;
  name: string;
  description?: string;
  avatar?: string;
  showLogo?: boolean;
  author?: string;
  site: string;
  startYear?: number;
  keywords?: string[];
  featuredCategories?: {
    link: string;
    image: string;
    label?: string;
    description?: string;
  }[];
  featuredSeries?: {
    categoryName: string;
    label?: string;
    enabled?: boolean;
    fullName?: string;
    description?: string;
    cover?: string;
    links?: {
      github?: string;
      rss?: string;
      chrome?: string;
      docs?: string;
    };
  };
};

type SocialPlatform = {
  url: string;
  icon: string;
  color: string;
};

type SocialConfig = {
  github?: SocialPlatform;
  google?: SocialPlatform;
  twitter?: SocialPlatform;
  zhihu?: SocialPlatform;
  music?: SocialPlatform;
  weibo?: SocialPlatform;
  about?: SocialPlatform;
  email?: SocialPlatform;
  facebook?: SocialPlatform;
  stackoverflow?: SocialPlatform;
  youtube?: SocialPlatform;
  instagram?: SocialPlatform;
  skype?: SocialPlatform;
  douban?: SocialPlatform;
  bilibili?: SocialPlatform;
  rss?: SocialPlatform;
};

// Map YAML config to existing types
export const siteConfig: SiteConfig = {
  title: yamlConfig.site.title,
  alternate: yamlConfig.site.alternate,
  subtitle: yamlConfig.site.subtitle,
  name: yamlConfig.site.name,
  description: yamlConfig.site.description,
  avatar: yamlConfig.site.avatar,
  showLogo: yamlConfig.site.showLogo,
  author: yamlConfig.site.author,
  site: yamlConfig.site.url,
  startYear: yamlConfig.site.startYear,
  keywords: yamlConfig.site.keywords,
  featuredCategories: yamlConfig.featuredCategories,
  featuredSeries: yamlConfig.featuredSeries,
};

export const socialConfig: SocialConfig = yamlConfig.social ?? {};

const { title, alternate, subtitle } = siteConfig;

export const seoConfig = {
  title: `${alternate ? `${alternate} = ` : ''}${title}${subtitle ? ` = ${subtitle}` : ''}`,
  description: siteConfig.description,
  keywords: siteConfig?.keywords?.join(',') ?? '',
  url: siteConfig.site,
};

export const defaultCoverList = Array.from({ length: 21 }, (_, index) => index + 1).map((item) => `/img/cover/${item}.webp`);

// Christmas config types
type ChristmasConfig = {
  enabled: boolean;
  features: {
    snowfall: boolean;
    christmasColorScheme: boolean;
    christmasCoverDecoration: boolean;
    christmasHat: boolean;
    readingTimeSnow: boolean;
  };
  snowfall: {
    speed: number;
    intensity: number;
    mobileIntensity: number;
    maxLayers: number;
    maxIterations: number;
    mobileMaxLayers: number;
    mobileMaxIterations: number;
  };
};

// Map YAML christmas config with defaults
export const christmasConfig: ChristmasConfig = yamlConfig.christmas || {
  enabled: false,
  features: {
    snowfall: true,
    christmasColorScheme: true,
    christmasCoverDecoration: true,
    christmasHat: true,
    readingTimeSnow: true,
  },
  snowfall: {
    speed: 0.5,
    intensity: 0.7,
    mobileIntensity: 0.4,
    maxLayers: 6,
    maxIterations: 8,
    mobileMaxLayers: 4,
    mobileMaxIterations: 6,
  },
};

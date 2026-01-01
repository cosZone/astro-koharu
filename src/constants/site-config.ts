type SiteConfig = {
  title: string; // 网站标题名称（banner 上）
  alternate?: string; // 网站英文短名
  subtitle?: string; // 副标题
  name: string; // 站点作者
  description?: string; // 站点简介（一段话）
  avatar?: string; // 站点头像 logo.png or url
  showLogo?: boolean; // 是否显示 logo，否则用 alternate 当·logo
  author?: string; // 文章作者
  // theme
  site: string; // 站点线上域名 用于 RSS 生成等
  startYear?: number; // 站点创建年份
  keywords?: string[]; // 站点关键词 SEO
  featuredCategories?: {
    link: string;
    image: string;
    label?: string;
    description?: string;
  }[];

  // 首页特殊系列配置
  featuredSeries?: {
    categoryName: string; // 分类名（如 '周刊'）
    label?: string; // 显示名称（如 '前端周刊'）
    enabled?: boolean; // 是否启用，默认 true
    // 周刊详细信息
    fullName?: string; // 完整名称
    description?: string; // 描述
    cover?: string; // 封面图
    links?: {
      github?: string; // GitHub 仓库
      rss?: string; // RSS 订阅链接
      chrome?: string; // Chrome 商店链接
      docs?: string; // 文档链接
    };
  };
};

// 社交媒体配置类型
type SocialPlatform = {
  url: string;
  icon: string;
  color: string; // default bg-primary/20
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

// TODO: change to backend

// https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/config/
export const siteConfig: SiteConfig = {
  title: '余弦の博客', // 网站名称
  alternate: 'cosine', // 网站名称
  subtitle: 'WA 的一声就哭了', // 副标题
  name: 'cos',
  description: 'FE / ACG / 手工 / 深色模式强迫症 / INFP / 兴趣广泛养两只猫的老宅女 / remote', // 站点简介（一段话）
  avatar: '/img/avatar.webp', // 站点头像 logo.png or url
  showLogo: true, // 是否显示 logo 否则用 title
  author: 'cos', // 作者名称
  site: 'https://blog.cosine.ren/',
  startYear: 2020,
  keywords: ['cos', 'cosine', '博客', '个人空间', '技术', '前端'],
  featuredCategories: [
    {
      link: 'life',
      label: '随笔',
      image: '/img/cover/2.webp',
      description: '生活记录、年度总结等',
    },
    {
      link: 'note/front-end',
      label: '前端笔记',
      image: '/img/cover/1.webp',
      description: '前端相关的笔记',
    },
    {
      link: 'project',
      label: '项目集锦',
      image: '/img/cover/3.webp',
      description: '项目集锦',
    },
    {
      link: 'note',
      label: '笔记',
      image: '/img/cover/4.webp',
      description: '技术笔记、学习笔记等',
    },
    {
      link: 'tools',
      label: '工具',
      image: '/img/cover/11.webp',
      description: '工具使用、软件推荐等',
    },
    {
      link: 'coding-train',
      label: '题目记录',
      image: '/img/cover/6.webp',
      description: '曾经的刷题记录等',
    },
    {
      link: 'note/bytedance-note',
      label: '青训营笔记',
      image: '/img/cover/9.webp',
      description: '初学前端时的笔记',
    },
    {
      link: 'note/cs-basics',
      label: 'CS基础',
      image: '/img/cover/8.webp',
      description: '大学时期的 CS 基础笔记',
    },
  ],
  featuredSeries: {
    categoryName: '周刊',
    label: 'FE Bits',
    fullName: 'FE Bits 前端周周谈',
    description: `之前在自己的频道进行一些输出，于是有了这个周刊！

部分总结有使用我自己开发的 MoeCopy AI 浏览器插件，喜欢的话可以给个 star！

更新时间期望是在每周天`,
    cover: '/img/weekly_header.webp',
    enabled: true,
    links: {
      github: 'https://github.com/yusixian/fe-bits-weekly',
      rss: 'https://quaily.com/cosine/feed/atom',
      chrome: 'https://chromewebstore.google.com/detail/moe-copy-ai/dfmlcfckmfgabpgbaobgapdfmjiihnck',
      docs: 'https://moe.cosine.ren/docs',
    },
  },
};

// 社交媒体配置
// https://icon-sets.iconify.design/ri/
export const socialConfig: SocialConfig = {
  github: {
    url: 'https://github.com/yusixian',
    icon: 'ri:github-fill',
    color: '#191717',
  },
  // zhihu: {
  //   url: 'https://www.zhihu.com/people/qi-jiu-en',
  //   icon: 'ri:zhihu-fill',
  //   color: '#1e88e5',
  // },
  bilibili: {
    url: 'https://space.bilibili.com/10730895',
    icon: 'ri:bilibili-fill',
    color: '#da708a',
  },
  music: {
    url: 'https://music.163.com/#/user/home?id=361029804',
    icon: 'ri:netease-cloud-music-line',
    color: '#e60026',
  },
  email: {
    url: 'mailto:cosine_yu@qq.com',
    icon: 'ri:mail-line',
    color: '#55acd5',
  },
  twitter: {
    url: 'https://x.com/_cosine_x',
    icon: 'ri:twitter-fill',
    color: '#4b9ae4',
  },
  rss: {
    url: '/rss.xml',
    icon: 'ri:rss-line',
    color: '#ff6600',
  },
  // #google: https://plus.google.com/yourname || google
  // # about: https://about.me/amehime || address-card || "#3b5998"
  // #facebook: https://www.facebook.com/yourname || facebook
  // #stackoverflow: https://stackoverflow.com/yourname || stack-overflow
  // #youtube: https://youtube.com/yourname || youtube
  // #instagram: https://instagram.com/yourname || instagram
  // #skype: skype:yourname?call|chat || skype
  // #douban: https://www.douban.com/people/yourname/ || douban
  // # weibo: https://weibo.com/amehime || weibo || "#ea716e"
};

const { title, alternate, subtitle } = siteConfig;

export const seoConfig = {
  title: `${alternate ? `${alternate} = ` : ''}${title}${subtitle ? ` = ${subtitle}` : ''}`,
  description: siteConfig.description,
  keywords: siteConfig?.keywords?.join(',') ?? '',
  url: siteConfig.site,
};

export const defaultCoverList = Array.from({ length: 13 }, (_, index) => index + 1).map((item) => `/img/cover/${item}.webp`);

// 圣诞特效配置类型
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
    /** 桌面端最大层数，默认 4 */
    maxLayers: number;
    /** 桌面端每层最大迭代次数，默认 6 */
    maxIterations: number;
    /** 移动端最大层数，默认 2 */
    mobileMaxLayers: number;
    /** 移动端每层最大迭代次数，默认 3 */
    mobileMaxIterations: number;
  };
};

// 圣诞特效配置
export const christmasConfig: ChristmasConfig = {
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
    // 密度配置：层数 × 迭代次数 = 总迭代次数（原始值为 6×12=72）
    maxLayers: 6,
    maxIterations: 8,
    mobileMaxLayers: 4,
    mobileMaxIterations: 6,
  },
};

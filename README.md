# astro-koharu

"小春日和" 风格的 Astro 博客主题。

> "小春日和"（こはるびより）指的是晚秋到初冬这段时期，持续的一段似春天般温暖的晴天。也就是中文中的"小阳春"。

灵感来自 Hexo 的 Shoka 主题，用更现代的技术栈打造属于你的个人博客。

**[快速开始 →](./GETTING-STARTED.md)**

- 基于 **Astro**，静态输出，加载轻快
- 萌系 / 二次元 / 粉蓝配色，适合 ACG、前端、手账向个人站
- 支持多分类、多标签，但不会强迫你用复杂信息架构
- 尽可能的减少性能开销
- 使用 pagefind 实现无后端的全站搜索
- LQIP（低质量图片占位符），图片加载前显示渐变色占位

## 部署

### Vercel 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu&project-name=astro-koharu&repository-name=astro-koharu)

### 本地开发

1. 克隆项目到本地

```bash
git clone https://github.com/cosZone/astro-koharu
```

2. 进入项目目录并安装依赖

```bash
cd astro-koharu
pnpm i
```

3. 启动项目

```bash
pnpm dev
```

## 功能特性

- 基于 Astro 5.x，静态站点生成，性能优异
- 优雅的深色/浅色主题切换
- 基于 Pagefind 的无后端全站搜索
- 完整的 Markdown 增强功能（GFM、代码高亮、自动目录、Mermaid 图表、Infographic 信息图）
- 灵活的多级分类与标签系统
- [可开关] 特色周刊/系列文章支持
- 响应式设计
- 草稿与置顶功能
- 阅读进度条与阅读时间估算
- 智能目录导航，支持 CSS 计数器自动编号（可按文章关闭）
- 移动端文章阅读头部（显示当前章节标题、圆形阅读进度、可展开目录）
- 友链系统与归档页面
- RSS 订阅支持
- LQIP（低质量图片占位符）—— 图片加载前显示渐变色占位，提升视觉体验
- [可开关] 基于语义相似度的智能文章推荐系统，使用 [transformers.js](https://huggingface.co/docs/transformers.js) 在本地生成文章嵌入向量，计算文章间的语义相似度
- [可开关] AI 自动摘要生成，自动生成摘要。
- [可开关] 圣诞特辑 —— 包含雪花飘落、圣诞配色、圣诞帽装饰、灯串装饰等节日氛围效果
- 无后端站点公告系统 —— 配置文件管理公告，支持时间控制、多条公告堆叠、自定义颜色、时间线弹窗、hover 已读

## 文档

- **[快速开始](./GETTING-STARTED.md)** - 5 分钟启动你的博客
- **[完整使用指南](./src/content/blog/tools/astro-koharu-使用指南.md)** - 所有功能的详细配置和使用方法

## 🙏 鸣谢

使用字体[寒蝉全圆体](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular)

感谢以下项目对 astro-koharu 的开发提供的灵感及参考：

- [mx-space](https://github.com/mx-space)
- [Hexo 主题 Shoka](https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/)
- [waterwater.moe](https://github.com/lawvs/lawvs.github.io)
- [yfi.moe](https://github.com/yy4382/yfi.moe)
- [4ark.me](https://github.com/gd4Ark/gd4Ark.github.io)
- [纸鹿摸鱼处](https://blog.zhilu.site/)

...

# astro-koharu

**Language:** **中文** | [English](./docs/README.en.md) | [日本語](./docs/README.ja.md)

![](https://r2.cosine.ren/i/2026/01/94383107ba4586f773938ed4dae34ff1.webp)

一个萌系 / 二次元 / 粉蓝配色的博客主题，适合 ACG、前端、手账向个人站，性能优异。

> 命名灵感来源于 “小春日和”（こはるびより）指的是晚秋到初冬这段时期，持续的一段似春天般温暖的晴天。也就是中文中的"小阳春"。

博客整体设计灵感来自 Hexo 的 [Shoka](https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/) 主题，用更现代的技术栈打造属于你的个人博客。

本仓库已清理为示例仓库，主题开发者的博客可查看 https://blog.cosine.ren/ 喜欢的话欢迎 star ～

持续迭代中

- 基于 **Astro**，静态输出，加载轻快
- 萌系 / 二次元 / 粉蓝配色，适合 ACG、前端、手账向个人站
- 支持多分类、多标签，但不会强迫你用复杂信息架构
- 尽可能的减少性能开销
- 使用 pagefind 实现无后端的全站搜索
- LQIP（低质量图片占位符），图片加载前显示渐变色占位

![演示图1](https://r2.cosine.ren/i/2025/12/417b098dffce2ced9c0ff6009e5213df.gif)

[性能优异](https://pagespeed.web.dev/analysis/https-blog-cosine-ren/w6qzrwbp9b?hl=zh-cn&form_factor=desktop)：目标是 PC 的全绿，但是随着功能迭代不可避免的需要反复检查！

![性能优化](https://r2.cosine.ren/i/2025/12/e93f40c340a626c4ab72212a84cf6d5d.webp)

可在此进行博客的[反馈](https://cos.featurebase.app/)以及查看 Roadmap，当然更欢迎在 issue 区域提 issue，不过这毕竟是个人项目，喜欢的也欢迎 fork 出去改。

![](https://r2.cosine.ren/i/2026/01/f1c239b4adf7771f10b954c389d87a74.webp)
![](https://r2.cosine.ren/i/2026/01/c962f82503abf68eb1f21b835873f241.webp)

## 部署

支持 **Vercel**、**Netlify** 等主流平台自动部署，会根据环境自动选择适配器，未识别平台则使用 Node.js 保底适配器（适合 Docker 或自托管）。

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu&project-name=astro-koharu&repository-name=astro-koharu)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/cosZone/astro-koharu)

### Docker 部署

也可以通过 docker / docker-compose 运行一个带 Nginx 的容器：

1. 编辑 `config/site.yaml`，配置 `comment.remark42` 和 `analytics.umami` 部分。
2. 执行 `./docker/rebuild.sh`，脚本会自动停止旧容器并重新构建/启动。

> 想自定义环境文件位置或跳过 `docker compose down`，可在运行脚本时设置 `ENV_FILE=/path/to/.env` 或 `SKIP_DOWN=true`。

若需要手动运行 Compose，可在仓库根目录执行：

```bash
docker compose --env-file ./.env -f docker/docker-compose.yml up -d --build
```

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
- **可更换评论系统**：支持 Waline（推荐）、Giscus、Remark42 三种评论组件，配置文件一键切换，主题自动跟随
- 完整的 Markdown 增强功能（GFM、代码高亮、自动目录、Mermaid 图表、Infographic 信息图）
- **Shoka 兼容 Markdown 语法**：文字特效（下划线/高亮/上下标/颜色）、隐藏文字（Spoiler）、注音标注（Ruby）、提醒块、折叠块、标签卡、友链卡片、音视频播放器、练习题系统（单选/多选/判断/填空）、数学公式（KaTeX）、代码块增强（title/mark/command）—— 所有功能均可独立开关
- [可开关] **内容加密**：支持文章局部加密（加密块）和整篇文章加密（加密文章），使用 AES-256-GCM 客户端解密，密码仅在构建时使用、不传递到客户端
- 灵活的多级分类与标签系统
- [可开关] 多系列文章支持（周刊、书摘等自定义系列，支持自定义 URL slug）
  > 💡 **说明**：featuredSeries 适合文章数量较多的分类，将其从首页主列表分离以避免刷屏。系列文章仅最新一篇在首页高亮，其余通过系列专属页面访问，但在归档、分类、标签等页面仍正常展示。
- [可开关] **追番页面（Bangumi）**：接入 [Bangumi API](https://bgm.tv)，展示动画/书籍/音乐/游戏收藏，支持分类切换、状态筛选、分页浏览，数据实时获取
- **独立页面系统**：在 `src/pages/` 下创建 `.md` 文件即可添加自定义页面（关于、歌单等），支持自定义封面标题和评论开关
- 响应式设计
- 草稿与置顶功能
- 阅读进度条与阅读时间估算
- 智能目录导航，支持 CSS 计数器自动编号（可按文章关闭）
- 移动端文章阅读头部（显示当前章节标题、圆形阅读进度、可展开目录）
- 友链系统与归档页面
- **多语言支持（i18n）**：内置中英文 UI 翻译，支持自定义语言包、内容级翻译（分类名/系列名）、语言切换器、hreflang SEO 标签、locale-aware RSS 订阅。默认语言 URL 无前缀，其他语言自动加前缀（如 `/en/post/xxx`）
- RSS 订阅支持
- 支持 LQIP：图片加载前显示渐变色占位，提升视觉体验
- [可开关] 基于语义相似度的智能文章推荐系统，使用 [transformers.js](https://huggingface.co/docs/transformers.js) 在本地生成文章嵌入向量，计算文章间的语义相似度
- [可开关] AI 自动摘要生成，自动生成摘要。
- [可开关] 圣诞特辑：包含雪花飘落、圣诞配色、圣诞帽装饰、灯串装饰等节日氛围效果
- 无后端站点公告系统：可通过配置文件管理公告，支持时间控制、多条公告堆叠、自定义颜色、hover 已读
- 有样式的 [RSS](https://blog.cosine.ren/rss.xml) 订阅源链接
- **Koharu CLI**：交互式命令行工具，支持备份/还原、内容生成、备份管理
- **本地轻 CMS 应用**：运行 `pnpm cms` 启动独立的 CMS 管理界面，支持文章管理、浏览器内编辑、Markdown 预览等功能。文章页的编辑按钮支持一键跳转到本地编辑器（VS Code / Cursor / Zed），配置见 `config/site.yaml` 的 `dev` 部分。(后期会考虑做个有后端的版本，这期先静态)

## Koharu CLI

博客自带交互式 CLI 工具，方便管理博客内容：

```bash
pnpm koharu              # 交互式主菜单
pnpm koharu new          # 新建内容（文章/友链）
pnpm koharu backup       # 备份博客内容和配置
pnpm koharu restore      # 从备份恢复
pnpm koharu update       # 更新主题
pnpm koharu generate     # 生成内容资产 (LQIP, 相似度, AI 摘要)
pnpm koharu clean        # 清理旧备份
pnpm koharu list         # 查看所有备份
```

### 新建内容

快速创建博客文章和友链：

```bash
# 交互式选择创建类型
pnpm koharu new

# 或直接指定类型
pnpm koharu new post     # 新建博客文章（交互式输入标题、分类、标签等）
pnpm koharu new friend   # 新建友情链接（自动追加到 config/site.yaml）
```

**新建文章功能**：

- 自动生成拼音 slug
- 选择已有分类
- 支持多标签
- 检查文件重复
- 自动创建 frontmatter

**新建友链功能**：

- 交互式输入友站信息
- 自动追加到配置文件
- 保留 YAML 格式和注释

### 备份与还原

更新主题前，使用 CLI 备份你的个人内容：

```bash
# 基础备份（博客文章、配置、头像、.env）
pnpm koharu backup

# 完整备份（包含所有图片和生成的资产）
pnpm koharu backup --full

# 还原最新备份
pnpm koharu restore --latest

# 预览将要还原的文件（不实际还原）
pnpm koharu restore --dry-run
```

### 更新主题

使用 CLI 自动更新主题（会自动备份 → 拉取 → 合并 → 安装依赖）：

```bash
# 完整更新流程（默认会先备份）
pnpm koharu update

# 仅检查更新
pnpm koharu update --check

# 跳过备份直接更新
pnpm koharu update --skip-backup

# 更新到指定版本
pnpm koharu update --tag v2.1.0

# clean 模式（零冲突，强制备份，适合首次迁移或冲突较多时）
pnpm koharu update --clean

# rebase 模式（重写历史，强制备份，适合熟悉 git 的用户）
pnpm koharu update --rebase

# 预览操作（不实际执行）
pnpm koharu update --dry-run
```

> **💡 更新模式说明：**
>
> - **默认模式**：使用 `git merge --no-ff` 合并上游更新，保留 merge-base 信息。遇到用户内容（博客文章、配置等）冲突时自动保留本地版本，仅主题文件冲突需手动解决。
> - **Clean 模式** (`--clean`)：用上游最新版本替换所有主题文件，然后从备份还原用户内容，实现零冲突更新。适合首次从旧版迁移或冲突较多时使用。**注意：用户对主题文件的自定义修改不会被保留。**
> - **Rebase 模式** (`--rebase`)：将本地提交重放到上游之上，重写提交历史。适合熟悉 git 的用户。
>
> CLI 更新命令是对 git 操作的封装，熟悉 git 的用户也可以直接使用 `git merge`/`git rebase` 手动操作。

### 内容生成

```bash
# 交互式选择生成类型
pnpm koharu generate

# 或直接指定类型
pnpm koharu generate lqips        # 生成 LQIP 图片占位符
pnpm koharu generate similarities # 生成相似度向量
pnpm koharu generate summaries    # 生成 AI 摘要
pnpm koharu generate all          # 生成全部
```

## 构建缓存

项目将 `.cache/og-data.json` 提交到 Git 仓库，用于缓存链接嵌入功能抓取的 OG 元数据（标题、描述、图片等）。这样在 Vercel、Netlify 等平台构建时可以直接复用已有缓存，避免每次构建都重新抓取外部链接的元信息，显著加速构建并减少对外部站点的请求。

`.cache/` 目录下的其他文件（如 transformers 模型缓存）仍被 `.gitignore` 忽略。

## 配置说明

博客配置统一使用 **`config/site.yaml`** 文件管理，包括：

- 站点基本信息（标题、副标题、作者等）
- 社交媒体链接
- 导航菜单
- 特色分类和周刊配置
- 分类映射（中文分类名 → URL slug）
- 友链列表
- 公告系统
- **评论系统**（Waline / Giscus / Remark42，推荐使用 Waline）
- 数据统计（Umami）
- **国际化配置（i18n）**
- **追番页面（Bangumi）**：配置 `bangumi.userId` 即可开启，注释掉整段关闭
- 圣诞特辑开关
- 开发工具配置（`config/site.yaml` 的 `dev` 部分，用于本地编辑器跳转）

详细配置说明请参考文档。

### 多语言配置（i18n）

在 `config/site.yaml` 的 `i18n` 部分配置支持的语言：

```yaml
i18n:
  defaultLocale: zh # 默认语言（URL 无前缀）
  locales:
    - code: zh
      label: 中文
    - code: en
      label: English
```

**内容翻译**：在 `config/i18n-content.yaml` 中配置分类名、系列名等内容级字符串的翻译：

```yaml
en:
  categories:
    life: Life
    note: Notes
    tools: Tools
  series:
    weekly:
      label: My Weekly
      fullName: My Tech Weekly
```

**添加翻译文章**：将翻译文章放在 `src/content/blog/<locale>/` 目录下，保持与默认语言相同的路径结构：

```plain
src/content/blog/
├── tools/getting-started.md        # 默认语言 (zh)
├── en/tools/getting-started.md     # 英文翻译
└── en/life/hello-world.md          # 英文翻译
```

没有对应翻译的文章会自动回退显示默认语言内容，并标注提示。

**添加新语言**：

1. 在 `config/site.yaml` 的 `i18n.locales` 中添加新语言
2. 创建 `src/i18n/translations/<code>.ts`，按需翻译 UI 字符串（未翻译的 key 会回退到默认语言）
3. 在 `src/i18n/translations/index.ts` 中注册新语言
4. 在 `config/i18n-content.yaml` 中添加内容翻译（可选）

### 评论系统切换

在 `config/site.yaml` 中通过 `comment.provider` 字段一键切换评论系统：

```yaml
comment:
  provider: waline # 'waline' | 'giscus' | 'remark42' | 'none'
  waline:
    serverURL: https://your-waline-server.vercel.app
    # ... 其他配置
```

**推荐使用 Waline**：自部署简单、功能丰富（Markdown、表情、邮件通知）、带访问量统计。详细配置请参考[完整使用指南](/src/content/blog/tools/astro-koharu-guide.md#如何添加评论功能)。

## 文档

- **[快速开始](./GETTING-STARTED.md)** - 启动你的博客
- **[更新主题](./GETTING-STARTED.md#7-更新主题)** - 如何安全地更新到新版本
- **[完整使用指南](./src/content/blog/tools/astro-koharu-guide.md)** - 所有功能的详细配置和使用方法

## 特色功能演示图片

- 图片加载前显示渐变色占位，提升视觉体验 - [介绍文章](https://blog.cosine.ren/post/astro-lqip-implementation)
  ![LQIP](https://r2.cosine.ren/i/2025/12/40e44c8ac166183d5f823d7aa81fa792.webp)
- 使用 view-transition 实现的流畅的深色模式切换主题过渡动画。
  ![主题过渡动画](https://r2.cosine.ren/i/2025/12/418c7602ce115660bed9db66739370d5.gif)
- Markdown 增强 - 链接嵌入功能 - [示例](https://blog.cosine.ren/post/my-claude-code-record-2)
  ![链接嵌入功能](https://r2.cosine.ren/i/2026/01/6804aa167fd4cf7022a9b511d52017ce.webp)
- Markdown 增强 - 使用 [@antv/infographic](https://github.com/antvis/Infographic) 创建各种精美的信息图表。
  [Infographic 信息图指南](https://koharu.cosine.ren/post/infographic-guide)
  ![信息图语法](https://r2.cosine.ren/i/2026/01/581893e18557bcb837177cb2d6fb7af7.webp)
- 有样式的 RSS 订阅源链接 - [示例](https://blog.cosine.ren/rss.xml)
  ![RSS 订阅源链接](https://r2.cosine.ren/i/2026/01/4476f67d1acea2e0991cc70d1d3cf6a1.webp)
- 公告系统
  ![公告系统](https://r2.cosine.ren/i/2026/01/a4660955f52438b3cc2d21bdc931bbd4.gif)
- Shoka 兼容 Markdown 语法 - 提醒块、折叠块、标签卡、文字特效、隐藏文字、注音标注、练习题等
- 音视频播放器 - 支持网易云音乐歌单和视频播放

## 使用本主题的博客

> 学习[纸鹿的博客](https://github.com/L33Z22L11/blog-v3)，我也弄一个放谁在用我的主题的区域。\
> 欢迎加入 Q 群 598022684 进行讨论，或者在我的[前端频道](https://t.me/cosine_front_end)的评论区群聊讨论。

| 博客名称                                  | 作者       | 仓库                                                            | 特色功能 or 备注             |
| ----------------------------------------- | ---------- | --------------------------------------------------------------- | ---------------------------- |
| **[余弦の博客](http://blog.cosine.ren/)** | **cosine** | [cosZone/astro-koharu](https://github.com/cosZone/astro-koharu) | 本主题                       |
| [雪花的博客](https://xhblog.top/)         | XueHua-s   | [XueHua-s/astro-snow](https://github.com/XueHua-s/astro-snow)   | 精简了很多功能，增加了起始页 |

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

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=cosZone/astro-koharu&type=date&legend=top-left)](https://www.star-history.com/#cosZone/astro-koharu&type=date&legend=top-left)

## License

GNU Affero General Public License version 3 (AGPL-3.0)

---
title: Infographic 信息图指南
link: infographic-guide
catalog: true
date: 2026-01-03 12:00:00
description: 详细介绍如何在 Markdown 中使用 @antv/infographic 创建精美的信息图表，包含各种模板的实用示例
tags:
  - Infographic
  - 可视化
  - Markdown
categories:
  - 笔记
  - 前端
---

本文将详细介绍如何在 Markdown 中使用 [@antv/infographic](https://infographic.antv.vision/) 创建各种精美的信息图表。

## 什么是 Infographic

Infographic（信息图）是一种将数据、信息和知识以视觉化方式呈现的图表形式。相比传统的文字描述，信息图能够更直观、更有吸引力地传达信息。

在本博客中，你可以直接在 Markdown 代码块中使用 `infographic` 标记来创建各种类型的信息图，支持：

- 列表展示
- 流程说明
- 数据对比
- 层级结构
- 统计图表
- 象限分析
- 关系展示

## 基本语法

在代码块中使用 `infographic` 标记，第一行指定模板名称，然后使用类似 YAML 的语法定义数据：

````markdown
```infographic
infographic <template-name>
data
  title 标题
  desc 描述
  items
    - label 条目名称
      desc 条目描述
      icon mdi/icon-name
```
````

## 列表类模板 (list-\*)

适合展示信息列表、特性清单、技术栈等。

### 网格卡片布局

使用 `list-grid-badge-card` 模板展示卡片式列表：

```infographic
infographic list-grid-badge-card
data
  title 前端技术栈
  desc 现代化前端开发常用技术
  items
    - label TypeScript
      desc 类型安全的 JavaScript 超集
      icon mdi/language-typescript
    - label React
      desc 用于构建用户界面的 JavaScript 库
      icon mdi/react
    - label Astro
      desc 现代化静态站点生成器
      icon mdi/rocket-launch
    - label Tailwind CSS
      desc 实用优先的 CSS 框架
      icon mdi/tailwind
    - label Vite
      desc 下一代前端构建工具
      icon mdi/lightning-bolt
    - label Biome
      desc 一体化的 Web 工具链
      icon mdi/cog
```

### 糖果风格卡片

使用 `list-grid-candy-card-lite` 创建更有趣的卡片样式：

```infographic
infographic list-grid-candy-card-lite
data
  title 博客特色功能
  items
    - label 深色模式
      desc 优雅的主题切换
      icon mdi/theme-light-dark
    - label 全站搜索
      desc 基于 Pagefind 的无后端搜索
      icon mdi/magnify
    - label Markdown 增强
      desc 支持 GFM、Mermaid、Infographic
      icon mdi/markdown
    - label 智能推荐
      desc 基于语义相似度的文章推荐
      icon mdi/brain
```

### 水平箭头列表

使用 `list-row-horizontal-icon-arrow` 展示线性列表：

```infographic
infographic list-row-horizontal-icon-arrow
data
  title 开发流程
  items
    - label 需求分析
      icon mdi/clipboard-text
    - label 设计方案
      icon mdi/palette
    - label 编码实现
      icon mdi/code-tags
    - label 测试部署
      icon mdi/rocket-launch
```

## 流程/顺序类模板 (sequence-\*)

适合展示步骤、流程、时间线等有顺序关系的信息。

### 之字形步骤

使用 `sequence-zigzag-steps-underline-text` 展示流程步骤：

```infographic
infographic sequence-zigzag-steps-underline-text
data
  title 博客搭建流程
  items
    - label 选择框架
      desc 选择 Astro 作为静态站点生成器
    - label 设计主题
      desc 参考 Shoka 主题进行设计
    - label 开发功能
      desc 实现文章系统、搜索、评论等功能
    - label 部署上线
      desc 使用 Vercel 进行自动化部署
```

### 圆形流程

使用 `sequence-circular-simple` 展示循环流程：

```infographic
infographic sequence-circular-simple
data
  title PDCA 循环
  items
    - label Plan
      desc 制定计划
    - label Do
      desc 执行实施
    - label Check
      desc 检查验证
    - label Act
      desc 改进优化
```

### 垂直路线图

使用 `sequence-roadmap-vertical-simple` 展示时间线或路线图：

```infographic
infographic sequence-roadmap-vertical-simple
data
  title 项目里程碑
  items
    - label 2024 Q1
      desc 项目启动，完成基础架构
    - label 2024 Q2
      desc 实现核心功能，开始内容迁移
    - label 2024 Q3
      desc 优化性能，添加高级功能
    - label 2024 Q4
      desc 正式发布，持续优化
```

### 金字塔结构

使用 `sequence-pyramid-simple` 展示层级递进关系：

```infographic
infographic sequence-pyramid-simple
data
  title 马斯洛需求层次
  items
    - label 自我实现
    - label 尊重需求
    - label 社交需求
    - label 安全需求
    - label 生理需求
theme
  palette
    - #8b5cf6
    - #3b82f6
    - #06b6d4
    - #10b981
    - #f59e0b
```

## 对比类模板 (compare-\*)

适合展示二元对比、优缺点分析等。

### 水平二元对比

使用 `compare-binary-horizontal-simple-fold` 进行对比：

```infographic
infographic compare-binary-horizontal-simple-fold
data
  title SSR vs SSG
  items
    - label 服务端渲染 (SSR)
      children
        - label 实时生成
          desc 每次请求时渲染页面
        - label 动态内容
          desc 适合频繁更新的内容
        - label 服务器负载
          desc 需要服务器资源
    - label 静态生成 (SSG)
      children
        - label 构建时生成
          desc 提前生成所有页面
        - label 静态内容
          desc 适合内容相对稳定的场景
        - label CDN 友好
          desc 可以部署到 CDN 边缘节点
```

### SWOT 分析

使用 `compare-swot` 进行 SWOT 分析：

```infographic
infographic compare-swot
data
  title 技术博客 SWOT 分析
  items
    - label 优势 (Strengths)
      children
        - label 技术积累
        - label 个人品牌
        - label 知识沉淀
    - label 劣势 (Weaknesses)
      children
        - label 时间投入
        - label 持续更新压力
        - label 初期流量低
    - label 机会 (Opportunities)
      children
        - label 技术社区活跃
        - label 开源生态发展
        - label 个人成长空间
    - label 威胁 (Threats)
      children
        - label 内容同质化
        - label 平台竞争
        - label 技术快速迭代
```

## 层级类模板 (hierarchy-\*)

适合展示组织结构、分类体系等树形关系。

### 系统分层结构

使用 `hierarchy-structure` 展示多层架构，非常适合展示系统架构、模块分层：

```infographic
infographic hierarchy-structure
data
  title 系统分层结构
  desc 展示不同层级的模块与功能分组
  items
    - label 展现层
      children
        - label 小程序
        - label APP
        - label PAD
        - label 客户端
        - label WEB
    - label 应用层
      children
        - label 核心模块
          children
            - label 功能1
            - label 功能2
            - label 功能3
            - label 功能4
            - label 功能5
            - label 功能6
        - label 基础模块
          children
            - label 功能1
            - label 功能2
            - label 功能3
            - label 功能4
            - label 功能5
            - label 功能6
        - label 其他模块
          children
            - label 功能1
            - label 功能2
            - label 功能3
            - label 功能4
            - label 功能5
            - label 功能6
    - label 平台层
      children
        - label 模块1
          children
            - label 功能1
            - label 功能2
            - label 功能3
            - label 功能4
        - label 模块2
          children
            - label 功能1
            - label 功能2
            - label 功能3
            - label 功能4
        - label 模块3
          children
            - label 功能1
            - label 功能2
            - label 功能3
            - label 功能4
```

### 科技风格树形图

使用 `hierarchy-tree-tech-style-capsule-item` 展示层级结构：

```infographic
infographic hierarchy-tree-tech-style-capsule-item
data
  title 前端技术体系
  items
    - label 前端开发
      children
        - label 基础技术
          children
            - label HTML
            - label CSS
            - label JavaScript
        - label 框架/库
          children
            - label React
            - label Vue
            - label Astro
        - label 工程化
          children
            - label Vite
            - label Webpack
            - label Rollup
```

### 圆角矩形树形图

使用 `hierarchy-tree-curved-line-rounded-rect-node` 展示层级：

```infographic
infographic hierarchy-tree-curved-line-rounded-rect-node
data
  title 博客内容分类
  items
    - label 技术文章
      children
        - label 前端
          children
            - label React
            - label TypeScript
        - label 后端
          children
            - label Node.js
            - label 数据库
    - label 生活随笔
      children
        - label 年度总结
        - label 读书笔记
```

## 图表类模板 (chart-\*)

适合展示统计数据、数值对比等。

### 柱状图

使用 `chart-column-simple` 展示数据对比：

```infographic
infographic chart-column-simple
data
  title 月度文章发布统计
  items
    - label 1月
      value 5
    - label 2月
      value 8
    - label 3月
      value 12
    - label 4月
      value 6
    - label 5月
      value 10
    - label 6月
      value 15
```

### 条形图

使用 `chart-bar-plain-text` 展示横向对比：

```infographic
infographic chart-bar-plain-text
data
  title 编程语言使用占比
  items
    - label TypeScript
      value 45
    - label JavaScript
      value 25
    - label Python
      value 15
    - label Go
      value 10
    - label Others
      value 5
```

### 饼图

使用 `chart-pie-plain-text` 展示占比分布：

```infographic
infographic chart-pie-plain-text
data
  title 访问来源分布
  items
    - label 搜索引擎
      value 45
    - label 社交媒体
      value 30
    - label 直接访问
      value 15
    - label 外部链接
      value 10
```

### 环形图

使用 `chart-pie-donut-pill-badge` 创建环形图：

```infographic
infographic chart-pie-donut-pill-badge
data
  title 技术栈占比
  items
    - label 前端
      value 50
    - label 后端
      value 30
    - label DevOps
      value 20
```

### 折线图

使用 `chart-line-plain-text` 展示趋势：

```infographic
infographic chart-line-plain-text
data
  title 博客访问量趋势
  items
    - label 第1周
      value 100
    - label 第2周
      value 150
    - label 第3周
      value 200
    - label 第4周
      value 280
    - label 第5周
      value 350
    - label 第6周
      value 420
```

## 象限分析 (quadrant-\*)

适合展示四象限分析、优先级矩阵等。

### 简单卡片象限

使用 `quadrant-quarter-simple-card` 进行象限分析：

```infographic
infographic quadrant-quarter-simple-card
data
  title 四象限分析
  items
    - label 重要且紧急
      desc 直接规避风险
      illus notify
    - label 重要不紧急
      desc 采取风险控制措施
      illus coffee
    - label 不重要但紧急
      desc 通过保险转移风险
      illus diary
    - label 不重要不紧急
      desc 选择接受风险
      illus invest
```

## 关系图 (relation-\*)

适合展示元素间的关联关系。

### 圆形图标关系

使用 `relation-circle-icon-badge` 展示关系网络：

```infographic
infographic relation-circle-circular-progress
data
  title 子公司盈利分析
  desc 各子公司财务表现，盈利同比增长
  items
    - label 云计算子公司
      value 25
      desc 年度净利润率达25%，成为集团核心增长引擎
      icon mingcute/cardano-ada-fill
    - label 人工智能子公司
      value 40
      desc AI业务快速扩张，盈利同比增长40%
      icon mingcute/openai-fill
    - label 物联网子公司
      value 1000
      desc IoT设备出货量突破千万，盈利稳步提升
      icon mingcute/medium-fill
    - label 金融科技子公司
      value 18
      desc 数字支付业务增长迅猛，净利润率18%
      icon mingcute/paypal-fill
    - label 新能源子公司
      value 50
      desc 绿色能源项目实现规模化盈利，增长潜力巨大
      icon mingcute/drone-fill
```

## 主题定制

可以通过 `theme` 块自定义颜色方案：

```infographic
infographic list-grid-badge-card
data
  title 自定义配色示例
  items
    - label 主色调
      desc 品牌主色
    - label 辅助色
      desc 强调色彩
    - label 中性色
      desc 背景文字
theme
  palette
    - #3b82f6
    - #8b5cf6
    - #f97316
    - #06b6d4
    - #10b981
```

## 实用技巧

### 1. 选择合适的模板

根据要展示的信息类型选择对应的模板：

- **列表信息** → `list-*`
- **流程步骤** → `sequence-*`
- **数据对比** → `compare-*` 或 `chart-*`
- **层级关系** → `hierarchy-*`
- **优先级分析** → `quadrant-*`
- **关联关系** → `relation-*`

### 2. 合理使用图标

使用 [Material Design Icons](https://pictogrammers.com/library/mdi/) 让信息图更生动：

```plain
icon mdi/rocket-launch
icon mdi/heart
icon mdi/lightbulb
icon mdi/chart-line
```

### 3. 控制信息密度

- 每个信息图不要包含过多条目（建议 3-8 个）
- 使用简洁的标签和描述
- 复杂信息可以拆分成多个信息图

### 4. 注意主题适配

信息图会自动跟随博客的深色/浅色主题切换，无需额外配置。

## 总结

Infographic 为 Markdown 文档提供了强大的可视化能力，能够让技术博客、文档、笔记更加生动易读。合理使用各种模板，可以显著提升内容的表现力和可读性。

更多模板和详细文档，请访问 [Infographic 官方网站](https://infographic.antv.vision/)。

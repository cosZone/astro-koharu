---
name: blog-writer
description: 帮助用户按照 astro-koharu 博客的规范创建新博文。自动生成正确的 frontmatter 结构、选择合适的分类路径，并提供 Markdown 内容框架建议。使用场景：写一篇博文、创建新文章、写文章、写博客、new post、create blog post。
---

# Blog Writer Skill

帮助用户按照 astro-koharu 博客的规范创建新博文。

## 你的任务

当用户请求创建新博文时：

1. **收集必要信息**（如果用户未提供）：
   - 文章标题
   - 文章分类（从下面的分类列表中选择）
   - 文章主题/关键词（用于生成标签和描述）

2. **生成 frontmatter**：
   ```yaml
   ---
   title: [文章标题]
   link: [URL slug，使用英文短横线分隔]
   catalog: true
   date: [当前日期时间，格式：YYYY-MM-DD HH:mm:ss]
   description: [一句话描述文章内容，50-100字]
   tags:
     - [相关标签1]
     - [相关标签2]
     - [相关标签3]
   categories:
     - [一级分类, 二级分类]
   ---
   ```

   **分类格式说明**：
   - 嵌套分类使用数组格式：`- [一级分类, 二级分类]`
   - 例如：`- [笔记, 前端]` 会创建 URL `/categories/note/front-end` 和面包屑 "笔记 → 前端"
   - 单个分类直接写分类名：`categories: 随笔`

3. **确定文件路径**：
   - 基础路径：`src/content/blog/`
   - 根据分类生成对应的子目录结构
   - 文件名：使用 `link` 字段值 + `.md` 扩展名

4. **生成 Markdown 内容框架**：
   - 提供文章结构建议（引言、正文章节、总结等）
   - 如果适合，建议使用 infographic 信息图
   - 提供代码示例占位符（如果是技术文章）

## 分类系统

### 一级分类及其子分类

1. **笔记 (note/)**
   - 前端 (front-end/)
     - React
     - Vue
     - TypeScript
     - CSS
     - 性能优化
   - 后端 (back-end/) - 如果需要使用，确保已在 `_config.yml` 中添加映射
   - 其他新增子分类 - 需要先在 `_config.yml` 添加映射

2. **工具 (tools/)**
   - 开发工具
   - 效率工具
   - 使用指南

3. **随笔 (life/)**
   - 生活随笔
   - 年度总结
   - 读书笔记

4. **周刊 (weekly/)**
   - 技术周刊
   - 每周分享

### 分类映射规则

**YAML 格式（重要）**：
```yaml
# 嵌套分类（推荐）- 使用数组包裹
categories:
  - [笔记, 前端]

# 单个分类 - 直接写分类名
categories: 随笔
```

**URL 和路径映射**：
- `categories: 随笔` → URL: `/categories/life` → 文件路径: `src/content/blog/life/`
- `categories: - [笔记, 前端]` → URL: `/categories/note/front-end` → 文件路径: `src/content/blog/note/front-end/`
- `categories: - [笔记, 前端, CSS]` → URL: `/categories/note/front-end` → 文件路径: `src/content/blog/note/front-end/`（三级分类作为标签）

**注意**：
- 嵌套分类必须使用 `- [一级, 二级]` 格式
- 分类名称（中文）会映射到 URL slug（英文），映射关系见上方分类列表

### 新增分类

如果用户需要创建上述分类之外的新分类，需要：

1. **更新 `_config.yml`**：
   ```yaml
   category_map:
     # 一级分类
     随笔: life
     笔记: note
     工具: tools
     周刊: weekly

     # 二级分类
     前端: front-end
     后端: back-end  # 新增示例

     # 添加新分类映射
     新分类名: new-category-slug
   ```

2. **创建对应目录**：
   - 在 `src/content/blog/` 下创建对应的目录结构
   - 例如：新增"后端"分类需要创建 `src/content/blog/note/back-end/`

3. **提醒用户**：
   - 告知用户已添加新分类映射到 `_config.yml`
   - 说明新分类的 URL 路径

## 文件命名规范

- 使用英文小写字母
- 单词间用短横线 `-` 分隔
- 避免特殊字符
- 例如：`react-hooks-guide.md`, `astro-blog-setup.md`

## 内容建议

### 技术文章结构

```markdown
## 背景/问题

[描述要解决的问题或技术背景]

## 解决方案

[详细说明解决方法]

### 关键技术点1

[技术细节和代码示例]

### 关键技术点2

[技术细节和代码示例]

## 实践效果

[实际应用效果、性能对比等]

## 总结

[总结要点和经验]
```

### 工具/指南类文章结构

```markdown
## 简介

[工具/方法简介]

## 安装/准备

[安装步骤或前置条件]

## 基本使用

[基础用法和示例]

## 高级功能

[进阶功能和技巧]

## 实用技巧

[最佳实践和注意事项]

## 总结

[总结和资源链接]
```

### 随笔类文章结构

```markdown
## 引言

[开场白，引出话题]

## 正文

[多个段落展开论述]

## 感悟/总结

[个人思考和总结]
```

## Infographic 使用建议

根据文章类型，建议使用信息图的场景：

- **列表信息**（技术栈、功能特性）→ `list-grid-badge-card`
- **流程步骤**（安装步骤、开发流程）→ `sequence-zigzag-steps-underline-text`
- **对比分析**（技术对比、优缺点）→ `compare-binary-horizontal-simple-fold`
- **统计数据**（性能对比、用量统计）→ `chart-column-simple` 或 `chart-bar-plain-text`
- **层级结构**（目录结构、知识体系）→ `hierarchy-tree-tech-style-capsule-item`

## 最后步骤

创建完博文后：

1. **如果添加了新分类**：
   - 确认已更新 `_config.yml` 中的 `category_map`
   - 确认已创建对应的目录结构
   - 告知用户新分类的 URL 路径

2. **运行检查**：
   - 运行 `pnpm dev` 在本地预览
   - 运行 `pnpm lint:fix` 检查格式

3. **后续建议**：
   - 提醒用户可以使用 infographic skills 添加信息图
   - 如果需要，提供相关文章推荐的建议（基于 tags）

## 示例对话

### 示例 1：使用现有分类

**用户**：写一篇关于 React Hooks 使用技巧的文章

**你应该**：

1. 确认分类：笔记 > 前端 > React
2. 生成文件路径：`src/content/blog/note/front-end/react-hooks-best-practices.md`
3. 创建包含完整 frontmatter 的文件（使用 `- [笔记, 前端]` 分类格式）
4. 提供文章结构框架
5. 建议在"常用 Hooks 对比"部分使用 `list-grid-badge-card` 信息图
6. 建议在"Hooks 使用流程"部分使用 `sequence-zigzag-steps-underline-text` 信息图

### 示例 2：需要新增分类

**用户**：写一篇关于 Node.js 后端开发的文章

**你应该**：

1. 发现"后端"分类不在现有分类列表中
2. 询问用户是否要添加"后端"分类
3. 如果用户同意：
   - 更新 `_config.yml`，添加 `后端: back-end`
   - 创建目录 `src/content/blog/note/back-end/`
   - 生成文章文件 `src/content/blog/note/back-end/nodejs-development.md`
   - frontmatter 使用 `- [笔记, 后端]` 分类格式
4. 告知用户：
   - 新分类已添加到 `_config.yml`
   - URL 路径为 `/categories/note/back-end`
   - 已创建对应目录结构

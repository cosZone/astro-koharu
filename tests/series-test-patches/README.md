# 多系列功能测试指南

本文档介绍如何使用 patch 文件测试多系列功能的各种场景。

## 前置准备

```bash
# 确保工作区干净
git status

# 如果有未提交的更改，先暂存
git stash
```

---

## 测试 1：添加第二个系列（书摘）

**目的**：验证多系列功能正常工作

### 应用 Patch

```bash
git apply tests/series-test-patches/01-add-reading-series.patch
```

### 变更内容

- `config/site.yaml`：
  - categoryMap 添加 `书摘: reading`
  - featuredSeries 添加第二个系列配置
  - navigation 添加「书摘」导航项
- 新建测试文章 `src/content/blog/reading/test-book.md`

### 验证步骤

1. 启动开发服务器
   ```bash
   pnpm dev
   ```

2. 检查以下页面：
   - [ ] 首页：应显示「书摘」系列的最新文章高亮卡片
   - [ ] `/reading`：系列页面正常显示，有测试文章
   - [ ] 导航栏：应出现「书摘」菜单项
   - [ ] `/weekly`：周刊页面仍正常工作

3. 构建测试
   ```bash
   pnpm build
   ```
   应无错误完成构建。

### 还原

```bash
git checkout -- .
rm -rf src/content/blog/reading  # 删除新建的测试文章目录
```

---

## 测试 2：禁用周刊系列

**目的**：验证 `enabled: false` 能正确禁用系列

### 应用 Patch

```bash
git apply tests/series-test-patches/02-disable-weekly.patch
```

### 变更内容

- `config/site.yaml`：将 weekly 系列的 `enabled: true` 改为 `enabled: false`

### 验证步骤

1. 启动开发服务器
   ```bash
   pnpm dev
   ```

2. 检查以下内容：
   - [ ] 首页：不应显示周刊系列的高亮卡片
   - [ ] `/weekly`：访问应返回 404 页面
   - [ ] 侧边栏：不应显示周刊入口

3. 构建测试
   ```bash
   pnpm build
   ```
   应无错误完成构建，且不生成 `/weekly` 相关页面。

### 还原

```bash
git checkout -- .
```

---

## 测试 3：保留路由冲突错误

**目的**：验证使用保留路由作为 slug 时会触发构建错误

### 应用 Patch

```bash
git apply tests/series-test-patches/03-test-reserved-slug-error.patch
```

### 变更内容

- `config/site.yaml`：将 slug 从 `weekly` 改为 `categories`（保留路由）

### 验证步骤

1. 尝试构建
   ```bash
   pnpm build
   ```

2. 预期结果：
   - [ ] 构建应该**失败**
   - [ ] 错误信息应提示 `categories` 是保留路由
   - [ ] 错误信息应列出所有保留路由名称

3. 开发模式也应报错
   ```bash
   pnpm dev
   ```
   - [ ] 启动时应显示配置错误警告

### 还原

```bash
git checkout -- .
```

---

## 测试 4：关闭首页高亮

**目的**：验证 `highlightOnHome: false` 能关闭首页高亮显示

### 应用 Patch

```bash
git apply tests/series-test-patches/04-test-highlight-off.patch
```

### 变更内容

- `config/site.yaml`：为 weekly 系列添加 `highlightOnHome: false`

### 验证步骤

1. 启动开发服务器
   ```bash
   pnpm dev
   ```

2. 检查以下内容：
   - [ ] 首页：**不应**显示周刊系列的高亮卡片
   - [ ] `/weekly`：系列页面仍正常工作
   - [ ] 导航栏：周刊菜单项仍存在

3. 构建测试
   ```bash
   pnpm build
   ```
   应无错误完成构建。

### 还原

```bash
git checkout -- .
```

---

## 组合测试（可选）

你也可以组合应用多个 patch 进行更复杂的测试：

```bash
# 同时启用书摘系列 + 关闭周刊首页高亮
git apply tests/series-test-patches/01-add-reading-series.patch
git apply tests/series-test-patches/04-test-highlight-off.patch

pnpm dev
# 验证：首页只显示书摘高亮，不显示周刊高亮

# 还原
git checkout -- .
rm -rf src/content/blog/reading
```

---

## 快速参考

| Patch | 测试场景 | 预期结果 |
|-------|---------|---------|
| `01-add-reading-series.patch` | 添加第二个系列 | 正常工作，两个系列并存 |
| `02-disable-weekly.patch` | 禁用系列 | 系列页面 404，首页无高亮 |
| `03-test-reserved-slug-error.patch` | 保留路由冲突 | 构建失败，报错提示 |
| `04-test-highlight-off.patch` | 关闭首页高亮 | 系列正常但首页无高亮卡片 |

---

## 测试完成后

```bash
# 确保所有更改已还原
git checkout -- .
rm -rf src/content/blog/reading  # 如果测试过 patch 01

# 恢复之前暂存的更改（如果有）
git stash pop
```

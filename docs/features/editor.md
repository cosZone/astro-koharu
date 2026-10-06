# 写作室

写作室默认关闭。先在 `config/site.yaml` 中设置：

```yaml
editor:
  enabled: true
```

修改后重启开发服务器或重新构建。关闭或省略 `editor` 配置时，写作室导航隐藏，也不会生成 `/editor/` 和 `/editor/preview/` 页面。使用下面的本地 CMS 编辑功能前，也需要开启写作室。

`/editor` 是公开的 Markdown 写作工具，在博客导航里可以进入。桌面采用源码与实时预览双栏，可调整宽度或切换专注模式；手机通过底部「编辑／预览」切换，工具栏可以横向滑动，语法手册和文章属性使用弹出面板。首版界面与语法说明为中文。源码编辑基于 CodeMirror 官方 `basicSetup` 和暗色主题，提供可见光标与选区、iOS 选区手柄、活动行和行列定位；手机工具栏也提供撤销和重做。

## 写作与导出

- 源码包含完整 YAML 属性和正文。复制、下载 MD 都导出完整原文，支持导入不超过 5 MiB 的 Markdown 文件。
- 草稿自动保存在当前浏览器的 localStorage，可以建立多篇、重新打开、删除；刷新会恢复最近的草稿。浏览器清理数据会删除这些草稿，请用下载保留长期备份。
- 「文章属性」会同步修改源码中的对应字段，并保留未知字段、YAML 注释及正文。复杂的嵌套分类和自定义字段可以直接编辑源码。
- 图片通过网址插入，首版没有本地图片上传。
- 复制先使用浏览器剪贴板，再尝试原生选区复制；权限受限时打开可见的完整原文面板，可全选、长按复制或下载，避免只显示无法操作的错误提示。

「语法手册」可以搜索、筛选并展开说明，查看参数、源码与实际效果，再将模板插入光标或选区。覆盖仓库现有 Markdown、Shoka 提醒块、折叠、标签卡、测验、加密、代码元信息、公式、Mermaid、Infographic、音视频和链接嵌入等语法。整篇加密的密码放在 YAML 中；浏览器草稿保存的是可继续编辑的原文，因此也包含该密码。

## 从文章打开

每篇未加密的文章都会额外生成原文地址 `<文章地址>.md`（如 `/post/note/foo.md`，非默认语言为 `/en/post/...`），内容是含 YAML 属性的完整源文件；加密文章和生产环境草稿不生成。文章页面包屑右侧的「复制 Markdown」按钮组读取这个地址，下拉菜单提供下载 .md 和「在写作室打开」，后者跳转到 `/editor/?from=<原文地址>`。各项开关见 `config/site.yaml` 的 `postActions`；`openInEditor` 还需要开启写作室。开发环境下，菜单里同时列出 `dev.editors` 配置的本地编辑器。

## 实际博客预览

预览复用博客现有的 Markdown 插件、样式与交互组件。「正文」用于写作，「完整文章」包含博客横幅、标题、时间、作者、标签、分类、摘要、目录及正文。预览不会生成评论区或访问统计。

预览在独立同源 iframe 内，180 ms 防抖；解析、代码高亮和加密在 Web Worker 中运行，只保留最新待渲染任务，丢弃过期结果。代码高亮语言、图表和嵌入按需加载；链接卡片请求去重、有并发和缓存上限。语法手册只加载当前展开项目的效果。危险 HTML 会在渲染与解密后的 DOM 边界净化；文章原文不因净化而改变。任意 JavaScript、HTML 表单和自定义样式不会在预览里执行。

符合博客规则的独立网址会实时抓取链接卡片，新网址无需先存在于博客构建缓存。点击「实时预览」旁的链接图标，可以填写自己或他人部署的公开预览实例；设置只保存在当前浏览器，所有草稿共用，也可恢复部署默认值。Tweet、CodePen 使用原有识别方式。网站拒绝抓取、需要登录或网络失败时显示可点击的降级链接。Vercel 部署自动包含同源 Node 抓取函数；其他静态托管需要接上轻量 [链接预览服务](./editor-link-service.md)，整个 Markdown 不会传给服务。

## CMS 保存

公开写作室与 CMS 共用同一个编辑器、语法手册和实际预览，旧 BlockNote 编辑器及其依赖已移除。只有从 CMS 打开的文件才显示「保存到博客」。公开页面以及直接打开本地 `/editor` 都只提供浏览器草稿、复制和下载。CMS 原有的新建文章入口仍然负责创建文件；本次不增加发布工作流。

开发时在两个终端运行：

```sh
pnpm dev
pnpm cms:install
pnpm cms
```

打开 `http://localhost:4322`，选择文章后会进入同一写作室。CMS 通过本地 API 读取、写入完整 UTF-8 原文，保存时比较打开时的原文；如文件被其他工具改过，会提示冲突，不覆盖外部修改。原文和对照原文分别上限 5 MiB。保存失败后仍可复制或下载当前编辑内容。CMS 内刷新写作室会恢复本次文件的浏览器草稿，并保留原来的冲突检查基线；返回列表重新打开文章才重新读取磁盘。新建、导入、切换或删除当前草稿会解除文件保存绑定。切换草稿前保留当前撤销历史，重新打开后可继续撤销；历史通过 CodeMirror 官方序列化存入 sessionStorage，只在原文一致时恢复。

博客开发端口若有变化，在启动 CMS 时设置实际地址：

```sh
VITE_BLOG_DEV_SERVER_URL=http://127.0.0.1:4325 pnpm cms
```

CMS 继续使用 4322，文件接口仅供本机 CMS 使用。不要把 `/api/cms/` 反代到公开博客。

## 验证命令

```sh
pnpm cms:install
pnpm test:editor
pnpm test:markdown
pnpm lint
pnpm check
pnpm build
pnpm --dir cms build
```

使用已经运行的服务器进行浏览器回归（不会另起服务）：

```sh
EDITOR_TEST_URL=http://localhost:4321 CMS_TEST_URL=http://localhost:4322 node tests/editor/workbench.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 node --import tsx tests/editor/decrypted-html.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 node --import tsx tests/editor/worker.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 node tests/editor/properties.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 node tests/editor/interactions.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 EDITOR_TEST_BROWSER=webkit node tests/editor/interactions.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 node --import tsx tests/editor/link-service.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 node tests/editor/mobile.browser.mjs
EDITOR_TEST_URL=http://localhost:4321 EDITOR_TEST_BROWSER=webkit node tests/editor/mobile.browser.mjs
```

不传 `CMS_TEST_URL` 只验证公开页；可以将 `EDITOR_TEST_URL` 指向生产静态预览，检查打包后的 Worker 与交互。CMS 浏览器测试创建并清理一篇临时测试文章。

Vercel 在静态页面之外自动部署 `api/editor/og.ts`；其他平台仍然可以静态托管 `/editor/` 与 `/editor/preview/`，可以为 `/api/editor/og` 追加同域反代，也可以填写已开放 CORS 的独立公开实例。部署示例和服务边界见链接预览服务文档。浏览器必须允许 JavaScript；剪贴板需要 HTTPS 或 localhost。移动端的软键盘与输入法仍需以实际设备表现为准。

完整 Shoka 示例随编辑器放在 `src/features/editor/shoka-example.md`，不依赖博客内容目录；删掉主题的示例博文后，写作室及其示例仍可构建和使用。

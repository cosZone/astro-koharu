/**
 * Chinese (zh) — Default locale UI strings
 *
 * This is the source-of-truth dictionary. All translation keys are defined here.
 * Other locale files only need to provide translations for keys they override.
 */

export const uiStrings = {
  // ── Navigation ──────────────────────────────────────────────
  'nav.home': '首页',
  'nav.posts': '文章',
  'nav.categories': '分类',
  'nav.tags': '标签',
  'nav.archives': '归档',
  'nav.friends': '友链',
  'nav.about': '关于',
  'nav.music': '歌单',
  'nav.weekly': '周刊',

  // ── Common ──────────────────────────────────────────────────
  'common.search': '搜索',
  'common.close': '关闭',
  'common.copy': '复制',
  'common.copied': '已复制',
  'common.loading': '加载中...',
  'common.noResults': '没有找到结果',
  'common.backToTop': '回到顶部',
  'common.darkMode': '深色模式',
  'common.lightMode': '浅色模式',
  'common.toggleTheme': '切换主题',
  'common.language': '语言',
  'common.toc': '目录',
  'common.expand': '展开',
  'common.collapse': '收起',
  'common.menuLabel': '{name}菜单',

  // ── Post ────────────────────────────────────────────────────
  'post.readMore': '阅读全文',
  'post.totalPosts': '共 {count} 篇文章',
  'post.stickyPosts': '置顶文章',
  'post.postList': '文章列表',
  'post.featuredCategories': '精选分类',
  'post.yearPosts': '{count} 篇文章',
  'post.readingTime': '{time} 分钟阅读',
  'post.wordCount': '{count} 字',
  'post.publishedAt': '发布于 {date}',
  'post.updatedAt': '更新于 {date}',
  'post.prevPost': '上一篇',
  'post.nextPost': '下一篇',
  'post.relatedPosts': '相关文章',
  'post.seriesNavigation': '系列导航',
  'post.seriesPrev': '上一篇',
  'post.seriesNext': '下一篇',
  'post.fallbackNotice': '本文暂无{lang}翻译，显示原文内容',
  'post.draft': '草稿',
  'post.pinned': '置顶',
  'post.noPostsFound': '暂无文章',

  // ── Categories & Tags ───────────────────────────────────────
  'category.allCategories': '所有分类',
  'category.postsInCategory': '{name} 分类下的文章',
  'category.totalCategories': '共 {count} 个分类',
  'category.categoryLabel': '分类',
  'tag.allTags': '所有标签',
  'tag.postsWithTag': '标签「{name}」下的文章',
  'tag.totalTags': '共 {count} 个标签',
  'tag.all': '全部',
  'tag.postCount': '{count} 篇文章',

  // ── Archives ────────────────────────────────────────────────
  'archives.title': '归档',
  'archives.totalPosts': '共 {count} 篇',

  // ── Search ──────────────────────────────────────────────────
  'search.placeholder': '请输入关键词搜索',
  'search.label': '搜索本站',
  'search.clear': '清空',
  'search.loadMore': '加载更多结果',
  'search.filters': '过滤器',
  'search.noResults': '没有找到结果',
  'search.manyResults': '[COUNT] 个结果',
  'search.oneResult': '[COUNT] 个结果',
  'search.altSearch': '没有找到结果。显示 [DIFFERENT_TERM] 的结果',
  'search.suggestion': '没有找到结果。尝试以下搜索：',
  'search.searching': '搜索 [SEARCH_TERM]...',
  'search.dialogTitle': '搜索文章',
  'search.dialogHint': '输入关键词搜索博客文章',
  'search.dialogClose': '关闭',
  'search.dialogSelect': '选择',
  'search.dialogOpen': '打开',

  // ── Friends ─────────────────────────────────────────────────
  'friends.title': '友情链接',
  'friends.applyTitle': '申请友链',
  'friends.siteName': '站点名称',
  'friends.siteUrl': '站点地址',
  'friends.ownerName': '昵称',
  'friends.siteDesc': '站点简介',
  'friends.avatarUrl': '头像链接',
  'friends.themeColor': '主题色',
  'friends.submit': '提交',
  'friends.copySuccess': '已复制到剪贴板',
  'friends.copyFail': '复制失败，请手动复制',
  'friends.generateFormat': '生成申请格式',
  'friends.copyFormat': '复制格式',
  'friends.sitePlaceholder': '我的博客',
  'friends.ownerPlaceholder': '您的昵称',
  'friends.urlPlaceholder': 'https://your-site.com',
  'friends.descPlaceholder': '一句话描述...',
  'friends.imagePlaceholder': 'https://...',
  'friends.previewTitle': '配置预览',
  'friends.copyConfig': '复制配置',
  'friends.copiedConfig': '已复制!',
  'friends.hint': '提示: 复制上方代码并在下方评论区粘贴发送即可，我会收到的～',

  // ── Code Block ──────────────────────────────────────────────
  'code.copy': '复制代码',
  'code.copied': '已复制！',
  'code.fullscreen': '全屏查看',
  'code.exitFullscreen': '退出全屏',
  'code.wrapLines': '自动换行',
  'code.viewSource': '查看源码',
  'code.viewRendered': '查看渲染结果',

  // ── Diagram / Infographic ───────────────────────────────────
  'diagram.fullscreen': '全屏查看',
  'diagram.exitFullscreen': '退出全屏',
  'diagram.viewSource': '查看源码',
  'diagram.zoomIn': '放大',
  'diagram.zoomOut': '缩小',
  'diagram.resetZoom': '重置缩放',
  'diagram.fitToScreen': '适应屏幕',
  'diagram.download': '下载图片',

  // ── Image Lightbox ──────────────────────────────────────────
  'image.zoomIn': '放大',
  'image.zoomOut': '缩小',
  'image.resetZoom': '重置',
  'image.resetZoomRotate': '重置缩放和旋转',
  'image.rotate': '旋转 90°',
  'image.close': '关闭',
  'image.prev': '上一张',
  'image.next': '下一张',
  'image.counter': '{current} / {total}',
  'image.hintDesktop': '双击放大 · 滚轮/双指缩放',
  'image.hintMobile': '双击放大 · 双指缩放',

  // ── Media Controls ──────────────────────────────────────────
  'media.play': '播放',
  'media.pause': '暂停',
  'media.mute': '静音',
  'media.unmute': '取消静音',
  'media.fullscreen': '全屏',
  'media.exitFullscreen': '退出全屏',
  'media.pictureInPicture': '画中画',
  'media.playbackSpeed': '播放速度',
  'media.download': '下载',
  'media.prevTrack': '上一曲',
  'media.nextTrack': '下一曲',
  'media.volume': '音量 {percent}%',
  'media.progress': '播放进度',
  'media.playModeOrder': '顺序播放',
  'media.playModeRandom': '随机播放',
  'media.playModeLoop': '单曲循环',

  // ── Footer ──────────────────────────────────────────────────
  'footer.poweredBy': '由 {name} 驱动',
  'footer.totalPosts': '{count} 篇文章',
  'footer.totalWords': '{count} 字',
  'footer.totalWordsTitle': '站点总字数',
  'footer.readingTimeTitle': '站点阅读时长',
  'footer.postCountTitle': '文章总数',
  'footer.runningDays': '已运行 {days} 天',
  'footer.wordUnit': '字',
  'footer.postUnit': '篇',

  // ── Pagination ──────────────────────────────────────────────
  'pagination.prev': '上一页',
  'pagination.next': '下一页',
  'pagination.page': '第 {page} 页',
  'pagination.currentPage': '第 {page} 页，当前页',
  'pagination.of': '共 {total} 页',

  // ── Breadcrumb ──────────────────────────────────────────────
  'breadcrumb.home': '首页',
  'breadcrumb.goToCategory': '前往{name}分类',

  // ── Floating Group ──────────────────────────────────────────
  'floating.backToTop': '回到顶部',
  'floating.scrollToBottom': '滚到底部',
  'floating.toggleTheme': '切换主题',
  'floating.christmas': '切换圣诞特效',
  'floating.bgm': '背景音乐',
  'floating.toggleToolbar': '展开/收起工具栏',

  // ── Announcement ────────────────────────────────────────────
  'announcement.title': '公告',
  'announcement.new': '新',
  'announcement.count': '{count} 条公告',
  'announcement.unreadCount': '{count} 条未读',
  'announcement.markAllRead': '全部已读',
  'announcement.dismiss': '关闭公告',
  'announcement.learnMore': '了解更多',
  'announcement.empty': '暂无公告',
  'announcement.emptyHint': '有新公告时会在这里显示',

  // ── Quiz ────────────────────────────────────────────────────
  'quiz.check': '检查答案',
  'quiz.correct': '回答正确！',
  'quiz.incorrect': '回答错误，请重试',
  'quiz.incorrectAnswer': '回答错误。正确答案是 {answer}。',
  'quiz.submitAnswer': '提交答案（已选 {count} 项）',
  'quiz.commonMistakes': '易错项：',
  'quiz.parseFailed': '题目解析失败',
  'quiz.showAnswer': '查看答案',
  'quiz.hideAnswer': '隐藏答案',
  'quiz.reset': '重置',
  'quiz.score': '得分：{score}/{total}',
  'quiz.completed': '全部完成！',
  'quiz.fillBlank': '填写答案...',
  'quiz.selectOption': '请选择一个选项',
  'quiz.single': '单选题',
  'quiz.multi': '多选题',
  'quiz.trueFalse': '判断题',
  'quiz.fill': '填空题',
  'quiz.optionTrue': '正确',
  'quiz.optionFalse': '错误',
  'quiz.clickToReveal': '点击查看答案',
  'quiz.quizOptions': '{type}选项',
  'quiz.trueFalseCorrect': '回答正确！',
  'quiz.trueFalseIncorrect': '回答错误。该命题是{answer}的。',

  // ── Encrypted Block ─────────────────────────────────────────
  'encrypted.locked': '内容已加密',
  'encrypted.placeholder': '请输入密码查看内容',
  'encrypted.submit': '解锁',
  'encrypted.incorrect': '密码错误',

  // ── Encrypted Post ─────────────────────────────────────────
  'encrypted.post.title': '此文章已加密',
  'encrypted.post.description': '请输入密码以查看文章内容',
  'encrypted.post.rssNotice': '此文章已加密，请在网页中查看',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': '页面未找到',
  'notFound.description': '你访问的页面不存在',
  'notFound.backHome': '返回首页',
  'notFound.browseArchives': '浏览归档',
  'notFound.message': '喵？页面被吃掉了~',

  // ── Category Stats ────────────────────────────────────────
  'category.subCategoryCount': '{count} 个子分类',
  'category.postCount': '{count} 篇文章',

  // ── Post Card ─────────────────────────────────────────────
  'post.readingTimeTooltip': '预计阅读时长: {time}',

  // ── Featured Series ─────────────────────────────────────────
  'series.latestPost': '最新文章',
  'series.viewAll': '查看全部',
  'series.postCount': '{count} 篇',
  'series.noPosts': '暂无系列文章',
  'series.rss': 'RSS 订阅',
  'series.chromeExtension': 'Chrome 插件',
  'series.docs': '文档',

  // ── Home Info ───────────────────────────────────────────────
  'homeInfo.articles': '文章',
  'homeInfo.categories': '分类',
  'homeInfo.tags': '标签',

  // ── Drawer ──────────────────────────────────────────────────
  'drawer.navMenu': '导航菜单',
  'drawer.close': '关闭菜单',
  'drawer.openMenu': '打开菜单',

  // ── Summary Panel ───────────────────────────────────────────
  'summary.description': '人工摘要',
  'summary.ai': 'AI 摘要',
  'summary.auto': '摘要',

  // ── Random Posts ────────────────────────────────────────────
  'post.randomPosts': '随机文章',

  // ── Tag Component ───────────────────────────────────────────
  'tag.expandAll': '展开全部',
  'tag.viewTagPosts': '查看标签「{tag}」的 {count} 篇文章',

  // ── Audio Player ────────────────────────────────────────────
  'audio.loading': '加载播放列表…',
  'audio.loadError': '加载失败: {error}',
  'audio.retry': '重试',
  'audio.empty': '暂无曲目',
  'audio.listTab': '列表 {index}',
  'audio.closePanel': '关闭面板',

  // ── Table of Contents ───────────────────────────────────────
  'toc.title': '文章目录',
  'toc.expand': '展开目录',
  'toc.empty': '暂无目录',

  // ── Embed ─────────────────────────────────────────────────
  'embed.loadingTweet': '正在加载 Tweet',

  // ── Search Shortcut ───────────────────────────────────────
  'search.searchShortcut': '搜索 ({shortcut})',

  // ── Sider Segmented ─────────────────────────────────────────
  'sider.overview': '站点概览',
  'sider.toc': '文章目录',
  'sider.series': '系列文章',

  // ── Copy Link ───────────────────────────────────────────────
  'cover.copyLink': '复制链接',

  // ── Comment ────────────────────────────────────────────────
  'comment.prompt': '喜欢的话，留下你的评论吧～',
} as const;

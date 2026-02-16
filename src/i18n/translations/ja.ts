/**
 * Japanese (ja) — UI strings
 *
 * Keys not present here will fall back to the default locale (zh).
 */

import type { UIStrings } from '../types';

export const uiStrings: UIStrings = {
  // ── Navigation ──────────────────────────────────────────────
  'nav.home': 'ホーム',
  'nav.posts': '投稿',
  'nav.categories': 'カテゴリー',
  'nav.tags': 'タグ',
  'nav.archives': 'アーカイブ',
  'nav.friends': '友達',
  'nav.about': 'ブログについて',
  'nav.music': '音楽',
  'nav.weekly': 'Weekly',

  // ── Common ──────────────────────────────────────────────────
  'common.search': '検索',
  'common.close': '閉じる',
  'common.copy': 'コピー',
  'common.copied': 'コピーしました',
  'common.loading': '読み込み中...',
  'common.noResults': '結果が見つかりません',
  'common.backToTop': 'トップに戻る',
  'common.darkMode': 'ダークモード',
  'common.lightMode': 'ライトモード',
  'common.toggleTheme': 'テーマを切り替え',
  'common.language': '言語',
  'common.toc': 'Table of Contents',
  'common.expand': '展開する',
  'common.collapse': '折りたたむ',
  'common.menuLabel': '{name}メニュー',

  // ── Post ────────────────────────────────────────────────────
  'post.readMore': '詳細を読む',
  'post.totalPosts': '{count}件の投稿',
  'post.stickyPosts': 'ピンをした投稿',
  'post.postList': '投稿',
  'post.featuredCategories': 'おすすめのカテゴリー',
  'post.yearPosts': '{count}件の投稿',
  'post.readingTime': '{time}分で読み終えます',
  'post.wordCount': '{count}文字',
  'post.publishedAt': '公開日: {date}',
  'post.updatedAt': '更新日: {date}',
  'post.prevPost': '前へ',
  'post.nextPost': '次へ',
  'post.relatedPosts': 'Related Posts',
  'post.seriesNavigation': 'Series Navigation',
  'post.seriesPrev': '前へ',
  'post.seriesNext': '次へ',
  'post.fallbackNotice': 'This post is not yet available in {lang}. Showing the original.',
  'post.draft': 'ドラフト',
  'post.pinned': 'ピン済み',
  'post.noPostsFound': '投稿か見つかりません',

  // ── Categories & Tags ───────────────────────────────────────
  'category.allCategories': 'すべてのカテゴリー',
  'category.postsInCategory': 'Posts in {name}',
  'category.totalCategories': '{count}件のカテゴリー',
  'category.categoryLabel': 'カテゴリー',
  'tag.allTags': 'すべてのタグ',
  'tag.postsWithTag': 'Posts tagged "{name}"',
  'tag.totalTags': '{count}個のタグ',
  'tag.all': 'すべて',
  'tag.postCount': '{count}件の投稿',

  // ── Archives ────────────────────────────────────────────────
  'archives.title': 'アーカイブ',
  'archives.totalPosts': '{count}件の投稿',

  // ── Search ──────────────────────────────────────────────────
  'search.placeholder': 'Search by keyword',
  'search.label': 'このサイトを検索',
  'search.clear': 'クリア',
  'search.loadMore': 'Load more results',
  'search.filters': 'Filters',
  'search.noResults': 'No results found',
  'search.manyResults': '[COUNT]件の検索結果',
  'search.oneResult': '[COUNT]件の検索結果',
  'search.altSearch': 'No results found. Showing results for [DIFFERENT_TERM]',
  'search.suggestion': 'No results found. Try searching for:',
  'search.searching': 'Searching [SEARCH_TERM]...',
  'search.dialogTitle': '投稿を検索',
  'search.dialogHint': 'Type keywords to search blog posts',
  'search.dialogClose': '閉じる',
  'search.dialogSelect': '選択',
  'search.dialogOpen': '開く',

  // ── Friends ─────────────────────────────────────────────────
  'friends.title': '友達',
  'friends.applyTitle': 'Apply for Friend Link',
  'friends.siteName': 'サイト名',
  'friends.siteUrl': 'サイトのURL',
  'friends.ownerName': '名前',
  'friends.siteDesc': '説明',
  'friends.avatarUrl': 'アバターのURL',
  'friends.themeColor': 'テーマの色',
  'friends.submit': '送信',
  'friends.copySuccess': 'クリップボードにコピーしました',
  'friends.copyFail': 'Copy failed, please copy manually',
  'friends.generateFormat': 'フォーマットを生成',
  'friends.copyFormat': 'フォーマットをコピー',
  'friends.sitePlaceholder': 'マイブログ',
  'friends.ownerPlaceholder': 'あなたの名前',
  'friends.urlPlaceholder': 'https://your-site.com',
  'friends.descPlaceholder': 'Brief description...',
  'friends.imagePlaceholder': 'https://...',
  'friends.previewTitle': '構成のプレビュー',
  'friends.copyConfig': '構成をコピー',
  'friends.copiedConfig': 'コピーしました!',
  'friends.hint': '説明: Copy the code above and paste it in the comment section below.',

  // ── Code Block ──────────────────────────────────────────────
  'code.copy': 'コードをコピー',
  'code.copied': 'コピーしました!',
  'code.fullscreen': 'フルスクリーン',
  'code.exitFullscreen': 'フルスクリーンを終了',
  'code.wrapLines': '文字の折り返し',
  'code.viewSource': 'ソースを表示',
  'code.viewRendered': 'View rendered',

  // ── Diagram / Infographic ───────────────────────────────────
  'diagram.fullscreen': 'フルスクリーン',
  'diagram.exitFullscreen': 'フルスクリーンを終了',
  'diagram.viewSource': 'ソースを表示',
  'diagram.zoomIn': '拡大',
  'diagram.zoomOut': '縮小',
  'diagram.resetZoom': 'リセット',
  'diagram.fitToScreen': '画面に合わせる',
  'diagram.download': '画像をダウンロード',

  // ── Image Lightbox ──────────────────────────────────────────
  'image.zoomIn': '拡大',
  'image.zoomOut': '縮小',
  'image.resetZoom': 'リセット',
  'image.resetZoomRotate': '回転と拡大をリセット',
  'image.rotate': '90°に回転',
  'image.close': '閉じる',
  'image.prev': '前へ',
  'image.next': '次へ',
  'image.counter': '{current} / {total}',
  'image.hintDesktop': 'Double-click to zoom · Scroll/pinch to scale',
  'image.hintMobile': 'Double-tap to zoom · Pinch to scale',

  // ── Media Controls ──────────────────────────────────────────
  'media.play': '再生',
  'media.pause': '一時停止',
  'media.mute': 'ミュート',
  'media.unmute': 'ミュート解除',
  'media.fullscreen': 'フルスクリーン',
  'media.exitFullscreen': 'フルスクリーンを終了',
  'media.pictureInPicture': 'ピクチャーインピクチャー',
  'media.playbackSpeed': '再生速度',
  'media.download': 'ダウンロード',
  'media.prevTrack': '前のトラック',
  'media.nextTrack': '次のトラック',
  'media.volume': '音量: {percent}%',
  'media.progress': '再生の進捗',
  'media.playModeOrder': 'Sequential',
  'media.playModeRandom': 'シャッフル',
  'media.playModeLoop': '1回のみリピート',

  // ── Footer ──────────────────────────────────────────────────
  'footer.poweredBy': 'Powered by {name}',
  'footer.totalPosts': '{count}件の投稿',
  'footer.totalWords': '{count}文字',
  'footer.totalWordsTitle': '合計の文字数',
  'footer.readingTimeTitle': '合計の読書時間',
  'footer.postCountTitle': '合計の投稿数',
  'footer.runningDays': '{days}日の稼働日数が経過',
  'footer.wordUnit': '文字',
  'footer.postUnit': '投稿',

  // ── Pagination ──────────────────────────────────────────────
  'pagination.prev': 'Previous',
  'pagination.next': 'Next',
  'pagination.page': 'Page {page}',
  'pagination.currentPage': 'Page {page}, current page',
  'pagination.of': 'of {total}',

  // ── Breadcrumb ──────────────────────────────────────────────
  'breadcrumb.home': 'Home',
  'breadcrumb.goToCategory': 'Go to {name} category',

  // ── Floating Group ──────────────────────────────────────────
  'floating.backToTop': 'Back Top',
  'floating.scrollToBottom': 'Scroll Bottom',
  'floating.toggleTheme': 'Toggle theme',
  'floating.christmas': 'Toggle Christmas effects',
  'floating.bgm': 'Background music',
  'floating.toggleToolbar': 'Toggle toolbar',

  // ── Announcement ────────────────────────────────────────────
  'announcement.title': 'Announcements',
  'announcement.new': 'New',
  'announcement.count': '{count} announcements',
  'announcement.unreadCount': '{count} unread',
  'announcement.markAllRead': 'Mark all read',
  'announcement.dismiss': 'Dismiss',
  'announcement.learnMore': 'Learn more',
  'announcement.empty': 'No announcements',
  'announcement.emptyHint': 'New announcements will appear here',

  // ── Quiz ────────────────────────────────────────────────────
  'quiz.check': 'Check',
  'quiz.correct': 'Correct!',
  'quiz.incorrect': 'Incorrect, try again',
  'quiz.incorrectAnswer': 'Incorrect. The correct answer is {answer}.',
  'quiz.submitAnswer': 'Submit ({count} selected)',
  'quiz.commonMistakes': 'Common mistakes:',
  'quiz.parseFailed': 'Failed to parse quiz',
  'quiz.showAnswer': 'Show answer',
  'quiz.hideAnswer': 'Hide answer',
  'quiz.reset': 'Reset',
  'quiz.score': 'Score: {score}/{total}',
  'quiz.completed': 'All done!',
  'quiz.fillBlank': 'Type your answer...',
  'quiz.selectOption': 'Select an option',
  'quiz.single': 'Single Choice',
  'quiz.multi': 'Multiple Choice',
  'quiz.trueFalse': 'True or False',
  'quiz.fill': 'Fill in the Blank',
  'quiz.optionTrue': 'True',
  'quiz.optionFalse': 'False',
  'quiz.clickToReveal': 'Click to reveal answer',
  'quiz.quizOptions': '{type} options',
  'quiz.trueFalseCorrect': 'Correct!',
  'quiz.trueFalseIncorrect': 'Incorrect. The statement is {answer}.',

  // ── Encrypted Block ─────────────────────────────────────────
  'encrypted.placeholder': 'Enter password to unlock',
  'encrypted.submit': 'Unlock',
  'encrypted.incorrect': 'Wrong password',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': 'Page Not Found',
  'notFound.description': 'The page you are looking for does not exist',
  'notFound.backHome': 'Back to Home',
  'notFound.browseArchives': 'Browse Archives',
  'notFound.message': 'Meow? The page was eaten~',

  // ── Category Stats ────────────────────────────────────────
  'category.subCategoryCount': '{count} subcategories',
  'category.postCount': '{count} posts',

  // ── Post Card ─────────────────────────────────────────────
  'post.readingTimeTooltip': 'Estimated reading time: {time}',

  // ── Featured Series ─────────────────────────────────────────
  'series.latestPost': 'Latest',
  'series.viewAll': 'View all',
  'series.postCount': '{count} posts',
  'series.noPosts': 'No posts in this series',
  'series.rss': 'RSS Feed',
  'series.chromeExtension': 'Chrome Extension',
  'series.docs': 'Documentation',

  // ── Home Info ───────────────────────────────────────────────
  'homeInfo.articles': 'Articles',
  'homeInfo.categories': 'Categories',
  'homeInfo.tags': 'Tags',

  // ── Drawer ──────────────────────────────────────────────────
  'drawer.navMenu': 'Navigation menu',
  'drawer.close': 'Close menu',
  'drawer.openMenu': 'Open menu',

  // ── Summary Panel ───────────────────────────────────────────
  'summary.description': 'Summary',
  'summary.ai': 'AI Summary',
  'summary.auto': 'Summary',

  // ── Random Posts ────────────────────────────────────────────
  'post.randomPosts': 'Random Posts',

  // ── Tag Component ───────────────────────────────────────────
  'tag.expandAll': 'Show all',
  'tag.viewTagPosts': 'View {count} posts tagged "{tag}"',

  // ── Audio Player ────────────────────────────────────────────
  'audio.loading': 'Loading playlist...',
  'audio.loadError': 'Load failed: {error}',
  'audio.retry': 'Retry',
  'audio.empty': 'No tracks',
  'audio.listTab': 'List {index}',
  'audio.closePanel': 'Close panel',

  // ── Table of Contents ───────────────────────────────────────
  'toc.title': 'Table of Contents',
  'toc.expand': 'Expand table of contents',
  'toc.empty': 'No headings',

  // ── Embed ─────────────────────────────────────────────────
  'embed.loadingTweet': 'Loading Tweet',

  // ── Search Shortcut ───────────────────────────────────────
  'search.searchShortcut': 'Search ({shortcut})',

  // ── Sider Segmented ─────────────────────────────────────────
  'sider.overview': 'Overview',
  'sider.toc': 'Contents',
  'sider.series': 'Series',

  // ── Copy Link ───────────────────────────────────────────────
  'cover.copyLink': 'Copy link',
};

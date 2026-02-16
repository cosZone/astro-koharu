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
  'nav.weekly': '週間',

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
  'post.totalPosts': '{count} 件の投稿',
  'post.stickyPosts': 'ピンをした投稿',
  'post.postList': '投稿',
  'post.featuredCategories': 'おすすめのカテゴリー',
  'post.yearPosts': '{count} 件の投稿',
  'post.readingTime': '{time} 分で読み終えます',
  'post.wordCount': '{count} 文字',
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
  'category.totalCategories': '{count} 件のカテゴリー',
  'category.categoryLabel': 'カテゴリー',
  'tag.allTags': 'すべてのタグ',
  'tag.postsWithTag': 'Posts tagged "{name}"',
  'tag.totalTags': '{count} 個のタグ',
  'tag.all': 'すべて',
  'tag.postCount': '{count} 件の投稿',

  // ── Archives ────────────────────────────────────────────────
  'archives.title': 'アーカイブ',
  'archives.totalPosts': '{count} 件の投稿',

  // ── Search ──────────────────────────────────────────────────
  'search.placeholder': 'キーワードで検索',
  'search.label': 'このサイトを検索',
  'search.clear': '消去',
  'search.loadMore': 'さらに検索結果を読み込み',
  'search.filters': '絞り込み',
  'search.noResults': '検索結果は見つかりません',
  'search.manyResults': '[COUNT] 件の検索結果',
  'search.oneResult': '[COUNT] 件の検索結果',
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
  'friends.applyTitle': '友達のリンクに適用',
  'friends.siteName': 'サイト名',
  'friends.siteUrl': 'サイトの URL',
  'friends.ownerName': '名前',
  'friends.siteDesc': '説明',
  'friends.avatarUrl': 'アバターの URL',
  'friends.themeColor': 'テーマの色',
  'friends.submit': '送信',
  'friends.copySuccess': 'クリップボードにコピーしました',
  'friends.copyFail': 'コピーに失敗、手動でコピーしてください',
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
  'image.rotate': '90 度に回転',
  'image.close': '閉じる',
  'image.prev': '前へ',
  'image.next': '次へ',
  'image.counter': '{current} / {total}',
  'image.hintDesktop': 'ダブルクリックで拡大 · Scroll/pinch to scale',
  'image.hintMobile': 'ダブルタップで拡大 · Pinch to scale',

  // ── Media Controls ──────────────────────────────────────────
  'media.play': '再生',
  'media.pause': '一時停止',
  'media.mute': 'ミュート',
  'media.unmute': 'ミュートを解除',
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
  'media.playModeLoop': '1 回のみリピート',

  // ── Footer ──────────────────────────────────────────────────
  'footer.poweredBy': 'Powered by {name}',
  'footer.totalPosts': '{count} 件の投稿',
  'footer.totalWords': '{count} 文字',
  'footer.totalWordsTitle': '合計の文字数',
  'footer.readingTimeTitle': '合計の読書時間',
  'footer.postCountTitle': '合計の投稿数',
  'footer.runningDays': '稼働して {days} 日が経過,
  'footer.wordUnit': '文字',
  'footer.postUnit': '投稿',

  // ── Pagination ──────────────────────────────────────────────
  'pagination.prev': '前へ',
  'pagination.next': '次へ',
  'pagination.page': 'ページ: {page}',
  'pagination.currentPage': 'Page {page}, current page',
  'pagination.of': 'of {total}',

  // ── Breadcrumb ──────────────────────────────────────────────
  'breadcrumb.home': 'ホーム',
  'breadcrumb.goToCategory': '「{name}」のカテゴリーに移動',

  // ── Floating Group ──────────────────────────────────────────
  'floating.backToTop': 'トップに戻る',
  'floating.scrollToBottom': '下にスクロール',
  'floating.toggleTheme': 'テーマを切り替え',
  'floating.christmas': 'クリスマスエフェクトに切り替え',
  'floating.bgm': 'BGM',
  'floating.toggleToolbar': 'ツールバーを切り替え',

  // ── Announcement ────────────────────────────────────────────
  'announcement.title': 'お知らせ',
  'announcement.new': '新着',
  'announcement.count': '{count} 件のお知らせ',
  'announcement.unreadCount': '{count} 件が未読',
  'announcement.markAllRead': 'すべて既読にする',
  'announcement.dismiss': '無視',
  'announcement.learnMore': '詳細を読む',
  'announcement.empty': 'お知らせは見つかりません',
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
  'quiz.score': '得点: {score}/{total}',
  'quiz.completed': 'すべて完了しました!',
  'quiz.fillBlank': 'Type your answer...',
  'quiz.selectOption': 'Select an option',
  'quiz.single': '単一で選択',
  'quiz.multi': '複数で選択',
  'quiz.trueFalse': 'True or False',
  'quiz.fill': 'Fill in the Blank',
  'quiz.optionTrue': 'True',
  'quiz.optionFalse': 'False',
  'quiz.clickToReveal': 'Click to reveal answer',
  'quiz.quizOptions': '{type}個のオプション',
  'quiz.trueFalseCorrect': 'Correct!',
  'quiz.trueFalseIncorrect': 'Incorrect. The statement is {answer}.',

  // ── Encrypted Block ─────────────────────────────────────────
  'encrypted.placeholder': 'パスワードを入力でロックを解除',
  'encrypted.submit': 'ロックを解除',
  'encrypted.incorrect': 'パスワードを忘れました',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': 'ページは見つかりません',
  'notFound.description': 'The page you are looking for does not exist',
  'notFound.backHome': 'ホームに戻る',
  'notFound.browseArchives': 'アーカイブを参照',
  'notFound.message': 'Meow? The page was eaten~',

  // ── Category Stats ────────────────────────────────────────
  'category.subCategoryCount': '{count} 件のサブカテゴリー',
  'category.postCount': '{count} 件の投稿',

  // ── Post Card ─────────────────────────────────────────────
  'post.readingTimeTooltip': 'Estimated reading time: {time}',

  // ── Featured Series ─────────────────────────────────────────
  'series.latestPost': '最新',
  'series.viewAll': 'すべて表示',
  'series.postCount': '{count} 件の投稿',
  'series.noPosts': 'No posts in this series',
  'series.rss': 'RSS フィード',
  'series.chromeExtension': 'Chrome 拡張機能',
  'series.docs': 'Documentation',

  // ── Home Info ───────────────────────────────────────────────
  'homeInfo.articles': 'Articles',
  'homeInfo.categories': 'カテゴリー',
  'homeInfo.tags': 'タグ',

  // ── Drawer ──────────────────────────────────────────────────
  'drawer.navMenu': 'ナビゲーションメニュー',
  'drawer.close': 'メニューを閉じる',
  'drawer.openMenu': 'メニューを開く',

  // ── Summary Panel ───────────────────────────────────────────
  'summary.description': '概要',
  'summary.ai': 'AI の概要',
  'summary.auto': '概要',

  // ── Random Posts ────────────────────────────────────────────
  'post.randomPosts': '投稿をランダムに表示',

  // ── Tag Component ───────────────────────────────────────────
  'tag.expandAll': 'すべて表示',
  'tag.viewTagPosts': 'View {count} posts tagged "{tag}"',

  // ── Audio Player ────────────────────────────────────────────
  'audio.loading': 'プレイリストを読み込み中...',
  'audio.loadError': '読み込みに失敗: {error}',
  'audio.retry': '再試行',
  'audio.empty': 'トラックが見つかりません',
  'audio.listTab': '{index}の一覧',
  'audio.closePanel': 'パネルを閉じる',

  // ── Table of Contents ───────────────────────────────────────
  'toc.title': 'Table of Contents',
  'toc.expand': 'Expand table of contents',
  'toc.empty': 'No headings',

  // ── Embed ─────────────────────────────────────────────────
  'embed.loadingTweet': 'ポストを読み込み中',

  // ── Search Shortcut ───────────────────────────────────────
  'search.searchShortcut': '検索 ({shortcut})',

  // ── Sider Segmented ─────────────────────────────────────────
  'sider.overview': 'Overview',
  'sider.toc': 'コンテンツ',
  'sider.series': 'Series',

  // ── Copy Link ───────────────────────────────────────────────
  'cover.copyLink': 'リンクをコピー',
};

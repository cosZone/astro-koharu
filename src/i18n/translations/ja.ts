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
  'nav.weekly': '週刊',

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
  'common.toc': '目次',
  'common.expand': '展開する',
  'common.collapse': '折りたたむ',
  'common.menuLabel': '{name}メニュー',

  // ── Post ────────────────────────────────────────────────────
  'post.readMore': '詳細を読む',
  'post.totalPosts': '{count}件の投稿',
  'post.stickyPosts': '固定された投稿',
  'post.postList': '投稿',
  'post.featuredCategories': 'おすすめのカテゴリー',
  'post.yearPosts': '{count}件の投稿',
  'post.readingTime': '{time}分で読み終えます',
  'post.wordCount': '{count}文字',
  'post.publishedAt': '公開日: {date}',
  'post.updatedAt': '更新日: {date}',
  'post.prevPost': '前へ',
  'post.nextPost': '次へ',
  'post.relatedPosts': '関連した記事',
  'post.seriesNavigation': 'シリーズナビゲーション',
  'post.seriesPrev': '前へ',
  'post.seriesNext': '次へ',
  'post.fallbackNotice': 'この投稿は「{lang}」では表示できません。元の投稿を表示しています。',
  'post.draft': 'ドラフト',
  'post.pinned': '固定済み',
  'post.noPostsFound': '投稿が見つかりません',

  // ── Categories & Tags ───────────────────────────────────────
  'category.allCategories': 'すべてのカテゴリー',
  'category.postsInCategory': '{name}の投稿',
  'category.totalCategories': '{count}件のカテゴリー',
  'category.categoryLabel': 'カテゴリー',
  'tag.allTags': 'すべてのタグ',
  'tag.postsWithTag': '「{name}」のタグが付けられた投稿',
  'tag.totalTags': '{count}個のタグ',
  'tag.all': 'すべて',
  'tag.postCount': '{count}件の投稿',

  // ── Archives ────────────────────────────────────────────────
  'archives.title': 'アーカイブ',
  'archives.totalPosts': '{count}件の投稿',

  // ── Search ──────────────────────────────────────────────────
  'search.placeholder': 'キーワードで検索',
  'search.label': 'このサイトを検索',
  'search.clear': 'クリア',
  'search.loadMore': 'さらに検索結果を読み込み',
  'search.filters': '絞り込み',
  'search.noResults': '検索結果は見つかりません',
  'search.manyResults': '[COUNT]件の検索結果',
  'search.oneResult': '[COUNT]件の検索結果',
  'search.altSearch': '結果が見つかりません。[DIFFERENT_TERM]の結果を表示しています。',
  'search.suggestion': '検索結果が見つかりません。 こちらの検索をお試しください:',
  'search.searching': '[SEARCH_TERM]を検索中...',
  'search.dialogTitle': '投稿を検索',
  'search.dialogHint': 'キーワードを入力して投稿を検索します',
  'search.dialogClose': '閉じる',
  'search.dialogSelect': '選択',
  'search.dialogOpen': '開く',

  // ── Friends ─────────────────────────────────────────────────
  'friends.title': '友達',
  'friends.applyTitle': '友達のリンクに適用',
  'friends.siteName': 'サイト名',
  'friends.siteUrl': 'サイトのURL',
  'friends.ownerName': '名前',
  'friends.siteDesc': '説明',
  'friends.avatarUrl': 'アバターのURL',
  'friends.themeColor': 'テーマの色',
  'friends.submit': '送信',
  'friends.copySuccess': 'クリップボードにコピーしました',
  'friends.copyFail': 'コピーに失敗、手動でコピーしてください',
  'friends.generateFormat': 'フォーマットを生成',
  'friends.copyFormat': 'フォーマットをコピー',
  'friends.sitePlaceholder': 'マイブログ',
  'friends.ownerPlaceholder': 'あなたの名前',
  'friends.urlPlaceholder': 'https://your-site.com',
  'friends.descPlaceholder': '簡単な説明...',
  'friends.imagePlaceholder': 'https://...',
  'friends.previewTitle': '構成のプレビュー',
  'friends.copyConfig': '構成をコピー',
  'friends.copiedConfig': 'コピーしました!',
  'friends.hint': '説明: 上記のコードをコピーして、下のコメントセクションに貼り付けてください。',

  // ── Code Block ──────────────────────────────────────────────
  'code.copy': 'コードをコピー',
  'code.copied': 'コピーしました!',
  'code.fullscreen': 'フルスクリーン',
  'code.exitFullscreen': 'フルスクリーンを終了',
  'code.wrapLines': '文字の折り返し',
  'code.viewSource': 'ソースを表示',
  'code.viewRendered': 'レンダリングされた表示',

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
  'image.rotate': '90度に回転',
  'image.close': '閉じる',
  'image.prev': '前へ',
  'image.next': '次へ',
  'image.counter': '{current} / {total}',
  'image.hintDesktop': 'ダブルクリックで拡大 · スクロール/ピンチで大きさを変更',
  'image.hintMobile': 'ダブルタップで拡大 · ピンチで大きさを変更',

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
  'media.playModeOrder': '順番',
  'media.playModeRandom': 'シャッフル',
  'media.playModeLoop': '1回のみリピート',

  // ── Footer ──────────────────────────────────────────────────
  'footer.poweredBy': 'Powered by {name}',
  'footer.totalPosts': '{count}件の投稿',
  'footer.totalWords': '{count}文字',
  'footer.totalWordsTitle': '合計の文字数',
  'footer.readingTimeTitle': '合計の読書時間',
  'footer.postCountTitle': '合計の投稿数',
  'footer.runningDays': '稼働して{days}日が経過',
  'footer.wordUnit': '文字',
  'footer.postUnit': '投稿',

  // ── Pagination ──────────────────────────────────────────────
  'pagination.prev': '前へ',
  'pagination.next': '次へ',
  'pagination.page': 'ページ: {page}',
  'pagination.currentPage': '現在は{page}ページです',
  'pagination.of': '{total}ページの内、',

  // ── Breadcrumb ──────────────────────────────────────────────
  'breadcrumb.home': 'ホーム',
  'breadcrumb.goToCategory': '{name}のカテゴリーに移動',

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
  'announcement.count': '{count}件のお知らせ',
  'announcement.unreadCount': '{count}件が未読',
  'announcement.markAllRead': 'すべて既読にする',
  'announcement.dismiss': '無視',
  'announcement.learnMore': '詳細を読む',
  'announcement.empty': 'お知らせは見つかりません',
  'announcement.emptyHint': '新しいお知らせはこちらに表示されます',

  // ── Quiz ────────────────────────────────────────────────────
  'quiz.check': 'チェック',
  'quiz.correct': '正解です!',
  'quiz.incorrect': '不正解、再度お試しください。',
  'quiz.incorrectAnswer': '不正解、答えは「{answer}」です。',
  'quiz.submitAnswer': '送信 ({count}個が選択済み)',
  'quiz.commonMistakes': 'よくある間違い:',
  'quiz.parseFailed': 'クイズの解析に失敗しました',
  'quiz.showAnswer': '答えを表示',
  'quiz.hideAnswer': '答えを隠す',
  'quiz.reset': 'リセット',
  'quiz.score': '得点: {score}/{total}',
  'quiz.completed': 'すべて完了しました!',
  'quiz.fillBlank': '回答を入力してください...',
  'quiz.selectOption': 'オプションを選択',
  'quiz.single': '単一で選択',
  'quiz.multi': '複数で選択',
  'quiz.trueFalse': '○か×か',
  'quiz.fill': '空欄を埋めてください',
  'quiz.optionTrue': '○',
  'quiz.optionFalse': '×',
  'quiz.clickToReveal': 'クリックで答えを表示',
  'quiz.quizOptions': '{type}個のオプション',
  'quiz.trueFalseCorrect': '正解です!',
  'quiz.trueFalseIncorrect': '不正解、答えは「{answer}」です。',

  // ── Encrypted Block ─────────────────────────────────────────
  'encrypted.locked': '暗号化されたコンテンツ',
  'encrypted.placeholder': 'パスワードを入力でロックを解除',
  'encrypted.submit': 'ロックを解除',
  'encrypted.incorrect': 'パスワードが間違っています',

  // ── Encrypted Post ─────────────────────────────────────────
  'encrypted.post.title': 'この記事は暗号化されています',
  'encrypted.post.description': 'パスワードを入力して内容をご覧ください',
  'encrypted.post.rssNotice': 'この記事は暗号化されています。ウェブサイトでご覧ください。',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': 'ページは見つかりません',
  'notFound.description': 'お探しのページは見つかりません',
  'notFound.backHome': 'ホームに戻る',
  'notFound.browseArchives': 'アーカイブを参照',
  'notFound.message': 'んにゃー? ページは食べられちゃったよ〜',

  // ── Category Stats ────────────────────────────────────────
  'category.subCategoryCount': '{count}件のサブカテゴリー',
  'category.postCount': '{count}件の投稿',

  // ── Post Card ─────────────────────────────────────────────
  'post.readingTimeTooltip': '読み終える推定時間: {time}',

  // ── Featured Series ─────────────────────────────────────────
  'series.latestPost': '最新',
  'series.viewAll': 'すべて表示',
  'series.postCount': '{count}件の投稿',
  'series.noPosts': 'このシリーズには投稿がありません',
  'series.rss': 'RSSフィード',
  'series.chromeExtension': 'Chrome 拡張機能',
  'series.docs': 'ドキュメント',

  // ── Home Info ───────────────────────────────────────────────
  'homeInfo.articles': '記事',
  'homeInfo.categories': 'カテゴリー',
  'homeInfo.tags': 'タグ',

  // ── Drawer ──────────────────────────────────────────────────
  'drawer.navMenu': 'ナビゲーションメニュー',
  'drawer.close': 'メニューを閉じる',
  'drawer.openMenu': 'メニューを開く',

  // ── Summary Panel ───────────────────────────────────────────
  'summary.description': '概要',
  'summary.ai': 'AIの概要',
  'summary.auto': '概要',

  // ── Random Posts ────────────────────────────────────────────
  'post.randomPosts': '投稿をランダムに表示',

  // ── Tag Component ───────────────────────────────────────────
  'tag.expandAll': 'すべて表示',
  'tag.viewTagPosts': '「{tag}」のタグの付いた投稿を{count}件表示',

  // ── Audio Player ────────────────────────────────────────────
  'audio.loading': 'プレイリストを読み込み中...',
  'audio.loadError': '読み込みに失敗: {error}',
  'audio.retry': '再試行',
  'audio.empty': 'トラックが見つかりません',
  'audio.listTab': '{index}の一覧',
  'audio.closePanel': 'パネルを閉じる',

  // ── Table of Contents ───────────────────────────────────────
  'toc.title': '目次',
  'toc.expand': '目次のコンテンツを展開',
  'toc.empty': '見出しはありません',

  // ── Embed ─────────────────────────────────────────────────
  'embed.loadingTweet': 'ポストを読み込み中',

  // ── Search Shortcut ───────────────────────────────────────
  'search.searchShortcut': '検索 ({shortcut})',

  // ── Sider Segmented ─────────────────────────────────────────
  'sider.overview': '概要',
  'sider.toc': 'コンテンツ',
  'sider.series': 'シリーズ',

  // ── Copy Link ───────────────────────────────────────────────
  'cover.copyLink': 'リンクをコピー',

  // ── Comment ────────────────────────────────────────────────
  'comment.prompt': '気に入ったら、コメントを残してね～',
};

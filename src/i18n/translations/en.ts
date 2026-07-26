/**
 * English (en) — UI strings
 *
 * Keys not present here will fall back to the default locale (zh).
 */

import type { UIStrings } from '../types';

export const uiStrings: UIStrings = {
  // ── Navigation ──────────────────────────────────────────────
  'nav.home': 'Home',
  'nav.posts': 'Posts',
  'nav.categories': 'Categories',
  'nav.tags': 'Tags',
  'nav.archives': 'Archives',
  'nav.friends': 'Friends',
  'nav.about': 'About',
  'nav.music': 'Music',
  'nav.weekly': 'Weekly',
  'nav.bangumi': 'Bangumi',

  // ── Common ──────────────────────────────────────────────────
  'common.search': 'Search',
  'common.close': 'Close',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.copyFailed': 'Automatic copy failed. Copy the link manually.',
  'common.loading': 'Loading...',
  'common.noResults': 'No results found',
  'common.backToTop': 'Back to top',
  'common.darkMode': 'Dark mode',
  'common.lightMode': 'Light mode',
  'common.toggleTheme': 'Toggle theme',
  'common.language': 'Language',
  'common.toc': 'Table of Contents',
  'common.expand': 'Expand',
  'common.collapse': 'Collapse',
  'common.menuLabel': '{name} menu',

  // ── Post ────────────────────────────────────────────────────
  'post.readMore': 'Read more',
  'post.totalPosts': '{count} posts',
  'post.stickyPosts': 'Pinned Posts',
  'post.postList': 'Posts',
  'post.featuredCategories': 'Featured Categories',
  'post.yearPosts': '{count} posts',
  'post.readingTime': '{time} min read',
  'post.wordCount': '{count} words',
  'post.publishedAt': 'Published {date}',
  'post.updatedAt': 'Updated {date}',
  'post.prevPost': 'Previous',
  'post.nextPost': 'Next',
  'post.relatedPosts': 'Related Posts',
  'post.seriesNavigation': 'Series Navigation',
  'post.seriesPrev': 'Previous',
  'post.seriesNext': 'Next',
  'post.fallbackNotice': 'This post is not yet available in {lang}. Showing the original.',
  'post.draft': 'Draft',
  'post.pinned': 'Pinned',
  'post.noPostsFound': 'No posts found',

  // ── Categories & Tags ───────────────────────────────────────
  'category.allCategories': 'All Categories',
  'category.postsInCategory': 'Posts in {name}',
  'category.totalCategories': '{count} categories',
  'category.categoryLabel': 'Category',
  'tag.allTags': 'All Tags',
  'tag.postsWithTag': 'Posts tagged "{name}"',
  'tag.totalTags': '{count} tags',
  'tag.all': 'All',
  'tag.postCount': '{count} posts',

  // ── Archives ────────────────────────────────────────────────
  'archives.title': 'Archives',
  'archives.totalPosts': '{count} posts',

  // ── Search ──────────────────────────────────────────────────
  'search.placeholder': 'Search by keyword',
  'search.label': 'Search this site',
  'search.clear': 'Clear',
  'search.loadMore': 'Load more results',
  'search.filters': 'Filters',
  'search.noResults': 'No results found',
  'search.manyResults': '[COUNT] results',
  'search.oneResult': '[COUNT] result',
  'search.altSearch': 'No results found. Showing results for [DIFFERENT_TERM]',
  'search.suggestion': 'No results found. Try searching for:',
  'search.searching': 'Searching [SEARCH_TERM]...',
  'search.dialogTitle': 'Search Posts',
  'search.dialogHint': 'Type keywords to search blog posts',
  'search.dialogClose': 'Close',
  'search.dialogSelect': 'Select',
  'search.dialogOpen': 'Open',

  // ── Friends ─────────────────────────────────────────────────
  'friends.title': 'Friends',
  'friends.applyTitle': 'Apply for Friend Link',
  'friends.siteName': 'Site Name',
  'friends.siteUrl': 'Site URL',
  'friends.ownerName': 'Name',
  'friends.siteDesc': 'Description',
  'friends.avatarUrl': 'Avatar URL',
  'friends.themeColor': 'Theme Color',
  'friends.submit': 'Submit',
  'friends.copySuccess': 'Copied to clipboard',
  'friends.copyFail': 'Copy failed, please copy manually',
  'friends.generateFormat': 'Generate Format',
  'friends.copyFormat': 'Copy Format',
  'friends.sitePlaceholder': 'My Blog',
  'friends.ownerPlaceholder': 'Your name',
  'friends.urlPlaceholder': 'https://your-site.com',
  'friends.descPlaceholder': 'Brief description...',
  'friends.imagePlaceholder': 'https://...',
  'friends.previewTitle': 'Config Preview',
  'friends.copyConfig': 'Copy Config',
  'friends.copiedConfig': 'Copied!',
  'friends.hint': 'Tip: Copy the code above and paste it in the comment section below.',

  // ── Code Block ──────────────────────────────────────────────
  'code.copy': 'Copy code',
  'code.copied': 'Copied!',
  'code.fullscreen': 'Full screen',
  'code.exitFullscreen': 'Exit full screen',
  'code.wrapLines': 'Word wrap',
  'code.viewSource': 'View source',
  'code.viewRendered': 'View rendered',
  'code.collapse': 'Collapse code',
  'code.expand': 'Expand code',

  // ── Diagram / Infographic ───────────────────────────────────
  'diagram.fullscreen': 'Full screen',
  'diagram.exitFullscreen': 'Exit full screen',
  'diagram.viewSource': 'View source',
  'diagram.zoomIn': 'Zoom in',
  'diagram.zoomOut': 'Zoom out',
  'diagram.resetZoom': 'Reset zoom',
  'diagram.fitToScreen': 'Fit to screen',
  'diagram.download': 'Download image',

  // ── Image Lightbox ──────────────────────────────────────────
  'image.zoomIn': 'Zoom in',
  'image.zoomOut': 'Zoom out',
  'image.resetZoom': 'Reset',
  'image.resetZoomRotate': 'Reset zoom and rotation',
  'image.rotate': 'Rotate 90°',
  'image.close': 'Close',
  'image.prev': 'Previous',
  'image.next': 'Next',
  'image.counter': '{current} / {total}',
  'image.hintDesktop': 'Double-click to zoom · Scroll/pinch to scale',
  'image.hintMobile': 'Double-tap to zoom · Pinch to scale',

  // ── Media Controls ──────────────────────────────────────────
  'media.play': 'Play',
  'media.pause': 'Pause',
  'media.mute': 'Mute',
  'media.unmute': 'Unmute',
  'media.fullscreen': 'Full screen',
  'media.exitFullscreen': 'Exit full screen',
  'media.pictureInPicture': 'Picture in picture',
  'media.playbackSpeed': 'Playback speed',
  'media.download': 'Download',
  'media.prevTrack': 'Previous track',
  'media.nextTrack': 'Next track',
  'media.volume': 'Volume {percent}%',
  'media.progress': 'Playback progress',
  'media.playModeOrder': 'Sequential',
  'media.playModeRandom': 'Shuffle',
  'media.playModeLoop': 'Repeat one',

  // ── Footer ──────────────────────────────────────────────────
  'footer.poweredBy': 'Powered by {name}',
  'footer.totalPosts': '{count} posts',
  'footer.totalWords': '{count} words',
  'footer.totalWordsTitle': 'Total words',
  'footer.readingTimeTitle': 'Total reading time',
  'footer.postCountTitle': 'Total posts',
  'footer.runningDays': 'Running for {days} days',
  'footer.wordUnit': 'words',
  'footer.postUnit': 'posts',

  // ── Analytics Stats ─────────────────────────────────────────
  'stats.pageviews': 'Page views',

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
  'floating.settings': 'Settings',

  // ── Settings Panel ────────────────────────────────────────
  'settings.title': 'Settings',
  'settings.reader': 'Reading',
  'settings.general': 'General',
  'settings.closePanel': 'Close settings panel',
  'settings.fontPreset': 'Font',
  'settings.fontPreset.round': 'Rounded',
  'settings.fontPreset.system': 'System',
  'settings.fontPreset.serif': 'Serif',
  'settings.fontPreset.wenkai': 'WenKai',
  'settings.fontPreset.local': 'Local font',
  'settings.localFont.title': 'Choose a local font',
  'settings.localFont.description': 'Choose an installed font for article text on this device',
  'settings.localFont.permission':
    'Your browser will ask to read the local font list. Font data stays on this device for preview and selection.',
  'settings.localFont.requestAccess': 'Read local fonts',
  'settings.localFont.loading': 'Reading fonts…',
  'settings.localFont.search': 'Search fonts',
  'settings.localFont.preview': 'The quick brown fox Aa 123',
  'settings.localFont.empty': 'No matching fonts',
  'settings.localFont.unsupported': 'This browser cannot list local fonts, but you can enter an exact font name.',
  'settings.localFont.denied': 'Local font access was not granted, but you can enter a font name manually.',
  'settings.localFont.error': 'Local fonts could not be read, but you can enter a font name manually.',
  'settings.localFont.manualLabel': 'Font name',
  'settings.localFont.manualPlaceholder': 'For example: Charter',
  'settings.localFont.useFont': 'Use',
  'settings.localFont.change': 'Change local font',
  'settings.fontSize': 'Font size',
  'settings.lineHeight': 'Line height',
  'settings.measure': 'Measure',
  'settings.auto': 'Auto',
  'settings.justify': 'Justify',
  'settings.scrollProgress': 'Scroll progress bar',
  'settings.christmas': 'Christmas effects',
  'settings.bgmWidget': 'BGM widget',
  'settings.masterMotion': 'Reduce motion',
  'settings.wave': 'Cover waves',
  'settings.reset': 'Reset to default',
  'settings.waveDisabledByMasterMotion': 'Unavailable while "Reduce motion" is on',
  'settings.invalidNumber': 'Enter a positive number',

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
  'encrypted.locked': 'Encrypted content',
  'encrypted.placeholder': 'Enter password to unlock',
  'encrypted.submit': 'Unlock',
  'encrypted.incorrect': 'Wrong password',

  // ── Encrypted Post ─────────────────────────────────────────
  'encrypted.post.title': 'This post is encrypted',
  'encrypted.post.description': 'Please enter the password to view the content',
  'encrypted.post.rssNotice': 'This post is encrypted. Please view it on the website.',

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

  // ── Content ───────────────────────────────────────────────
  'content.revealSpoiler': 'Reveal spoiler',

  // ── Search Shortcut ───────────────────────────────────────
  'search.searchShortcut': 'Search ({shortcut})',

  // ── Sider Segmented ─────────────────────────────────────────
  'sider.overview': 'Overview',
  'sider.toc': 'Contents',
  'sider.series': 'Series',

  // ── Copy Link ───────────────────────────────────────────────
  'cover.copyLink': 'Copy link',

  // ── Comment ────────────────────────────────────────────────
  'comment.prompt': 'If you enjoyed this, leave a comment~',
  'comment.error': 'Failed to load comments. Reload the page to try again.',
  'comment.retry': 'Reload',

  // ── Bangumi ───────────────────────────────────────────────
  'bangumi.title': 'Bangumi',
  'bangumi.description': 'My media collection',
  'bangumi.anime': 'Anime',
  'bangumi.book': 'Books',
  'bangumi.music': 'Music',
  'bangumi.game': 'Games',
  'bangumi.real': 'Real',
  'bangumi.all': 'All',
  'bangumi.wish': 'Wish',
  'bangumi.collected': 'Completed',
  'bangumi.watching': 'Watching',
  'bangumi.onHold': 'On Hold',
  'bangumi.dropped': 'Dropped',
  'bangumi.noImage': 'No Image',
  'bangumi.noItems': 'No collections',
  'bangumi.error': 'Failed to load, please try again',
  'bangumi.retry': 'Retry',

  // ── Moments ────────────────────────────────────────────────
  'nav.moments': 'Moments',
  'moments.title': 'Moments',
  'moments.description': 'Short updates collected from public channels',
  'moments.channels': 'Moment channels',
  'moments.search': 'Search Moments',
  'moments.searchForm': 'Search Moment entries',
  'moments.searchQuery': 'Search query',
  'moments.searchPlaceholder': 'Enter at least 3 characters',
  'moments.searchEmpty': 'Type a keyword to search messages from all public channels',
  'moments.searchHint': 'Enter at least 3 Unicode characters',
  'moments.searchTooLong': 'Search queries cannot exceed 200 Unicode characters',
  'moments.channel': 'Channel',
  'moments.allChannels': 'All channels',
  'moments.sort': 'Sort',
  'moments.relevance': 'Relevance',
  'moments.newest': 'Newest',
  'moments.searchResults': 'Search results',
  'moments.noResults': 'No matching Moments found',
  'moments.clearSearch': 'Clear search',
  'moments.updated': 'Updated',
  'moments.permalink': 'Permalink',
  'moments.copyLink': 'Copy link',
  'moments.copyFailed': 'Copy failed. Copy the URL manually.',
  'moments.viewSource': 'View source message',
  'moments.emptyMessage': 'Empty message',
  'moments.mediaMessage': 'Media message',
  'moments.expand': 'Show full message',
  'moments.collapse': 'Collapse message',
  'moments.mediaProcessing': 'Media is processing',
  'moments.mediaUnavailable': 'Media is unavailable',
  'moments.image': 'Image',
  'moments.video': 'Video',
  'moments.audio': 'Audio',
  'moments.document': 'File',
  'moments.openDocument': 'Open file',
  'moments.mediaMore': '{count} more media items',
  'moments.loadEarlier': 'Load earlier entries',
  'moments.back': 'Back',
  'moments.pagination': 'Moments pagination',
  'moments.newer': 'Newer entry',
  'moments.older': 'Older entry',
  'moments.contextNavigation': 'Adjacent Moments',
  'moments.tags': 'Tags',
  'moments.emptyChannels': 'No visible channels',
  'moments.emptyChannel': 'This channel has no messages yet',
  'moments.notFound': 'Moment not found',
  'moments.notFoundDescription': 'The link may be outdated, or the message does not belong to this channel.',
  'moments.rateLimited': 'Too many requests',
  'moments.rateLimitedDescription': 'The service is temporarily limiting requests. Please try again later.',
  'moments.unavailable': 'Moments are temporarily unavailable',
  'moments.unavailableDescription': 'The dynamic content service cannot be reached. Blog posts remain available.',
  'moments.retry': 'Retry',
  'moments.backToIndex': 'Back to Moments',
  'moments.cacheNotice': 'Content may be delayed by up to 5 minutes',
  'moments.rss': 'RSS feed',
  'moments.globalRss': 'Subscribe to all Moments',
  'moments.channelRss': 'Subscribe to this channel',
};

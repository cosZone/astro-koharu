# astro-koharu

**Language:** [中文](../README.md) | [English](../docs/README.en.md) | **日本語**

![](https://r2.cosine.ren/i/2026/01/94383107ba4586f773938ed4dae34ff1.webp)

かわいい / アニメ風 / ピンクブルー配色のブログテーマ。ACG、フロントエンド、手帳系の個人サイトに最適で、優れたパフォーマンスを実現します。

> 名前は「小春日和（こはるびより）」に由来しています。晩秋から初冬にかけての、春のように暖かく晴れた日が続く時期のことです。

デザインは Hexo の [Shoka](https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/) テーマにインスピレーションを受け、モダンな技術スタックであなただけのブログを構築します。

このリポジトリはデモ用に整理されています。テーマ開発者のブログは https://blog.cosine.ren/ をご覧ください。気に入ったらスターをお願いします！

開発継続中

- **Astro** ベース、静的出力、高速ロード
- かわいい / アニメ風 / ピンクブルー配色、ACG・フロントエンド・手帳系サイトに最適
- マルチカテゴリー・マルチタグ対応、複雑な情報構造を強制しない
- パフォーマンスオーバーヘッドを最小限に
- Pagefind によるサーバーレス全文検索
- LQIP（低品質画像プレースホルダー）— 画像読み込み前にグラデーションプレースホルダーを表示

![デモ](https://r2.cosine.ren/i/2025/12/417b098dffce2ced9c0ff6009e5213df.gif)

[優れたパフォーマンス](https://pagespeed.web.dev/analysis/https-blog-cosine-ren/w6qzrwbp9b?hl=ja&form_factor=desktop)：デスクトップでオールグリーンを目指していますが、機能追加に伴い継続的なチェックが必要です！

![パフォーマンス](https://r2.cosine.ren/i/2025/12/e93f40c340a626c4ab72212a84cf6d5d.webp)

[フィードバック](https://cos.featurebase.app/)やロードマップはこちらからご確認いただけます。Issue も歓迎しますが、個人プロジェクトですので、フォークしてカスタマイズも自由にどうぞ！

![](https://r2.cosine.ren/i/2026/01/f1c239b4adf7771f10b954c389d87a74.webp)
![](https://r2.cosine.ren/i/2026/01/c962f82503abf68eb1f21b835873f241.webp)

## デプロイ

**Vercel**、**Netlify** などの主要プラットフォームへの自動デプロイに対応。環境に応じてアダプターが自動選択され、認識できないプラットフォームでは Node.js アダプターにフォールバックします（Docker やセルフホスティングに対応）。

### ワンクリックデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu&project-name=astro-koharu&repository-name=astro-koharu)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/cosZone/astro-koharu)

### Docker デプロイ

docker / docker-compose で Nginx 付きコンテナを実行することもできます：

1. `config/site.yaml` を編集して `comment.remark42` と `analytics.umami` セクションを設定します。
2. `./docker/rebuild.sh` を実行 — スクリプトが自動的に古いコンテナを停止し、再ビルド・再起動します。

> env ファイルのパスをカスタマイズしたり、`docker compose down` をスキップするには、スクリプト実行時に `ENV_FILE=/path/to/.env` または `SKIP_DOWN=true` を設定してください。

リポジトリルートから Compose を手動実行するには：

```bash
docker compose --env-file ./.env -f docker/docker-compose.yml up -d --build
```

### ローカル開発

1. プロジェクトをクローン

```bash
git clone https://github.com/cosZone/astro-koharu
```

2. プロジェクトディレクトリに移動して依存関係をインストール

```bash
cd astro-koharu
pnpm i
```

3. 開発サーバーを起動

```bash
pnpm dev
```

## 機能

- Astro 5.x ベースの静的サイト生成、優れたパフォーマンス
- エレガントなダーク/ライトテーマ切り替え
- Pagefind によるサーバーレス全文検索
- **切り替え可能なコメントシステム**：Waline（推奨）、Giscus、Remark42 に対応 — 設定ファイルでワンクリック切り替え、テーマ自動追従
- 完全な Markdown 拡張（GFM、シンタックスハイライト、自動目次、Mermaid 図表、インフォグラフィック）
- **Shoka 互換 Markdown 構文**：テキストエフェクト（下線/ハイライト/上付き・下付き/色）、スポイラーテキスト、ルビ注釈、注意ブロック、折りたたみブロック、タブカード、フレンドリンクカード、オーディオ/ビデオプレーヤー、クイズシステム（単一選択/複数選択/正誤/穴埋め）、数式（KaTeX）、コードブロック拡張（title/mark/command）— すべての機能を個別に切り替え可能
- 柔軟なマルチレベルカテゴリーとタグシステム
- [切り替え可能] マルチシリーズ記事対応（週間ダイジェスト、読書ノートなど、カスタム URL slug 付き）
  > **補足**：featuredSeries は記事数の多いカテゴリー向けで、ホームページのメインリストから分離して見やすくします。シリーズの最新記事のみがホームページでハイライトされ、残りはシリーズ専用ページからアクセスできますが、アーカイブ・カテゴリー・タグページでは通常通り表示されます。
- **独立ページシステム**：`src/pages/` に `.md` ファイルを作成してカスタムページ（about、プレイリストなど）を追加、カスタムカバータイトルとコメント切り替えに対応
- レスポンシブデザイン
- 下書きとピン留め投稿対応
- 読書プログレスバーと推定読了時間
- スマート目次ナビゲーション、CSS カウンターによる自動番号付き（投稿ごとに無効化可能）
- モバイル記事読了ヘッダー（現在のセクションタイトル、円形読了プログレス、展開可能な目次を表示）
- フレンドリンクシステムとアーカイブページ
- **国際化（i18n）**：中国語/英語/日本語 UI 翻訳内蔵、カスタム言語パック、コンテンツレベル翻訳（カテゴリー/シリーズ名）、言語切り替え、hreflang SEO タグ、ロケール対応 RSS フィード。デフォルトロケールの URL にはプレフィックスなし、他のロケールは自動プレフィックス付き（例：`/en/post/xxx`）
- RSS フィード対応
- LQIP 対応：画像読み込み前にグラデーションプレースホルダーを表示
- [切り替え可能] [transformers.js](https://huggingface.co/docs/transformers.js) を使用したセマンティック類似度ベースの記事レコメンドシステム
- [切り替え可能] AI 自動要約生成
- [切り替え可能] クリスマス特集：雪降り、クリスマスカラー、サンタ帽、イルミネーションなど季節エフェクト
- サーバーレスサイトお知らせシステム：設定ファイルで管理、時間制御・複数お知らせスタック・カスタムカラー・ホバーで既読
- スタイル付き [RSS](https://blog.cosine.ren/rss.xml) フィードページ
- **Koharu CLI**：バックアップ/リストア、コンテンツ生成、バックアップ管理のためのインタラクティブ CLI ツール
- **ローカル軽量 CMS アプリ**：`pnpm cms` で独立した CMS インターフェースを起動、記事管理・ブラウザ内編集・Markdown プレビューに対応。記事ページの編集ボタンからローカルエディター（VS Code / Cursor / Zed）へワンクリックジャンプ、`config/site.yaml` の `dev` セクションで設定（バックエンド版は今後検討、現在は静的版）

## Koharu CLI

ブログにはコンテンツ管理用のインタラクティブ CLI ツールが付属しています：

```bash
pnpm koharu              # インタラクティブメインメニュー
pnpm koharu new          # 新規コンテンツ作成（投稿/フレンドリンク）
pnpm koharu backup       # ブログコンテンツと設定のバックアップ
pnpm koharu restore      # バックアップからリストア
pnpm koharu update       # テーマの更新
pnpm koharu generate     # コンテンツアセット生成（LQIP、類似度、AI 要約）
pnpm koharu clean        # 古いバックアップの削除
pnpm koharu list         # すべてのバックアップを一覧表示
```

### コンテンツの作成

ブログ投稿とフレンドリンクをすばやく作成：

```bash
# インタラクティブタイプ選択
pnpm koharu new

# またはタイプを直接指定
pnpm koharu new post     # 新規ブログ投稿（インタラクティブにタイトル、カテゴリー、タグなどを入力）
pnpm koharu new friend   # 新規フレンドリンク（config/site.yaml に自動追加）
```

**新規投稿機能**：

- ピンイン slug の自動生成
- 既存カテゴリーからの選択
- マルチタグ対応
- ファイル重複検出
- frontmatter の自動生成

**新規フレンドリンク機能**：

- インタラクティブなサイト情報入力
- 設定ファイルへの自動追加
- YAML フォーマットとコメントの保持

### バックアップとリストア

テーマ更新前に CLI でコンテンツをバックアップ：

```bash
# 基本バックアップ（ブログ投稿、設定、アバター、.env）
pnpm koharu backup

# 完全バックアップ（すべての画像と生成アセットを含む）
pnpm koharu backup --full

# 最新バックアップからリストア
pnpm koharu restore --latest

# リストア対象ファイルのプレビュー（ドライラン）
pnpm koharu restore --dry-run
```

### テーマの更新

CLI で自動的にテーマを更新（自動バックアップ → プル → マージ → 依存関係インストール）：

```bash
# 完全更新フロー（デフォルトで先にバックアップ）
pnpm koharu update

# 更新のみチェック
pnpm koharu update --check

# バックアップをスキップして直接更新
pnpm koharu update --skip-backup

# 特定バージョンに更新
pnpm koharu update --tag v2.1.0

# クリーンモード（コンフリクトゼロ、強制バックアップ、初回マイグレーションやコンフリクトが多い場合に最適）
pnpm koharu update --clean

# リベースモード（履歴の書き換え、強制バックアップ、git に詳しいユーザー向け）
pnpm koharu update --rebase

# プレビュー（ドライラン）
pnpm koharu update --dry-run
```

> **更新モードの詳細：**
>
> - **デフォルトモード**：`git merge --no-ff` でアップストリームの更新をマージし、merge-base 情報を保持します。ユーザーコンテンツ（ブログ投稿、設定など）のコンフリクトはローカル版を自動採用し、テーマファイルのコンフリクトのみ手動解決が必要です。
> - **クリーンモード** (`--clean`)：すべてのテーマファイルを最新のアップストリーム版に置き換え、バックアップからユーザーコンテンツをリストアしてコンフリクトゼロの更新を実現します。初回マイグレーションやコンフリクトが多い場合に最適です。**注意：テーマファイルへのカスタム変更は保持されません。**
> - **リベースモード** (`--rebase`)：ローカルコミットをアップストリームの上にリプレイし、コミット履歴を書き換えます。git に詳しいユーザー向けです。
>
> CLI 更新コマンドは git 操作のラッパーです。git に詳しいユーザーは `git merge`/`git rebase` を直接使用することもできます。

### コンテンツ生成

```bash
# インタラクティブタイプ選択
pnpm koharu generate

# またはタイプを直接指定
pnpm koharu generate lqips        # LQIP 画像プレースホルダーの生成
pnpm koharu generate similarities # 類似度ベクトルの生成
pnpm koharu generate summaries    # AI 要約の生成
pnpm koharu generate all          # すべて生成
```

## 設定

すべてのブログ設定は **`config/site.yaml`** ファイルで管理されています：

- サイト情報（タイトル、サブタイトル、著者など）
- ソーシャルメディアリンク
- ナビゲーションメニュー
- 注目カテゴリーとシリーズ設定
- カテゴリーマッピング（表示名 → URL slug）
- フレンドリンクリスト
- お知らせシステム
- **コメントシステム**（Waline / Giscus / Remark42、Waline 推奨）
- アナリティクス（Umami）
- **国際化（i18n）**
- クリスマス特集切り替え
- 開発ツール（`config/site.yaml` の `dev` セクション、ローカルエディタージャンプ用）

詳しい設定手順はドキュメントをご覧ください。

### 多言語設定（i18n）

`config/site.yaml` の `i18n` セクションで対応言語を設定：

```yaml
i18n:
  defaultLocale: zh        # デフォルトロケール（URL プレフィックスなし）
  locales:
    - code: zh
      label: 中文
    - code: en
      label: English
```

**コンテンツ翻訳**：`config/i18n-content.yaml` でカテゴリー名、シリーズ名などのコンテンツレベル文字列の翻訳を設定：

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

**翻訳記事の追加**：翻訳記事を `src/content/blog/<locale>/` に配置し、デフォルトロケールのディレクトリ構造を反映：

```plain
src/content/blog/
├── tools/getting-started.md        # デフォルトロケール (zh)
├── en/tools/getting-started.md     # 英語翻訳
└── en/life/hello-world.md          # 英語翻訳
```

翻訳がない投稿は自動的にデフォルトロケールのコンテンツにフォールバックし、通知が表示されます。

**新しい言語の追加**：

1. `config/site.yaml` の `i18n.locales` に新しいロケールを追加
2. `src/i18n/translations/<code>.ts` を作成 — 必要に応じて UI 文字列を翻訳（未翻訳のキーはデフォルトロケールにフォールバック）
3. `src/i18n/translations/index.ts` に新しいロケールを登録
4. `config/i18n-content.yaml` にコンテンツ翻訳を追加（任意）

### コメントシステムの切り替え

`config/site.yaml` の `comment.provider` フィールドでコメントシステムを切り替え：

```yaml
comment:
  provider: waline # 'waline' | 'giscus' | 'remark42' | 'none'
  waline:
    serverURL: https://your-waline-server.vercel.app
    # ... その他の設定
```

**Waline 推奨**：セルフデプロイが簡単で機能が豊富（Markdown、絵文字、メール通知）、ページビュー統計付き。詳しい設定は[完全使用ガイド](/src/content/blog/tools/astro-koharu-guide.md#如何添加评论功能)をご覧ください。

## ドキュメント

- **[はじめに](../GETTING-STARTED.md)** - ブログを始める
- **[テーマの更新](../GETTING-STARTED.md#7-更新主题)** - 安全に新バージョンに更新する方法
- **[完全使用ガイド](../src/content/blog/tools/astro-koharu-guide.md)** - すべての機能の詳しい設定と使い方

## 機能ショーケース

- 画像読み込み前のグラデーションプレースホルダーで視覚体験を向上 - [ブログ記事](https://blog.cosine.ren/post/astro-lqip-implementation)
  ![LQIP](https://r2.cosine.ren/i/2025/12/40e44c8ac166183d5f823d7aa81fa792.webp)
- View Transitions API によるスムーズなダークモード切り替えアニメーション
  ![テーマ切り替え](https://r2.cosine.ren/i/2025/12/418c7602ce115660bed9db66739370d5.gif)
- Markdown 拡張 - リンク埋め込み機能 - [サンプル](https://blog.cosine.ren/post/my-claude-code-record-2)
  ![リンク埋め込み](https://r2.cosine.ren/i/2026/01/6804aa167fd4cf7022a9b511d52017ce.webp)
- Markdown 拡張 - [@antv/infographic](https://github.com/antvis/Infographic) で美しいインフォグラフィックを作成
  [インフォグラフィックガイド](https://koharu.cosine.ren/post/infographic-guide)
  ![インフォグラフィック構文](https://r2.cosine.ren/i/2026/01/581893e18557bcb837177cb2d6fb7af7.webp)
- スタイル付き RSS フィードページ - [サンプル](https://blog.cosine.ren/rss.xml)
  ![RSS フィード](https://r2.cosine.ren/i/2026/01/4476f67d1acea2e0991cc70d1d3cf6a1.webp)
- お知らせシステム
  ![お知らせ](https://r2.cosine.ren/i/2026/01/a4660955f52438b3cc2d21bdc931bbd4.gif)
- Shoka 互換 Markdown 構文 - 注意ブロック、折りたたみブロック、タブカード、テキストエフェクト、スポイラーテキスト、ルビ注釈、クイズなど
- オーディオ/ビデオプレーヤー - NetEase Cloud Music プレイリストと動画再生に対応

## このテーマを使用しているブログ

> [Zhilu のブログ](https://github.com/L33Z22L11/blog-v3)にならって、このテーマを使用しているブログのショーケースを設けました。\
> QQ グループ 598022684 でのディスカッションや、[フロントエンドチャンネル](https://t.me/cosine_front_end)のコメント欄でのチャットにぜひご参加ください。

| ブログ                                         | 作者       | リポジトリ                                                      | 備考                                   |
| ---------------------------------------------- | ---------- | --------------------------------------------------------------- | -------------------------------------- |
| **[Cosine のブログ](http://blog.cosine.ren/)** | **cosine** | [cosZone/astro-koharu](https://github.com/cosZone/astro-koharu) | このテーマ                              |
| [XueHua のブログ](https://xhblog.top/)         | XueHua-s   | [XueHua-s/astro-snow](https://github.com/XueHua-s/astro-snow)   | 機能を簡素化、スタートページを追加      |

## 謝辞

使用フォント：[Chill Round](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular)

astro-koharu の開発にインスピレーションとリファレンスを提供してくれた以下のプロジェクトに感謝します：

- [mx-space](https://github.com/mx-space)
- [Hexo テーマ Shoka](https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/)
- [waterwater.moe](https://github.com/lawvs/lawvs.github.io)
- [yfi.moe](https://github.com/yy4382/yfi.moe)
- [4ark.me](https://github.com/gd4Ark/gd4Ark.github.io)
- [Zhilu のブログ](https://blog.zhilu.site/)

...

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=cosZone/astro-koharu&type=date&legend=top-left)](https://www.star-history.com/#cosZone/astro-koharu&type=date&legend=top-left)

## License

GNU Affero General Public License version 3 (AGPL-3.0)

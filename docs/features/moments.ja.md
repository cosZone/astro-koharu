# ひとこと（Moments）

ひとことは [koharu-suite](https://github.com/cosZone/koharu-suite) の公開 Read API を利用する、任意の
動的アーカイブです。チャンネルのメッセージはリクエスト時に取得し、既存のブログ記事は引き続き静的生成されます。
初期状態では無効で、無効時は suite も `KOHARU_SUITE_URL` も動的ルートも必要ありません。

## 有効化

まず、ブラウザーと astro-koharu の Node コンテナの両方から到達できる公開 HTTPS origin で
koharu-suite を提供してください。管理 token、データベース認証情報、Docker 内だけのホスト名は指定しないでください。

`config/site.yaml` で有効にします：

```yaml
moments:
  enabled: true
  path: moments
  title: ひとこと
  description: チャンネルから届く短い日常記録
  ogImage: /img/moments-og.png
```

`.env` にサーバー専用 origin を設定します：

```env
KOHARU_SUITE_URL=https://suite.example.com
```

`path` には `life/moments` のような安全なネストパスも使用できます。有効化後は Astro Node standalone
でデプロイしてください。既定の nginx イメージはオンデマンドルートを実行しません。詳細は
[デプロイガイド](../overview/11-deployment-adapters.md)を参照してください。

## チャンネル設定

`channels` は省略できます。その場合、すべての公開チャンネルを表示し、slug は Telegram username、次に完全な
Suite channel UUID を使用します。長期運用する URL には安定した slug の指定を推奨します：

```yaml
moments:
  enabled: true
  path: life/moments
  pathAliases:
    - moments
  channels:
    - id: 550e8400-e29b-41d4-a716-446655440000
      slug: daily
      title: 日常
      primary: true
      hidden: false
      ogImage: /img/daily-og.png
      aliases:
        - old-daily
```

- 設定済みチャンネルは YAML の順序、新しく検出されたチャンネルはその後に並びます。
- `primary` は最大 1 件。未指定なら最初の表示チャンネルを使用します。
- `hidden` は suite の収集を止めず、すべてのひとことページ、検索、RSS、直接の詳細 URL から隠します。
- alias は明示した旧 URL だけを 308 リダイレクトし、username の変更履歴は自動追跡しません。
- channel ID は koharu-suite Owner Desk からコピーできます。`channels` を省略する場合は不要です。
- path、slug、alias が既存ルート、locale、特集シリーズ、相互に衝突するとビルドは失敗します。

ナビゲーション内の表示位置はプレースホルダーで指定できます：

```yaml
navigation:
  - name: ホーム
    path: /
  - feature: moments
    icon: ri:chat-smile-3-fill
  - name: このサイトについて
    path: /about
```

無効時は表示されません。省略した場合、有効な入口はアーカイブの後に追加されます。

## ルートとコンテンツの意味

ひとことにはトップ、チャンネルフィード、詳細、cursor ページング、簡易検索、全体／チャンネル RSS があります。
単一の canonical 動的領域で、`/en` や `/ja` には複製しません。Telegram は出典ですが、UI は「元のメッセージを
見る」と表示し、公開 URL を作れない場合は偽のリンクを出しません。

新しい順に表示します。フィードの長文は JavaScript が実際のオーバーフローを確認した後だけ折りたたみ、詳細では
常に全文を表示します。`revision > 1` は「更新済み」だけを示し、編集日時を推測しません。同じ `mediaGroupId` を持つ
隣接メッセージは 1 枚のアルバムカードにまとめます。Telegram Desktop JSON にこの値がない場合は、同一チャンネル、
同一時刻、連続する出典 ID、全項目にメディアがあり本文は最大 1 件、という条件をすべて満たす場合だけまとめます。
cursor 境界の候補は分離したままにし、各 suite UUID と詳細 permalink は引き続き有効です。
アルバムカードは全メディアを表示し、各項目はそれぞれの出典リンクを保持します。

RSS GUID は安定した suite message UUID、`pubDate` はその安定メンバーの元の `publishedAt` です。アルバムでは caption
編集に左右されないメンバー UUID を RSS GUID のアンカーにします。一方、アルバムカードと RSS item のリンクは本文を
提供するメンバーを指すため、開いた詳細と表示中の caption が一致します。編集後も GUID と公開日時は変わらず、本文だけが
現在の revision に更新されます。

## キャッシュと障害境界

既定の単一コンテナはプロセス内メモリーキャッシュを使います。通常ページと RSS は約 300 秒、検索は約 60 秒です。
新規・編集内容の反映には最大 5 分かかる場合があります。再起動で消去されるため、複数インスタンスには検証済みの共有
キャッシュが必要です。

存在しないチャンネル／メッセージは 404、rate limit は 429、network・timeout・upstream 5xx・不正レスポンスは
サイト外枠付き 503 になります。エラーは通常キャッシュしません。素の Node は 24 時間 stale-on-error を保証しません。
必要なら検証済み CDN、proxy、分散 provider で設定してください。suite の一時停止はひとことだけに影響し、静的ページと
コンテナの liveness は維持されます。

## ローカル実運用テスト

非公開記事を含むリポジトリではなく、公開リポジトリから作成した別 checkout を使用してください：

1. `config/site.yaml` で有効化し、`.env` に公開 suite origin を設定します。
2. `pnpm install` と `pnpm dev` を実行します。
3. トップ、チャンネル、詳細、検索、RSS、permalink、出典リンクを確認します。
4. テストチャンネルへテキストとメディアを送り、テキストを編集します。開発モードでは 5 分待つ必要はありません。
5. `pnpm docker:up:dynamic` の後、`pnpm test:moments:docker` を実行します。
6. suite を停止し、未キャッシュのひとこと URL が 503、静的ページが 200 のままか確認します。
7. suite を復旧し、`pnpm docker:down:dynamic` で終了します。

path、チャンネル override、タイトル、ナビゲーション、OG 設定の変更には再ビルドが必要です。suite 上のメッセージ追加・
編集には再ビルドは不要です。

---
title: 週間ダイジェスト Vol.1
link: weekly-example-1
catalog: true
date: 2024-01-04 00:00:00
description: 週間/シリーズ機能の動作を紹介するサンプルです。定期的に更新される連載コンテンツの公開に最適です。
tags:
  - 周刊
categories:
  - 周刊
---

これは週間/シリーズ機能の動作を紹介するサンプルです。

## 週間機能について

週間機能は astro-koharu の特色ある機能のひとつで、定期的に更新される連載コンテンツの公開に最適です：

- テックニュースレター
- 読書ノートシリーズ
- 学習ジャーナル
- プロジェクトの進捗報告

## 週間の設定

`config/site.yaml` で設定：

```yaml
featuredSeries:
  categoryName: 周刊       # カテゴリー名
  label: 週間ダイジェスト    # 表示ラベル
  fullName: テック週間ダイジェスト
  description: 週間の説明...
  cover: /img/weekly_header.webp
  enabled: true            # false で無効化
```

## 週間の特徴

1. **専用ページ** - 各シリーズは `/weekly` に専用ページがあります
2. **ホームページ表示** - 最新号がホームページにピン留めされます
3. **分離されたリスト** - 週間投稿は通常の投稿リストには表示されません
4. **シリーズナビゲーション** - 前号/次号のナビゲーション

## 今週のコンテンツ

### おすすめ記事

- [Astro 5.0 の新機能](https://astro.build)
- [Tailwind CSS 4.0 リリース](https://tailwindcss.com)

### ツール紹介

| ツール  | 用途               | リンク     |
| ------- | ------------------ | ---------- |
| Biome   | コードリンティング  | biome.dev  |
| Motion  | アニメーション      | motion.dev |

### 今週の学び

今週学んだこと：

- [x] Astro Content Collections
- [x] Tailwind テーマ設定
- [ ] Motion の高度なアニメーション

## 次号の予告

次号ではさらに高度な機能を取り上げます — お楽しみに！

---

今週のニュースレターをお読みいただきありがとうございました！

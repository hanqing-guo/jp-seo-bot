# JP SEO Bot

> 日本市場特化 SEO プラットフォーム — JAPAN_SPEC v1.1 全章実装の MVP デモ。

欧米製 SEO ツールが取りこぼす「日本独自」の領域 — 形態素解析、被リンク
プラットフォーム、MEO、WordPress、Schema、日本語 E-E-A-T、季節カレンダー
— をすべて一画面に詰めた管理ツール。

---

## クイックスタート

```bash
git clone <this-repo>
cd jp-seo-bot
npm install
npm run dev      # http://localhost:5180 で起動
```

ビルド:
```bash
npm run build    # tsc --noEmit && vite build → dist/
npm run preview  # production ビルドをローカルで確認
```

ブラウザで開けば 12 のメニュー(コア 8 + 日本特化 4 + Schema 1)が
すぐに使えます。データはすべて `localStorage` に保存され、設定ページから
リセット可能。

---

## 実装済み機能(JAPAN_SPEC 対応表)

| メニュー | 仕様参照 | 主要機能 |
|---|---|---|
| ダッシュボード | — | KPI / 流入チャート / 直近コンテンツ / 診断ハイライト |
| キーワード分析 | **§A** | kuromoji.js 形態素解析、品詞分布、SEO 重要名詞抽出、表記バリアント(ひらがな/カタカナ/ローマ字) |
| コンテンツ生成 | **§H + §G** | リアルタイム 12 項目スコアリング(共起語/可読性/密度/見出し/著者/出典/更新日/薬機法/敬語/FAQ)+ 改善提案 |
| ランキング追跡 | — | 12 ヶ月推移グラフ + 月次変動表 |
| サイト診断 | — | 重大/警告/情報の問題リスト + サイトスコア |
| 競合分析 | — | DR / オーガニック流入 / 主要キーワード / 重複率 |
| レポート | — | 月次 SEO レポート生成 + 履歴 |
| 設定 | — | API キー / GSC / データリセット |
| **被リンク** | **§B** | 日本特有 26 プラットフォーム(はてな / note / PR TIMES / Boxil / Qiita / Yahoo!知恵袋 / Wikipedia…)+ PR 下書き AI 生成 |
| **MEO 対策** | **§C** | GBP 15 項チェックリスト + 5 軸レーダー + 9 ローカルディレクトリ一覧 |
| **WordPress 連携** | **§D** | REST API 接続(Application Password)+ Yoast/RankMath/AIOSEO/SEO SIMPLE PACK 検出 |
| **コンテンツカレンダー** | **§F** | 月間グリッド + JAPAN_CONTENT_CALENDAR 季節タグ + AI アイデア追加 |
| **Schema ジェネレーター** | **§E + §G** | LocalBusiness / FAQ / Breadcrumb / Article / SoftwareApplication 5 種 JSON-LD 出力 |

---

## アーキテクチャ

```
src/
├── App.tsx                 # ルーティング (12 menu + Schema)
├── main.tsx                # ReactDOM + I18nProvider + StoreProvider
├── components/             # Layout / Sidebar / Topbar / PageHeader / Stat / SectionTitle / MiniSpark
├── lib/
│   ├── japaneseNlp.ts      # §A kuromoji + 共起語 + 可読性 + 密度 + 品詞分布
│   ├── japaneseScore.ts    # §H 重み付け 12 項目スコアリング
│   ├── japaneseVariants.ts # §A.2 ひらがな ⇔ カタカナ + ヘボン式
│   ├── i18n.tsx            # ja / en / zh
│   └── cn.ts
├── store/
│   ├── StoreProvider.tsx   # localStorage 永続化
│   ├── mockData.ts         # §B 26 件被リンク原文・§F 季節カレンダー・§G リッチリザルト一覧
│   └── types.ts            # §I 型化
└── pages/                  # 13 画面
public/dict/                # kuromoji 辞書 12 ファイル
db/migrations/0001_initial.sql  # §I + コア用 Postgres スキーマ
```

### 技術スタック

- **フロント**: Vite + React 18 + TypeScript + Tailwind CSS + React Router
- **チャート**: Recharts
- **アイコン**: Lucide
- **日本語 NLP**: kuromoji.js (辞書は `public/dict/` 配信)
- **永続化(現状)**: localStorage(`jp-seo-bot:store`)
- **DB スキーマ蓝図**: PostgreSQL / Supabase (`db/migrations/0001_initial.sql`)

---

## デモデータと外部連携の境界

| 機能 | 実 API 呼び出し | demo モック |
|---|---|---|
| §A 形態素解析 | ✅ kuromoji.js 実動作 | — |
| §H スコアリング | ✅ 入力テキストに対し即時計算 | — |
| §E Schema 生成 | ✅ JSON-LD 出力 | — |
| §B 被リンクリスト | — | 26 件 spec 原文を JSON 化 |
| §B PR 下書き | テンプレ生成のみ。Claude API 連携で本格化 | テンプレ表示 |
| §C MEO チェックリスト | — | GBP 紐付けは別途 OAuth 必要 |
| §D WordPress | ✅ `fetch('/wp-json/wp/v2/posts')` 実呼び出し | 失敗時モック表示 |
| §F カレンダー | — | 季節アイデアの自動生成あり |

WordPress 連携を試すには:
1. WP 管理画面で Application Password を発行
2. 設定画面で WP URL / ユーザー名 / Application Password を入力
3. 「接続テスト」をクリック

---

## データベース展開(本番化時)

`db/migrations/0001_initial.sql` には以下 10 テーブルが定義済み:

- `sites` / `keywords` / `content_articles` / `audit_issues`(コア)
- `backlink_sources`(§I)
- `meo_profiles`(§I)
- `wordpress_integrations`(§I)
- `content_calendar`(§I)
- `rank_history` / `competitors`

Supabase に流す場合:
```bash
supabase db push db/migrations/0001_initial.sql
```

または psql:
```bash
psql $DATABASE_URL -f db/migrations/0001_initial.sql
```

---

## 残タスク(次フェーズ案)

JAPAN_SPEC §K に従い次の Phase 3-4 で追加予定:

- Claude API バインディング(記事自動生成 / PR 下書き本実装)
- Google Search Console / Google Analytics OAuth
- GBP API 連携(現状は手動入力)
- kuroshiro による高精度ローマ字変換(現状は最小マップ)
- Supabase 認証 + Row Level Security
- Cloudflare Workers / Vercel Edge へのデプロイ

---

## ライセンス

社内 / プロトタイプ用。商用展開時は別途要相談。

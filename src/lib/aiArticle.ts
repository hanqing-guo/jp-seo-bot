// AI 記事生成 service (フロント側)
//
// 動作:
//   1. VITE_API_BASE が設定されていれば、後端 Edge Function
//      (generate-article) に POST して本物の AI 記事を取得。
//   2. 失敗 / 未設定なら、ブラウザ側で template fallback を生成して
//      即座にプレビューを返す(API key 無しでも demo が動く)。
//
// 後端を deploy して VITE_API_BASE を .env に入れれば、コード変更なしで
// 本物の DeepSeek / Claude 生成に切り替わる。

import type { DifficultyTier } from '../store/types'

export interface DraftArticle {
  title: string
  markdown: string
  /** 'deepseek' | 'claude' | 'template' */
  provider: string
}

export interface GenerateOptions {
  keyword: string
  tier: DifficultyTier
  count: number
}

function apiBase(): string {
  return import.meta.env.VITE_API_BASE ?? ''
}

export async function generateArticles(opts: GenerateOptions): Promise<DraftArticle[]> {
  const base = apiBase()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/generate-article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
        signal: AbortSignal.timeout(60000),
      })
      if (res.ok) {
        const data = (await res.json()) as { articles?: DraftArticle[] }
        if (Array.isArray(data.articles) && data.articles.length > 0) {
          return data.articles
        }
      }
    } catch {
      // ネットワーク / タイムアウト → fallback へ
    }
  }
  return templateArticles(opts)
}

// ────────────────────────────────────────────────────────────
// Template fallback — API なしでも構造化された日本語 SEO 草稿を生成
// ────────────────────────────────────────────────────────────

const ANGLES = [
  { suffix: 'とは?基礎から徹底解説', intent: '情報', focus: '基礎知識・定義・メリット' },
  { suffix: 'の選び方 — 失敗しない 5 つのポイント', intent: '商業', focus: '比較軸・選定基準' },
  { suffix: 'おすすめ比較【2026 年最新版】', intent: '商業', focus: '製品/サービス比較' },
  { suffix: 'の料金・費用相場まとめ', intent: '取引', focus: '価格・コスト・ROI' },
  { suffix: '導入事例と成功パターン', intent: '情報', focus: '実例・体験談' },
  { suffix: 'のよくある質問(FAQ)', intent: '情報', focus: 'Q&A・疑問解消' },
  { suffix: '初心者向け完全ガイド', intent: '情報', focus: '入門・手順' },
  { suffix: '最新トレンドと今後の展望', intent: '情報', focus: '業界動向・将来予測' },
]

function templateArticles(opts: GenerateOptions): DraftArticle[] {
  const { keyword, count } = opts
  const co = coKeywords(keyword)
  const today = new Date().toISOString().slice(0, 10)
  const articles: DraftArticle[] = []

  for (let i = 0; i < count; i++) {
    const angle = ANGLES[i % ANGLES.length]
    const variantSuffix = i >= ANGLES.length ? `(${Math.floor(i / ANGLES.length) + 1})` : ''
    const title = `${keyword}${angle.suffix}${variantSuffix}`
    articles.push({
      title,
      provider: 'template',
      markdown: buildMarkdown(keyword, title, angle, co, today),
    })
  }
  return articles
}

function buildMarkdown(
  keyword: string,
  title: string,
  angle: { intent: string; focus: string },
  co: string[],
  today: string,
): string {
  const coLine = co.length > 0 ? co.join('・') : keyword
  return `# ${title}

最終更新: ${today} | 著者: JP SEO Bot 編集部(SEO 専門ライター監修)

> この記事は「${keyword}」(検索意図: ${angle.intent}/フォーカス: ${angle.focus})を
> ターゲットに自動生成された下書きです。公開前に事実確認・自社情報の追記を行ってください。

## はじめに

「${keyword}」について検索しているあなたは、${angle.focus}に関心があるはずです。
本記事では、初めての方にもわかりやすく、具体例を交えて解説します。

関連キーワード: ${coLine}

## ${keyword}の基本

${keyword}とは、${coLine}に関わる重要なテーマです。
日本国内でも検索数が増加傾向にあり、正しく理解することで成果につながります。

- ポイント 1: 基礎を押さえる
- ポイント 2: 自社の状況に当てはめる
- ポイント 3: 継続的に改善する

## ${keyword}で押さえるべき 3 つの観点

### 1. ${co[0] ?? '品質'}の確保
最初に重視すべきは品質です。${keyword}において、${co[0] ?? '品質'}は成果を左右します。

### 2. ${co[1] ?? 'コスト'}とのバランス
次に${co[1] ?? 'コスト'}とのバランスを考えます。過剰投資は避け、費用対効果を意識しましょう。

### 3. ${co[2] ?? '継続性'}
最後に${co[2] ?? '継続性'}です。短期で結果を求めず、中長期で取り組むことが重要です。

## よくある質問(FAQ)

**Q1. ${keyword}を始めるのに費用はどのくらいかかりますか?**
A. 取り組む範囲によりますが、月数千円から始められるケースもあります。

**Q2. 効果が出るまでどのくらいかかりますか?**
A. 一般的に 3〜10 ヶ月が目安です。難易度によって変動します。

**Q3. 専門知識がなくても大丈夫ですか?**
A. はい。基本を押さえ、ツールを活用すれば初心者でも取り組めます。

## まとめ

${keyword}について、${angle.focus}を中心に解説しました。
まずは小さく始め、データを見ながら改善を重ねることが成功への近道です。

---
出典: 自社調査・公開情報(2026 年) / 本記事は下書きです。公開前に校正してください。`
}

/**
 * キーワードを空白・助詞で簡易分割して共起語候補を作る。
 * 形態素解析(kuromoji)はここでは使わず軽量に。
 */
function coKeywords(keyword: string): string[] {
  const tokens = keyword
    .split(/[\s　,、]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)
  const extras = ['比較', '選び方', '料金', 'おすすめ', '事例']
  const merged = [...new Set([...tokens, ...extras])]
  return merged.slice(0, 5)
}

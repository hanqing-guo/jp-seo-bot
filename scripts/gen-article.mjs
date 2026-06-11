// DeepSeek V4 Pro で 1 本の日本語 SEO 記事を生成し、content/blog-articles.mjs の形式で出力する CLI。
// jp-seo-bot-blog-auto（週次自動投稿タスク）が呼ぶ。Claude ではなく DeepSeek V4 Pro が本文を書く。
//
// 使い方:
//   node --env-file=supabase/.env scripts/gen-article.mjs "<keyword>" "<angle>" "<slug>" [--write]
//   - --write なし: 生成した記事オブジェクトの JS ブロックを stdout に出力（プレビュー/テスト用）
//   - --write あり: content/blog-articles.mjs の articles 配列末尾に追記する
//
// 品質ルールは api/_lib/seoGen.ts と同等（answer-first / E-E-A-T / GEO / 数字と出典 / 景表法・薬機法 /
// [体験談/データを追記] 編集ゲート / ## まとめ）。さらに build-blog.mjs のレンダラ制約に合わせて
// body は「## ### 段落 - **太字**」のみ（# / 数字リスト / リンク / 表 / バッククォート / ${  禁止）。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = 'deepseek-v4-pro' // 高品質モデル（deepseek-chat=V4-Flash の弱い方は使わない）

const [, , keyword, angle = 'とは?基礎から徹底解説', slug] = process.argv
const WRITE = process.argv.includes('--write')

if (!keyword || !slug) {
  console.error('usage: node --env-file=supabase/.env scripts/gen-article.mjs "<keyword>" "<angle>" "<slug>" [--write]')
  process.exit(1)
}
const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
  console.error('✗ DEEPSEEK_API_KEY が未設定（--env-file=supabase/.env を付けて実行）')
  process.exit(1)
}

const prompt = `あなたは日本市場専門の、実績豊富な SEO ライター兼コンサルタントです。
以下のキーワードで Google Japan / Yahoo! JAPAN の検索1ページ目を狙える、読者の検索意図を完全に満たす高品質な日本語 SEO 記事を JSON で書いてください。

【ターゲットキーワード】${keyword}
【記事の切り口】${angle}

# 検索意図
このキーワードで検索する人が本当に知りたいことを見極め、記事全体をそれに100%応える構成にする。

# 構成（オンページ SEO + GEO）
- 本文の冒頭1〜2文で結論を先に述べる（answer-first：AI 検索・強調スニペットに引用されやすくする）
- H2 で検索意図を分解した見出しを3〜5個（必要なら H3）。各セクションは「結論→理由→具体例」
- 引用されやすいよう、具体的な数値・手順・固有名詞を2〜3点入れる。可能なら出典（公的機関・公式情報など）を明記
- 一般論で薄く流さず、現場で使える実践情報に。誇大表現・効果保証は禁止（薬機法・景品表示法に配慮）
- 実体験や自社データを入れるべき箇所には「[体験談/データを追記]」と明記（後で人間が一次情報を1つ足す編集ゲート＝Google ペナルティ回避の鍵）
- 本文中で一度だけ **JP SEO Bot** に自然に言及（太字、リンク不要）
- 末尾に必ず「## まとめ」セクション

# body の Markdown 制約（厳守。レンダラが対応するのはこれだけ）
- 使えるのは「## 見出し」「### 小見出し」「普通の段落」「- 箇条書き」「**太字**」のみ
- 禁止：「# H1」（タイトルは body に含めない）／数字付きリスト（1. 2.）／リンク記法 []()／表／画像／コードブロック／バッククォート／ドル記号と波括弧の連続
- body にタイトル・日付・著者行を含めない（システムが別途付与する）

# 出力（JSON のみ。前置き・コードフェンス不要）
{
  "title": "32文字以内・キーワードを含む・クリックしたくなる",
  "description": "120文字以内の meta description（キーワードを含む）",
  "body": "本文 Markdown（上記制約を厳守、## から始める、# は使わない）",
  "faq": [{"q": "質問文", "a": "回答文"}]
}
faq は3〜5問、誠実に。`

const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 6000,
    temperature: 0.7,
  }),
  signal: AbortSignal.timeout(120000),
})
if (!res.ok) {
  console.error(`✗ DeepSeek HTTP ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const data = await res.json()
const rawText = data?.choices?.[0]?.message?.content ?? ''
let obj
try {
  obj = JSON.parse(rawText.replace(/```json\s*|\s*```/g, '').trim())
} catch (e) {
  console.error('✗ JSON parse 失敗:', e.message, '\n--- raw ---\n', rawText.slice(0, 500))
  process.exit(1)
}
if (!obj.title || !obj.body) {
  console.error('✗ title / body が欠落')
  process.exit(1)
}

// ── body をレンダラ制約に合わせて安全化 ──
function sanitizeBody(md) {
  return String(md)
    .replace(/^\s*#\s+.*$/gm, '')             // # H1 を全て除去（複数あっても）
    .replace(/`/g, "'")                       // バッククォート → '（テンプレートリテラル破壊防止）
    .replace(/\$\{/g, '$（')                   // ${ を無害化
    .replace(/^\s*\d+\.\s+/gm, '- ')          // 数字リスト → 箇条書き
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [text](url) → text
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
const body = sanitizeBody(obj.body)
const faq = Array.isArray(obj.faq)
  ? obj.faq.filter((f) => f && f.q && f.a).map((f) => ({ q: String(f.q), a: String(f.a) }))
  : []
// JST 基準の日付（UTC だと日本の朝 0〜9 時に前日になる）
const date = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)

const article = {
  slug,
  title: String(obj.title).slice(0, 60),
  description: String(obj.description ?? '').slice(0, 160),
  keyword,
  date,
  body,
  faq,
}

// blog-articles.mjs に追記できる JS ブロックを組み立てる（文字列は JSON.stringify で安全に、body は backtick）
const block =
  `  {\n` +
  `    slug: ${JSON.stringify(article.slug)},\n` +
  `    title: ${JSON.stringify(article.title)},\n` +
  `    description: ${JSON.stringify(article.description)},\n` +
  `    keyword: ${JSON.stringify(article.keyword)},\n` +
  `    date: ${JSON.stringify(article.date)},\n` +
  `    body: \`${body}\`,\n` +
  `    faq: ${JSON.stringify(article.faq)},\n` +
  `  },\n`

if (!WRITE) {
  console.log(block)
  console.error(`\n[preview] slug=${slug} title="${article.title}" body=${body.length}字 faq=${faq.length}問 model=${MODEL}`)
  process.exit(0)
}

// ── --write: articles 配列の閉じ ] の直前に挿入 ──
const path = resolve(ROOT, 'content/blog-articles.mjs')
const src = readFileSync(path, 'utf8')
const close = src.lastIndexOf(']')
if (close < 0) {
  console.error('✗ blog-articles.mjs に articles 配列の ] が見つからない')
  process.exit(1)
}
const updated = src.slice(0, close) + block + src.slice(close)
writeFileSync(path, updated)
console.log(`[gen-article] appended slug=${slug} (model=${MODEL}). 次は npm run build で検証してください。`)

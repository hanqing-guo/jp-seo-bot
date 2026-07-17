// DeepSeek V4 Pro で既存記事を「検索1ページ目」水準にリライト・拡充する CLI。
// gen-article.mjs の姉妹スクリプト。Claude ではなく DeepSeek V4 Pro が本文を書く。
//
// 使い方:
//   node --env-file=supabase/.env scripts/expand-article.mjs "<slug>" "<拡充指示>" [--write]
//   - --write なし: 生成した記事オブジェクトをプレビュー出力
//   - --write あり: content/blog-articles.mjs の該当エントリを差し替え、dateUpdated を今日(JST)に設定
//
// gen-article.mjs との違い:
//   - 新規追記ではなく既存エントリの in-place 差し替え（slug / keyword / date は不変）
//   - build-blog.mjs が [text](url) リンクと GitHub テーブルに対応済みのため、本文に
//     文脈内部リンク（/blog/<slug>/）と Google 公式ドキュメントへの外部引用を許可する。
//     ただし内部リンクは実在 slug のみ・外部リンクはホワイトリストのみ（それ以外はテキスト化）。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARTICLES_PATH = resolve(ROOT, 'content/blog-articles.mjs')
const MODEL = 'deepseek-v4-pro' // 高品質モデル（deepseek-chat=V4-Flash の弱い方は使わない）

// 外部引用ホワイトリスト（Google 公式・日本語）。ハルシネーション URL の混入を機械的に防ぐ。
const EXTERNAL_WHITELIST = [
  'https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ja',
  'https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ja',
  'https://developers.google.com/search/docs/essentials/spam-policies?hl=ja',
  'https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=ja',
  'https://developers.google.com/search/blog/2023/02/google-search-and-ai-content?hl=ja',
]

const [, , slug, instructions] = process.argv
const WRITE = process.argv.includes('--write')

if (!slug || !instructions) {
  console.error('usage: node --env-file=supabase/.env scripts/expand-article.mjs "<slug>" "<拡充指示>" [--write]')
  process.exit(1)
}
const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
  console.error('✗ DEEPSEEK_API_KEY が未設定（--env-file=supabase/.env を付けて実行）')
  process.exit(1)
}

const { articles } = await import(pathToFileURL(ARTICLES_PATH).href)
const current = articles.find((a) => a.slug === slug)
if (!current) {
  console.error(`✗ slug=${slug} が content/blog-articles.mjs に存在しない`)
  process.exit(1)
}
const slugSet = new Set(articles.map((a) => a.slug))
const internalCandidates = articles
  .filter((a) => a.slug !== slug)
  .map((a) => `- /blog/${a.slug}/ … ${a.title}`)
  .join('\n')

const prompt = `あなたは日本市場専門の、実績豊富な SEO ライター兼コンサルタントです。
以下の既存記事を、Google Japan / Yahoo! JAPAN の検索1ページ目を狙える水準にリライト・大幅拡充してください。

【ターゲットキーワード】${current.keyword}
【現在のタイトル】${current.title}
【今回の拡充指示】${instructions}

【既存の本文（この内容・データを土台に拡充する。元記事にある具体的な数値・実測データは一言一句変えず全て保持する）】
${current.body}

# 品質要件
- 本文は日本語 3000〜4500 文字。冒頭1〜2文で結論を先に述べる（answer-first）
- H2 見出し 4〜6 個で検索意図を分解（必要なら H3）。各セクションは「結論→理由→具体例」
- GitHub 形式のテーブル（| A | B | 形式）を最低 1 つ入れる（比較・手順・チェックリスト等）
- 具体的な数値・手順・固有名詞を入れ、誇大表現・効果保証は禁止（薬機法・景品表示法に配慮）
- 実体験や自社データが必要な箇所は最大1箇所だけ「[体験談/データを追記]」と明記
- 本文中で一度だけ **JP SEO Bot** に自然に言及（太字）
- 末尾に必ず「## まとめ」セクション

# リンク要件（今回から本文リンク可）
- 文脈に合う内部リンクを 2〜3 本、必ず下記の実在記事から選んで [アンカーテキスト](/blog/スラッグ/) 形式で本文に織り込む:
${internalCandidates}
- 外部引用を 1〜2 本、必ず下記 URL のみから選んで [アンカーテキスト](URL) 形式で入れる（これ以外の外部 URL は禁止）:
${EXTERNAL_WHITELIST.map((u) => `- ${u}`).join('\n')}

# body の Markdown 制約（厳守）
- 使えるのは「## 見出し」「### 小見出し」「段落」「- 箇条書き」「**太字**」「| テーブル |」「[リンク](URL)」のみ
- 禁止：「# H1」／数字付きリスト（1. 2.）／画像／コードブロック／バッククォート／ドル記号と波括弧の連続
- body にタイトル・日付・著者行を含めない

# 出力（JSON のみ。前置き・コードフェンス不要）
{
  "title": "40文字以内・キーワードを含む・拡充指示の狙いも反映",
  "description": "120文字以内の meta description（キーワードを含む）",
  "body": "本文 Markdown（上記制約を厳守、## から始める）",
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
    max_tokens: 16000, // V4 Pro は reasoning にもトークンを使うため、少なすぎると本文が空のまま切れる
    temperature: 0.7,
  }),
  signal: AbortSignal.timeout(240000), // V4 Pro が 5k+ トークンを書くと 120s を超えることがある
})
if (!res.ok) {
  console.error(`✗ DeepSeek HTTP ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const data = await res.json()
if (data?.usage) console.error(`[usage] prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} model=${MODEL}`)
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

// ── body をレンダラ制約に合わせて安全化（リンクは許可制で残す）──
function sanitizeBody(md) {
  return String(md)
    .replace(/^\s*#\s+.*$/gm, '')             // # H1 を全て除去
    .replace(/`/g, "'")                       // バッククォート → '（テンプレートリテラル破壊防止）
    .replace(/\$\{/g, '$（')                   // ${ を無害化
    .replace(/^\s*\d+\.\s+/gm, '- ')          // 数字リスト → 箇条書き
    // リンク検閲: 内部は実在 slug のみ、外部はホワイトリストのみ。違反はアンカーテキスト化。
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, href) => {
      const im = href.match(/^\/blog\/([^/]+)\/?$/)
      if (im) return slugSet.has(im[1]) ? `[${text}](/blog/${im[1]}/)` : text
      if (EXTERNAL_WHITELIST.includes(href)) return `[${text}](${href})`
      return text
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
const body = sanitizeBody(obj.body)
const faq = Array.isArray(obj.faq)
  ? obj.faq.filter((f) => f && f.q && f.a).map((f) => ({ q: String(f.q), a: String(f.a) }))
  : current.faq
// JST 基準の日付
const dateUpdated = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)

const updatedArticle = {
  slug,
  title: String(obj.title).slice(0, 60),
  description: String(obj.description ?? current.description).slice(0, 160),
  keyword: current.keyword,
  date: current.date,
  dateUpdated,
  body,
  faq,
}

const block =
  `  {\n` +
  `    slug: ${JSON.stringify(updatedArticle.slug)},\n` +
  `    title: ${JSON.stringify(updatedArticle.title)},\n` +
  `    description: ${JSON.stringify(updatedArticle.description)},\n` +
  `    keyword: ${JSON.stringify(updatedArticle.keyword)},\n` +
  `    date: ${JSON.stringify(updatedArticle.date)},\n` +
  `    dateUpdated: ${JSON.stringify(updatedArticle.dateUpdated)},\n` +
  `    body: \`${body}\`,\n` +
  `    faq: ${JSON.stringify(updatedArticle.faq)},\n` +
  `  },`

const internalLinks = [...body.matchAll(/\]\((\/blog\/[^)]+)\)/g)].map((m) => m[1])
const externalLinks = [...body.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1])

if (!WRITE) {
  console.log(block)
  console.error(`\n[preview] slug=${slug} title="${updatedArticle.title}" body=${body.length}字 faq=${faq.length}問`)
  console.error(`[links] internal=${JSON.stringify(internalLinks)} external=${JSON.stringify(externalLinks)}`)
  process.exit(0)
}

// ── --write: slug をアンカーに既存エントリのブロックを差し替え ──
const src = readFileSync(ARTICLES_PATH, 'utf8')
const anchorMatch = src.match(new RegExp(`slug: ['"]${slug}['"]`))
if (!anchorMatch) {
  console.error(`✗ blog-articles.mjs 内に slug アンカーが見つからない: ${slug}`)
  process.exit(1)
}
const anchorIdx = src.indexOf(anchorMatch[0])
const start = src.lastIndexOf('\n  {', anchorIdx)
const endMark = '\n  },'
const end = src.indexOf(endMark, anchorIdx)
if (start < 0 || end < 0) {
  console.error('✗ エントリ境界の特定に失敗（フォーマット不一致）')
  process.exit(1)
}
const updated = src.slice(0, start) + '\n' + block + src.slice(end + endMark.length)
writeFileSync(ARTICLES_PATH, updated)

// ── 検証: 差し替え後もモジュールとして正しく読めるか。壊れていたら復元 ──
try {
  const check = await import(pathToFileURL(ARTICLES_PATH).href + `?v=${Date.now()}`)
  const entry = check.articles.find((a) => a.slug === slug)
  if (check.articles.length !== articles.length || !entry || entry.body.length !== body.length) {
    throw new Error(`検証不一致 (count=${check.articles.length}/${articles.length}, entry=${!!entry})`)
  }
} catch (e) {
  writeFileSync(ARTICLES_PATH, src)
  console.error(`✗ 差し替え後の検証に失敗 → 元に復元した: ${e.message}`)
  process.exit(1)
}
console.log(`[expand-article] replaced slug=${slug} body=${current.body.length}→${body.length}字 dateUpdated=${dateUpdated} (model=${MODEL})`)
console.log(`[links] internal=${JSON.stringify(internalLinks)} external=${JSON.stringify(externalLinks)}`)
console.log('次は npm run build で検証してください。')

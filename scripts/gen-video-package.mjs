// 既存ブログ記事(content/blog-articles.mjs)から、YouTube 用の「成品级·動画パッケージ」を
// DeepSeek V4 Pro で生成する CLI。録画/アップロード以外(脚本・タイトル・概要欄・CTA・
// サムネ文案・タグ・Shorts・字幕用テロップ)を全自動で揃える。
//
// 使い方:
//   node --env-file=supabase/.env scripts/gen-video-package.mjs <slug> [--write]
//   - <slug>     : content/blog-articles.mjs の記事 slug(引数なしで一覧表示)
//   - --write なし: 生成した markdown を stdout に出力(プレビュー)
//   - --write あり: content/video-packages/<slug>.md に保存
//
// 設計: lead-gen 優先。CTA は enkiseojp.com の「無料お試し(登録不要でキーワード難易度＋
//       最適プランが分かる)」へ送客。景表法に配慮し「必ず1位」等の保証表現は禁止。

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { articles, SITE } from '../content/blog-articles.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = 'deepseek-v4-pro'

const slug = process.argv[2]
const WRITE = process.argv.includes('--write')

if (!slug || slug.startsWith('--')) {
  console.error('usage: node --env-file=supabase/.env scripts/gen-video-package.mjs <slug> [--write]\n')
  console.error('利用可能な slug:')
  for (const a of articles) console.error('  - ' + a.slug + '  (' + a.title + ')')
  process.exit(1)
}

const article = articles.find((a) => a.slug === slug)
if (!article) {
  console.error(`✗ slug "${slug}" が見つかりません。引数なしで一覧を確認してください。`)
  process.exit(1)
}

const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
  console.error('✗ DEEPSEEK_API_KEY が未設定(--env-file=supabase/.env を付けて実行)')
  process.exit(1)
}

const prompt = `あなたは日本の中小企業向け SEO サービス「JP SEO Bot」(${SITE})の YouTube マーケティング担当者です。
以下の既存ブログ記事をもとに、YouTube に投稿する「動画パッケージ」を JSON で作ってください。
目的は再生数ではなく集客(lead-gen):視聴者(自分でSEOしたい中小企業・個人事業主)を ${SITE} の
「無料お試し(登録不要でキーワードの難易度と最適プランが1分で分かるツール)」へ送客することです。

【元記事タイトル】${article.title}
【ターゲットキーワード】${article.keyword}
【元記事本文】
${article.body}

# 方針
- 冒頭5秒で視聴者の悩みを刺すフックを作る(離脱を防ぐ)
- 中身は「現場で今日から自分でできる」実務。一般論で薄く流さない
- 本編のどこか1箇所で、自然に「実際にツールで見てみましょう」と ${SITE} の無料ツールに触れる
- 誇大表現・効果保証は禁止(薬機法/景品表示法)。「必ず1位」「絶対」は使わない。「勝てるキーワードが分かる」「自分でできる」はOK
- 口播は話し言葉で。専門用語は噛み砕く
- Shorts は本編から切り出せる単発Tipsを3本(各30〜60秒・それぞれ独立したフック付き)

# 出力(JSON のみ。前置き・コードフェンス不要)
{
  "title": "YouTubeタイトル(32文字前後・クリックしたくなる・キーワードを含む)",
  "thumbnailText": "サムネ文案(8文字前後・短く強く・2行まで)",
  "hook": "最初の5秒の掴み(1〜2文)",
  "script": "本編の口播脚本(全文・話し言葉・5〜8分相当。セクションは【見出し】で区切る。改行は\\nで)",
  "chapters": [{"t": "0:00", "label": "イントロ"}],
  "description": "YouTube概要欄(記事の要約3〜4行 + CTA『▼キーワードの勝てる/勝てないが1分で分かる無料ツール ${SITE}』+ 関連リンク)",
  "tags": ["タグ1", "タグ2"],
  "shorts": [{"title": "Shortタイトル", "script": "30〜60秒の口播(フック→中身→CTA)"}]
}
chapters は4〜7個、tags は8〜12個、shorts は必ず3本。`

const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 8000,
    temperature: 0.7,
  }),
  signal: AbortSignal.timeout(180000),
})
if (!res.ok) {
  console.error(`✗ DeepSeek HTTP ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const data = await res.json()
const rawText = data?.choices?.[0]?.message?.content ?? ''
let pkg
try {
  pkg = JSON.parse(rawText.replace(/```json\s*|\s*```/g, '').trim())
} catch (e) {
  console.error('✗ JSON parse 失敗:', e.message, '\n--- raw ---\n', rawText.slice(0, 600))
  process.exit(1)
}
if (!pkg.title || !pkg.script) {
  console.error('✗ title / script が欠落')
  process.exit(1)
}

// ── markdown に組み立て ──
const chapters = Array.isArray(pkg.chapters) ? pkg.chapters : []
const tags = Array.isArray(pkg.tags) ? pkg.tags : []
const shorts = Array.isArray(pkg.shorts) ? pkg.shorts : []

const md =
  `# 🎬 動画パッケージ: ${pkg.title}\n\n` +
  `> 元記事: \`${article.slug}\` ・ キーワード: ${article.keyword} ・ 生成: DeepSeek V4 Pro\n` +
  `> ※ 録画(画面録画+口播 or faceless)とアップロードは人手。それ以外は本ファイルで完結。\n\n` +
  `## YouTube タイトル\n${pkg.title}\n\n` +
  `## サムネ文案\n${pkg.thumbnailText ?? ''}\n\n` +
  `## フック(最初の5秒)\n${pkg.hook ?? ''}\n\n` +
  `## 口播脚本(本編)\n${pkg.script}\n\n` +
  `## チャプター\n${chapters.map((c) => `- ${c.t} ${c.label}`).join('\n')}\n\n` +
  `## 概要欄(説明文 + CTA)\n${pkg.description ?? ''}\n\n` +
  `## タグ\n${tags.join(', ')}\n\n` +
  `---\n\n## Shorts(3本)\n\n` +
  shorts
    .map((s, i) => `### Short ${i + 1}: ${s.title ?? ''}\n${s.script ?? ''}\n`)
    .join('\n') +
  `\n`

if (!WRITE) {
  console.log(md)
  console.error(`\n[preview] slug=${slug} title="${pkg.title}" 本編=${pkg.script.length}字 shorts=${shorts.length}本 model=${MODEL}`)
  process.exit(0)
}

const outDir = resolve(ROOT, 'content/video-packages')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, `${slug}.md`)
writeFileSync(outPath, md)
console.log(`[gen-video-package] saved ${outPath} (model=${MODEL})`)

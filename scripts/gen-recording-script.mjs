// 動画パッケージ(content/video-packages/<slug>.md)→ 収録用「録音台本」を DeepSeek V4 Pro で生成。
// Han が自分の声で読み上げて画面録画(顔出し不要)するための台本。
// テレプロンプター用に本編ナレーションを短い行に分割 + 各セクションに【画面】指示(録画で映すもの/テロップ案)。
//
// 使い方:
//   node --env-file=supabase/.env scripts/gen-recording-script.mjs <slug> [--write]
//   - --write なし: stdout にプレビュー
//   - --write あり: content/recording-scripts/<slug>.md に保存

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = 'deepseek-v4-pro'

const slug = process.argv[2]
const WRITE = process.argv.includes('--write')
if (!slug || slug.startsWith('--')) {
  console.error('usage: node --env-file=supabase/.env scripts/gen-recording-script.mjs <slug> [--write]')
  process.exit(1)
}
const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
  console.error('✗ DEEPSEEK_API_KEY が未設定(--env-file=supabase/.env を付けて実行)')
  process.exit(1)
}

const pkgPath = resolve(ROOT, `content/video-packages/${slug}.md`)
let pkg
try {
  pkg = readFileSync(pkgPath, 'utf8')
} catch {
  console.error(`✗ 動画パッケージが見つかりません: ${pkgPath}(先に gen-video-package.mjs を実行)`)
  process.exit(1)
}

const prompt = `以下は YouTube 動画パッケージです。これを「収録用の録音台本」に変換してください。Han さん本人が自分の声で読み上げ、画面録画(顔出し不要)する前提です。

# 変換ルール
- 本編ナレーションを、朗読しやすい短い行に分割する(1行=ひと息で読める長さ、意味の切れ目で改行)。
- 各セクションの先頭に【画面】を付け、画面録画で何を映すか/出すテロップ案を1〜2行で指示する(スライド / ツール実演 / SERP画面 など。顔出しは不要)。
- ツールに触れる箇所の【画面】は「enkiseojp.com を実際に操作(キーワード入力→難易度表示)」のように具体的に。
- 冒頭に「録音メモ」: 目安の長さ、少しゆっくりめのペース、機材はPCマイクでOK、ツール実演を入れるタイミング。
- 末尾の Shorts 3本も同様に各本を録音台本化(縦型・30〜60秒・冒頭フック重視・各本に【画面】)。
- 誇大表現・保証表現は足さない(景品表示法)。原稿の言い回しは尊重しつつ読みやすく整える。
- 出力は日本語の markdown のみ。前置き・コードフェンス不要。

# 動画パッケージ
${pkg}`

const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 12000,
    temperature: 0.6,
  }),
  signal: AbortSignal.timeout(180000),
})
if (!res.ok) {
  console.error(`✗ DeepSeek HTTP ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const data = await res.json()
if (data.usage) console.error('[usage]', JSON.stringify(data.usage))
const body = (data?.choices?.[0]?.message?.content ?? '').replace(/```(?:markdown)?\s*|\s*```/g, '').trim()
if (!body) {
  console.error('✗ 空応答')
  process.exit(1)
}

const out =
  `# 🎙 録音台本: ${slug}\n\n` +
  `> ${slug} の動画パッケージから生成 ・ DeepSeek V4 Pro\n` +
  `> 顔出し不要。画面録画(ツール実演 / スライド)+ 自分の声で読み上げて収録してください。\n\n` +
  `---\n\n${body}\n`

if (!WRITE) {
  console.log(out)
  console.error(`\n[preview] slug=${slug} 文字数=${body.length} model=${MODEL}`)
  process.exit(0)
}
const outDir = resolve(ROOT, 'content/recording-scripts')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, `${slug}.md`)
writeFileSync(outPath, out)
console.log(`[gen-recording-script] saved ${outPath} (model=${MODEL})`)

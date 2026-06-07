// 満分 SEO 記事を生成 → はてなブログへ自動投稿(下書き)する一括スクリプト
//
// 【使い方】
//   1. supabase/.env に HATENA_API_KEY を貼る(はてな アカウント設定 → APIキー → 発行)
//   2. 実行:
//      deno run --allow-net --allow-env --env-file=supabase/.env scripts/publish.ts
//      (引数でキーワードを1つ指定も可。省略時は既定の5本を順に生成・投稿)
//
// 【cron 例(毎日 9:00 に自動実行)】
//   0 9 * * * cd /path/to/jp-seo-bot && deno run --allow-net --allow-env --env-file=supabase/.env scripts/publish.ts >> /tmp/seo.log 2>&1
//
// ※ draft:true なのでまず「下書き」に入る。確認後 draft:false にすれば公開。

import { buildSeoPrompt, parseSeoResponse, buildSchemaJsonLd, SEO_ANGLES } from '../api/_lib/seoGen.ts'
import { postToHatena } from '../api/_lib/hatena.ts'

const DEFAULT_KEYWORDS = [
  '中小企業 SEO 自動化',
  '格安 SEO 対策 おすすめ',
  'AI SEO 記事 自動作成 サービス',
  '中小企業 SEO 自分で やり方 失敗しない',
  'SEO 外注 格安 体験談 中小企業',
]

const dsKey = Deno.env.get('DEEPSEEK_API_KEY')
const hatena = {
  hatenaId: Deno.env.get('HATENA_ID') ?? '',
  blogId: Deno.env.get('HATENA_BLOG_ID') ?? '',
  apiKey: Deno.env.get('HATENA_API_KEY') ?? '',
}

if (!dsKey) {
  console.error('✗ DEEPSEEK_API_KEY が未設定です(supabase/.env)')
  Deno.exit(1)
}
if (!hatena.apiKey) {
  console.error('✗ HATENA_API_KEY が未設定です。はてな アカウント設定 → APIキー → 発行 で取得し、supabase/.env に貼ってください。')
  Deno.exit(1)
}

async function generate(keyword: string, angle: string) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dsKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: buildSeoPrompt(keyword, angle) }],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(55000),
  })
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`)
  const data = await res.json()
  return parseSeoResponse(data.choices[0].message.content, keyword)
}

const keywords = Deno.args.length > 0 ? [Deno.args[0]] : DEFAULT_KEYWORDS

console.log(`はてなブログ(${hatena.blogId})へ ${keywords.length} 本を生成・投稿します...\n`)

for (let i = 0; i < keywords.length; i++) {
  const kw = keywords[i]
  console.log(`[${i + 1}/${keywords.length}] 生成中: ${kw}`)
  try {
    const article = await generate(kw, SEO_ANGLES[i % SEO_ANGLES.length])
    const schema = buildSchemaJsonLd(article)
    const result = await postToHatena(hatena, {
      title: article.title,
      markdown: article.markdown,
      schemaJsonLd: schema,
      categories: [kw.split(/\s+/)[0]],
      draft: true, // 安全側: まず下書き。確認後 false にすれば即公開
    })
    console.log(`  ✓ 投稿完了(下書き): ${result.url || result.editUrl}`)
  } catch (e) {
    console.error(`  ✗ 失敗: ${(e as Error).message}`)
  }
}

console.log('\n完了。はてなブログ「記事の管理」→「下書き」で確認できます。')

// Edge Function — generate-article
// DeepSeek で日本語 SEO 記事を生成。上流失敗時は下書きを偽装せずエラーにする。
//
// 環境変数:
//   DEEPSEEK_API_KEY   → DeepSeek V4 Pro (deepseek-v4-pro, OpenAI 互換)
//   未設定              → 503 FEATURE_UNAVAILABLE
// ※ Claude(Anthropic)は使用しない(Han 指示)。
//
// 入力: { keyword: string, tier: 'easy'|'medium'|'hard', count: number }
// 出力: { articles: [{ title, markdown, provider }] }

import { buildSeoPrompt } from '../../../api/_lib/seoGen.ts'
import { apiError, authorizePilotRequest, readJsonObject, validKeyword } from '../../../api/_lib/apiSecurity.ts'

declare const Deno: {
  env: { get: (k: string) => string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => unknown
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ALLOWED_ORIGIN') ?? 'http://localhost:5180',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReqBody {
  keyword: string
  tier?: 'easy' | 'medium' | 'hard'
  count?: number
}

interface DraftArticle {
  title: string
  markdown: string
  provider: string
  metaDescription?: string
  faq?: { q: string; a: string }[]
  relatedKeywords?: string[]
}

const ANGLES = [
  'とは?基礎から徹底解説',
  'の選び方 — 失敗しない 5 つのポイント',
  'おすすめ比較【2026 年最新版】',
  'の料金・費用相場まとめ',
  '導入事例と成功パターン',
  'のよくある質問(FAQ)',
  '初心者向け完全ガイド',
  '最新トレンドと今後の展望',
]

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return withCors(apiError(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' }))
  const auth = await authorizePilotRequest(req, {
    signingSecret: Deno.env.get('PILOT_ACCESS_SIGNING_SECRET'),
    allowedOrigin: Deno.env.get('APP_ALLOWED_ORIGIN') ?? 'http://localhost:5180',
    scope: 'article:generate',
    limit: 4,
    windowMs: 60 * 60_000,
  })
  if (auth instanceof Response) return withCors(auth)
  const parsed = await readJsonObject(req)
  if (parsed instanceof Response) return withCors(parsed)
  const body = parsed as Partial<ReqBody>
  const keyword = validKeyword(body.keyword)
  if (!keyword) return withCors(apiError(400, 'INVALID_KEYWORD'))
  if (body.tier !== undefined && !['easy', 'medium', 'hard'].includes(body.tier)) {
    return withCors(apiError(400, 'INVALID_TIER'))
  }
  if (body.count !== undefined && (!Number.isInteger(body.count) || body.count < 1 || body.count > 4)) {
    return withCors(apiError(400, 'INVALID_COUNT'))
  }
  const count = body.count ?? 2

  const deepseek = Deno.env.get('DEEPSEEK_API_KEY')
  if (!deepseek) return withCors(apiError(503, 'FEATURE_UNAVAILABLE'))

  let articles: DraftArticle[]
  try {
    articles = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        genWithDeepSeek(keyword, ANGLES[i % ANGLES.length], deepseek),
      ),
    )
  } catch (error) {
    console.error('generation error', error)
    return withCors(apiError(502, 'GENERATION_FAILED'))
  }

  return json(200, { articles })
}

function buildPrompt(keyword: string, angle: string): string {
  // 満分 SEO エンジン(seoGen)に委譲。検索意図 + E-E-A-T + FAQ + 編集ゲート枠を強制。
  return buildSeoPrompt(keyword, angle)
}

async function genWithDeepSeek(keyword: string, angle: string, key: string): Promise<DraftArticle> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: buildPrompt(keyword, angle) }],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(55000),
  })
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`)
  const data = await res.json()
  const parsed = parseArticle(data?.choices?.[0]?.message?.content ?? '')
  return { ...parsed, provider: 'deepseek' }
}

// genWithClaude 削除済み — Claude/Anthropic は使用しない(Han 指示で DeepSeek V4 Pro のみ)。

function parseArticle(text: string): Omit<DraftArticle, 'provider'> {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  const obj = JSON.parse(cleaned) as {
    title?: string
    markdown?: string
    metaDescription?: string
    faq?: { q?: string; a?: string }[]
    relatedKeywords?: string[]
  }
  if (!obj.markdown) throw new Error('missing markdown')
  const faq = Array.isArray(obj.faq)
    ? obj.faq.filter((f) => f && f.q && f.a).map((f) => ({ q: f.q as string, a: f.a as string }))
    : []
  const relatedKeywords = Array.isArray(obj.relatedKeywords)
    ? obj.relatedKeywords.filter((k): k is string => typeof k === 'string')
    : []
  return {
    title: obj.title ?? '無題',
    markdown: obj.markdown,
    metaDescription: obj.metaDescription,
    faq: faq.length > 0 ? faq : undefined,
    relatedKeywords: relatedKeywords.length > 0 ? relatedKeywords : undefined,
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value)
  return new Response(response.body, { status: response.status, headers })
}

// エントリポイント。ローカルは server.ts(ルーター)が handler を import するため、
// 単体実行(deno run ... index.ts)時のみ自前で serve する。
//   Supabase: `supabase functions deploy` 時に自動でルーティング
if (import.meta.main) Deno.serve(handler)

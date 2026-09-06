// Vercel Edge Function — /api/generate-article
// DeepSeek で日本語 SEO 記事を生成。上流失敗時は下書きを偽装せずエラーにする。
//
// 環境変数(Vercel: Project Settings → Environment Variables で設定):
//   DEEPSEEK_API_KEY   → DeepSeek V4 Pro (deepseek-v4-pro, OpenAI 互換)
//   未設定              → 503 FEATURE_UNAVAILABLE
// ※ Claude(Anthropic)は使用しない(Han 指示)。
//
// 入力: { keyword: string, tier?: 'easy'|'medium'|'hard', count?: number }
// 出力: { articles: [{ title, markdown, provider }] }
//
// 注: ローカル開発用の Deno 版は supabase/functions/generate-article/index.ts
//     (ロジックは同一。クラウドは本ファイル、ローカルは Deno 版を使用)

// 拡張子なし: Vercel Edge bundler は .ts 付き相対 import を弾く(Deno 側は supabase/ 配下で .ts 付き)。
import { buildSeoPrompt } from './_lib/seoGen'
import { apiError, apiJson, authorizePilotRequest, readJsonObject, validKeyword } from './_lib/apiSecurity'

export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return apiError(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' })
  const auth = await authorizePilotRequest(req, {
    signingSecret: process.env.PILOT_ACCESS_SIGNING_SECRET,
    allowedOrigin: process.env.APP_ALLOWED_ORIGIN ?? 'https://enkiseojp.com',
    scope: 'article:generate',
    limit: 4,
    windowMs: 60 * 60_000,
  })
  if (auth instanceof Response) return auth

  const parsed = await readJsonObject(req)
  if (parsed instanceof Response) return parsed
  const body = parsed as Partial<ReqBody>
  const keyword = validKeyword(body.keyword)
  if (!keyword) return apiError(400, 'INVALID_KEYWORD')
  if (body.tier !== undefined && !['easy', 'medium', 'hard'].includes(body.tier)) {
    return apiError(400, 'INVALID_TIER')
  }
  if (body.count !== undefined && (!Number.isInteger(body.count) || body.count < 1 || body.count > 4)) {
    return apiError(400, 'INVALID_COUNT')
  }
  const count = body.count ?? 2

  const deepseek = process.env.DEEPSEEK_API_KEY
  if (!deepseek) return apiError(503, 'FEATURE_UNAVAILABLE')

  let articles: DraftArticle[]
  try {
    articles = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        genWithDeepSeek(keyword, ANGLES[i % ANGLES.length], deepseek),
      ),
    )
  } catch (error) {
    console.error('generation error', error)
    return apiError(502, 'GENERATION_FAILED')
  }

  return apiJson(200, { articles })
}

function buildPrompt(keyword: string, angle: string): string {
  // 満分 SEO エンジン(seoGen)に委譲。Deno 版と同一プロンプトで本番・ローカルの品質を揃える。
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

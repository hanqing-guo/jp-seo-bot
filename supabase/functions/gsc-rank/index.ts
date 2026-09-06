// Edge Function — gsc-rank(Deno / ローカル開発用)
// 指定キーワードの GSC 平均掲載順位を返す。env: GSC_SA_KEY_B64 / GSC_SITE_URL。
// クラウド(Vercel)は api/gsc-rank.ts(ロジック同一)。
//
// ローカルでは supabase/functions/server.ts(ルーター)が handler を import して
// /gsc-rank を捌く。単体実行(deno run ... index.ts)時のみ自前で serve する。

import { fetchGscRank } from '../../../api/_lib/gscRank.ts'
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

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return withCors(apiError(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' }))
  const auth = await authorizePilotRequest(req, {
    signingSecret: Deno.env.get('PILOT_ACCESS_SIGNING_SECRET'),
    allowedOrigin: Deno.env.get('APP_ALLOWED_ORIGIN') ?? 'http://localhost:5180',
    scope: 'gsc:read',
    limit: 30,
    windowMs: 60 * 60_000,
    requiredResource: Deno.env.get('GSC_SITE_URL'),
  })
  if (auth instanceof Response) return withCors(auth)
  const body = await readJsonObject(req)
  if (body instanceof Response) return withCors(body)
  const keyword = validKeyword(body.keyword)
  if (!keyword) return withCors(apiError(400, 'INVALID_KEYWORD'))

  const saKeyB64 = Deno.env.get('GSC_SA_KEY_B64')
  const siteUrl = Deno.env.get('GSC_SITE_URL')
  if (!saKeyB64 || !siteUrl) return withCors(apiError(503, 'FEATURE_UNAVAILABLE'))

  try {
    const rank = await fetchGscRank(keyword, { saKeyB64, siteUrl })
    return json(200, { ...rank, configured: true })
  } catch (e) {
    console.error('gsc-rank error', e)
    return withCors(apiError(502, 'UPSTREAM_UNAVAILABLE'))
  }
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value)
  return new Response(response.body, { status: response.status, headers })
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 単体実行時のみ serve(ローカルは server.ts ルーター経由なので import.meta.main は false)。
if (import.meta.main) Deno.serve(handler)

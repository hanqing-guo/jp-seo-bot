// Edge Function — gsc-rank(Deno / ローカル開発用)
// 指定キーワードの GSC 平均掲載順位を返す。env: GSC_SA_KEY_B64 / GSC_SITE_URL。
// クラウド(Vercel)は api/gsc-rank.ts(ロジック同一)。
//
// ローカルでは supabase/functions/server.ts(ルーター)が handler を import して
// /gsc-rank を捌く。単体実行(deno run ... index.ts)時のみ自前で serve する。

import { fetchGscRank } from '../../../api/_lib/gscRank.ts'

declare const Deno: {
  env: { get: (k: string) => string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => unknown
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  // x-api-key: フロントが VITE_API_SECRET 設定時に送る共有シークレットヘッダ(無いと preflight で弾かれる)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' })

  let body: { keyword?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'INVALID_JSON' })
  }
  const keyword = (body.keyword ?? '').trim()
  if (!keyword) return json(400, { error: 'KEYWORD_REQUIRED' })

  const saKeyB64 = Deno.env.get('GSC_SA_KEY_B64')
  const siteUrl = Deno.env.get('GSC_SITE_URL')
  if (!saKeyB64 || !siteUrl) return json(200, { keyword, position: null, configured: false })

  try {
    const rank = await fetchGscRank(keyword, { saKeyB64, siteUrl })
    return json(200, { ...rank, configured: true })
  } catch (e) {
    console.error('gsc-rank error', e)
    return json(502, { error: 'GSC_FETCH_FAILED', message: e instanceof Error ? e.message : String(e) })
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 単体実行時のみ serve(ローカルは server.ts ルーター経由なので import.meta.main は false)。
if (import.meta.main) Deno.serve(handler)

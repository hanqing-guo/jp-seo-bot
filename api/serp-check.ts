// Vercel Edge Function — /api/serp-check
// キーワードの実 SERP(google.co.jp 上位 10 件)を取得し、弱いサイトの数から
// 「勝てる見込み」とヒューリスティック KD への補正値を返す。
// env: DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD(未設定なら configured:false)

import { fetchSerpTop10, scoreWeakness } from './_lib/serpWeakness'

export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' })

  // API_SECRET 設定時のみ有効な共有シークレット門(generate-article と同一規約)。
  const secret = process.env.API_SECRET
  if (secret && req.headers.get('x-api-key') !== secret) {
    return json(401, { error: 'UNAUTHORIZED' })
  }

  let body: { keyword?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'INVALID_JSON' })
  }
  const keyword = (body.keyword ?? '').trim()
  if (!keyword) return json(400, { error: 'KEYWORD_REQUIRED' })

  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) return json(200, { keyword, configured: false })

  try {
    const domains = await fetchSerpTop10(keyword, { login, password })
    if (domains.length === 0) return json(200, { keyword, configured: false })
    return json(200, { configured: true, ...scoreWeakness(keyword, domains) })
  } catch (e) {
    console.error('serp-check error', e)
    return json(502, {
      error: 'SERP_FETCH_FAILED',
      message: e instanceof Error ? e.message : String(e),
    })
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Vercel Edge Function — /api/serp-check
// キーワードの実 SERP(google.co.jp 上位 10 件)を取得し、弱いサイトの数から
// 「勝てる見込み」とヒューリスティック KD への補正値を返す。
// env: DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD(未設定なら configured:false)

import { fetchSerpTop10, scoreWeakness } from './_lib/serpWeakness'
import { apiError, apiJson, authorizePilotRequest, readJsonObject, validKeyword } from './_lib/apiSecurity'

export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return apiError(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' })
  const auth = await authorizePilotRequest(req, {
    signingSecret: process.env.PILOT_ACCESS_SIGNING_SECRET,
    allowedOrigin: process.env.APP_ALLOWED_ORIGIN ?? 'https://enkiseojp.com',
    scope: 'serp:read',
    limit: 10,
    windowMs: 60 * 60_000,
  })
  if (auth instanceof Response) return auth
  const body = await readJsonObject(req)
  if (body instanceof Response) return body
  const keyword = validKeyword(body.keyword)
  if (!keyword) return apiError(400, 'INVALID_KEYWORD')

  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) return apiError(503, 'FEATURE_UNAVAILABLE')

  try {
    const domains = await fetchSerpTop10(keyword, { login, password })
    if (domains.length === 0) return apiJson(200, { configured: true, ...scoreWeakness(keyword, []) })
    return apiJson(200, { configured: true, ...scoreWeakness(keyword, domains) })
  } catch (e) {
    console.error('serp-check error', e)
    return apiError(502, 'UPSTREAM_UNAVAILABLE')
  }
}

// Vercel Edge Function — /api/gsc-rank
// 指定キーワードの GSC 平均掲載順位を返す。
// env: GSC_SA_KEY_B64(SA キーの base64) / GSC_SITE_URL(GSC プロパティ)
// 未設定なら configured:false を返し、フロントは「未接続」として扱う。
//
// 注: 本番は Vercel の /api/gsc-rank(本ファイル)。ローカル開発用の Deno 版は
//     supabase/functions/gsc-rank/index.ts(ロジック同一、server.ts ルーター経由)。

// 拡張子なし: Vercel Edge bundler は .ts 付き相対 import を弾く(Deno 側は supabase/ 配下で .ts 付き)。
import { fetchGscRank } from './_lib/gscRank'
import { apiError, apiJson, authorizePilotRequest, readJsonObject, validKeyword } from './_lib/apiSecurity'

export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return apiError(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' })
  const auth = await authorizePilotRequest(req, {
    signingSecret: process.env.PILOT_ACCESS_SIGNING_SECRET,
    allowedOrigin: process.env.APP_ALLOWED_ORIGIN ?? 'https://enkiseojp.com',
    scope: 'gsc:read',
    limit: 30,
    windowMs: 60 * 60_000,
    requiredResource: process.env.GSC_SITE_URL,
  })
  if (auth instanceof Response) return auth
  const body = await readJsonObject(req)
  if (body instanceof Response) return body
  const keyword = validKeyword(body.keyword)
  if (!keyword) return apiError(400, 'INVALID_KEYWORD')

  const saKeyB64 = process.env.GSC_SA_KEY_B64
  const siteUrl = process.env.GSC_SITE_URL
  // GSC 未設定 = 連携オフ。エラーにせず「未接続」を返す(フロントで「未接続」表示)。
  if (!saKeyB64 || !siteUrl) return apiError(503, 'FEATURE_UNAVAILABLE')

  try {
    const rank = await fetchGscRank(keyword, { saKeyB64, siteUrl })
    return apiJson(200, { ...rank, configured: true })
  } catch (e) {
    console.error('gsc-rank error', e)
    return apiError(502, 'UPSTREAM_UNAVAILABLE')
  }
}

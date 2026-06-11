// Vercel Edge Function — /api/gsc-rank
// 指定キーワードの GSC 平均掲載順位を返す。
// env: GSC_SA_KEY_B64(SA キーの base64) / GSC_SITE_URL(GSC プロパティ)
// 未設定なら configured:false を返し、フロントは「未接続」として扱う。
//
// 注: 本番は Vercel の /api/gsc-rank(本ファイル)。ローカル開発用の Deno 版は
//     supabase/functions/gsc-rank/index.ts(ロジック同一、server.ts ルーター経由)。

// 拡張子なし: Vercel Edge bundler は .ts 付き相対 import を弾く(Deno 側は supabase/ 配下で .ts 付き)。
import { fetchGscRank } from './_lib/gscRank'

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

  const saKeyB64 = process.env.GSC_SA_KEY_B64
  const siteUrl = process.env.GSC_SITE_URL
  // GSC 未設定 = 連携オフ。エラーにせず「未接続」を返す(フロントで「未接続」表示)。
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
    headers: { 'Content-Type': 'application/json' },
  })
}

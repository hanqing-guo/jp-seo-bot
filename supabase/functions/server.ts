// ローカル開発用ルーター — :8000 で複数の Edge Function を path で振り分ける。
// 本番(Vercel)は api/*.ts のファイルルーティングが各 endpoint を捌くので、
// このルーターは **ローカル専用**(`npm run api:local` から起動)。
//
//   POST /gsc-rank          → GSC 平均掲載順位
//   POST /generate-article  → AI 記事生成
//   その他                   → 404(フロントは 404 を「未接続」として扱う)

import { handler as generateArticle } from './generate-article/index.ts'
import { handler as gscRank } from './gsc-rank/index.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => unknown
}

// ローカルはフロント(:5180)と別オリジン(:8000)なので、404 にも CORS ヘッダが必要
// (無いと preflight / レスポンス読取が弾かれ、フロントは 404 を判定できず fetch エラーになる)。
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve((req: Request) => {
  const path = new URL(req.url).pathname
  if (path.endsWith('/gsc-rank')) return gscRank(req)
  if (path.endsWith('/generate-article')) return generateArticle(req)
  // 旧実装は「既定 = generate-article」で、ミラーの無い /serp-check や /index-status
  // への POST まで記事生成に流れていた(SERP チェックのクリックで DeepSeek 課金が漏れ、
  // index-status は HTTP 400 エラー表示になる)。フロント(serpCheck.ts / indexStatus.ts)
  // は 404 を「未接続」として扱う規約なので、未知パスは 404 を返す。
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

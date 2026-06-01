// ローカル開発用ルーター — :8000 で複数の Edge Function を path で振り分ける。
// 本番(Vercel)は api/*.ts のファイルルーティングが各 endpoint を捌くので、
// このルーターは **ローカル専用**(`npm run api:local` から起動)。
//
//   POST /gsc-rank          → GSC 平均掲載順位
//   POST /generate-article  → AI 記事生成(既定)

import { handler as generateArticle } from './generate-article/index.ts'
import { handler as gscRank } from './gsc-rank/index.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => unknown
}

Deno.serve((req: Request) => {
  const path = new URL(req.url).pathname
  if (path.endsWith('/gsc-rank')) return gscRank(req)
  return generateArticle(req) // 既定 + /generate-article
})

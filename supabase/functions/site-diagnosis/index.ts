// JP SEO Bot — 無料 SEO 診断 Edge Function (Phase 1 骨架)
// DIAGNOSIS_SPEC.md §10.3 ベース。
//
// Phase 1 完成済:
//   - URL バリデーション / 正規化
//   - HTML 取得 (fetchHtml)
//   - JSON response 形 (DiagnosisResponse / DiagnosisError)
//   - 占位 module calls (空配列を返す)
//
// Phase 2 で実装:
//   - runTechnicalChecks (modules/technical.ts)
//   - runOnpageChecks    (modules/onpage.ts)
//   - calculateScores    (scoring.ts)
//
// Phase 3 で実装:
//   - runGoogleJapanChecks / runYahooJapanChecks / runBacklinkChecks
//   - generateAISummary  (Claude API)
//
// Phase 4 で実装:
//   - DB 保存 (diagnosis_sessions / diagnosis_items)
//   - レート制限 (IP 別 3 回/時間、ドメイン別 1 回/日 cache)

import { corsHeaders } from '../_shared/cors.ts'
import { fetchHtml, FetchError, normalizeUrl, extractDomain } from '../_shared/html.ts'
import type {
  DiagnosisItem,
  DiagnosisResponse,
  ScoreBreakdown,
} from '../_shared/types.ts'

interface RequestBody {
  url?: string
}

function errorResponse(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

function placeholderScores(): ScoreBreakdown {
  return {
    total: 0, google: 0, yahoo: 0,
    technical: 0, onpage: 0, content: 0, backlink: 0, mobile: 0,
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'POST のみ受け付けます')
  }

  // ─── 入力 ────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'JSON ボディの読み取りに失敗しました')
  }

  if (!body.url || typeof body.url !== 'string') {
    return errorResponse(400, 'URL_REQUIRED', 'URL を入力してください')
  }
  if (body.url.length > 500) {
    return errorResponse(400, 'URL_TOO_LONG', 'URL が長すぎます (最大 500 文字)')
  }

  let normalizedUrl: string
  try {
    normalizedUrl = normalizeUrl(body.url)
  } catch {
    return errorResponse(400, 'INVALID_URL', '有効な URL を入力してください (例: example.co.jp)')
  }

  // ─── HTML 取得 ─────────────────────────────────────────────
  let html: string
  try {
    html = await fetchHtml(normalizedUrl, { timeoutMs: 10000 })
  } catch (e) {
    if (e instanceof FetchError) {
      const status = e.code === 'BLOCKED_HOST' ? 400
        : e.code === 'NOT_HTML'     ? 415
        : e.code === 'HTTP_ERROR'   ? 502
        : 503
      return errorResponse(status, e.code, e.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', '内部エラーが発生しました')
  }

  // Phase 1: html はパース基盤 (parseHTML) で利用準備済み。Phase 2 module で実消費。
  void html

  // ─── 各 module の診断 (Phase 2-3 で実装) ──────────────────
  // 並列実行で速度最適化を意図した骨組み。現在は全 module が空配列を返す。
  const [technical, onpage, google, yahoo, backlink] = await Promise.all([
    Promise.resolve<DiagnosisItem[]>([]),  // runTechnicalChecks(normalizedUrl, html)
    Promise.resolve<DiagnosisItem[]>([]),  // runOnpageChecks(normalizedUrl, html)
    Promise.resolve<DiagnosisItem[]>([]),  // runGoogleJapanChecks(normalizedUrl, html)
    Promise.resolve<DiagnosisItem[]>([]),  // runYahooJapanChecks(normalizedUrl, html)
    Promise.resolve<DiagnosisItem[]>([]),  // runBacklinkChecks(normalizedUrl)
  ])

  const allItems: DiagnosisItem[] = [...technical, ...onpage, ...google, ...yahoo, ...backlink]

  // ─── スコア + AI サマリー (Phase 2-3 で実装) ───────────────
  const scores = placeholderScores()
  const summary = `Phase 1 (スケルトン): ${extractDomain(normalizedUrl)} の診断モジュールは Phase 2 以降で実装されます。`
  const quickWins: string[] = []

  // ─── DB 保存 (Phase 4) ───────────────────────────────────
  // await saveDiagnosisSession(sessionId, normalizedUrl, scores, allItems, summary, quickWins)

  const responseBody: DiagnosisResponse = {
    sessionId: crypto.randomUUID(),
    url: normalizedUrl,
    scores,
    items: allItems,
    summary,
    quickWins,
    criticalCount: allItems.filter(i => i.level === 'critical').length,
    warningCount:  allItems.filter(i => i.level === 'warning').length,
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Deno Deploy / Supabase Edge Functions エントリーポイント
declare const Deno: { serve?: (handler: (req: Request) => Promise<Response>) => void } | undefined
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(handler)
}

// SERP 弱度実測 service(フロント側)— /api/serp-check に POST。
// gscRank.ts / aiArticle.ts と同じ apiBase() 規約。
// 未接続(VITE_API_BASE なし / DataForSEO 未設定 / 404)= configured:false で
// ヒューリスティック KD のみで動く(従来どおり)。

export interface SerpCheckResult {
  configured: boolean
  keyword: string
  domains: string[]
  weakDomains: string[]
  weakCount: number
  verdict: 'winnable' | 'fair' | 'tough'
  /** ヒューリスティック KD への補正値 */
  kdAdjust: number
}

function apiBase(): string {
  if (import.meta.env.PROD) return '/api'
  return import.meta.env.VITE_API_BASE ?? ''
}

const NOT_CONFIGURED: Omit<SerpCheckResult, 'keyword'> = {
  configured: false,
  domains: [],
  weakDomains: [],
  weakCount: 0,
  verdict: 'fair',
  kdAdjust: 0,
}

export async function checkSerpWeakness(keyword: string): Promise<SerpCheckResult> {
  const base = apiBase()
  if (!base) return { keyword, ...NOT_CONFIGURED }

  const res = await fetch(`${base.replace(/\/$/, '')}/serp-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.VITE_API_SECRET
        ? { 'x-api-key': import.meta.env.VITE_API_SECRET as string }
        : {}),
    },
    body: JSON.stringify({ keyword }),
    signal: AbortSignal.timeout(30000),
  })
  // ローカル Deno サーバーに本エンドポイントのミラーは無い → 404 は未接続扱い。
  if (res.status === 404) return { keyword, ...NOT_CONFIGURED }
  if (!res.ok) throw new Error(`競合チェックに失敗しました (HTTP ${res.status})`)
  const data = (await res.json()) as Partial<SerpCheckResult>
  if (!data.configured) return { keyword, ...NOT_CONFIGURED }
  return {
    configured: true,
    keyword,
    domains: data.domains ?? [],
    weakDomains: data.weakDomains ?? [],
    weakCount: data.weakCount ?? 0,
    verdict: data.verdict ?? 'fair',
    kdAdjust: data.kdAdjust ?? 0,
  }
}

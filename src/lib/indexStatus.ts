// 収録(インデックス)モニター service(フロント側)— /api/index-status に POST。
// gscRank.ts と同じ apiBase() 規約。未接続 = configured:false。

export interface PageIndexStatus {
  url: string
  indexed: boolean
  state: string
  lastCrawl: string | null
}

export interface IndexStatusResult {
  configured: boolean
  total: number
  indexedCount: number
  pages: PageIndexStatus[]
}

function apiBase(): string {
  if (import.meta.env.PROD) return '/api'
  return import.meta.env.VITE_API_BASE ?? ''
}

export async function fetchIndexStatus(): Promise<IndexStatusResult> {
  const base = apiBase()
  if (!base) return { configured: false, total: 0, indexedCount: 0, pages: [] }

  const res = await fetch(`${base.replace(/\/$/, '')}/index-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.VITE_API_SECRET
        ? { 'x-api-key': import.meta.env.VITE_API_SECRET as string }
        : {}),
    },
    body: JSON.stringify({}),
    // sitemap 全 URL を GSC に照会するため時間がかかる(数十 URL で 5〜15 秒)。
    signal: AbortSignal.timeout(60000),
  })
  // ローカル Deno サーバーに本エンドポイントのミラーは無い → 404 は未接続扱い。
  if (res.status === 404) return { configured: false, total: 0, indexedCount: 0, pages: [] }
  if (!res.ok) throw new Error(`収録状況の取得に失敗しました (HTTP ${res.status})`)
  const data = (await res.json()) as Partial<IndexStatusResult>
  return {
    configured: data.configured ?? false,
    total: data.total ?? 0,
    indexedCount: data.indexedCount ?? 0,
    pages: data.pages ?? [],
  }
}

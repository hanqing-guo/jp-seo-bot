// GSC(Google Search Console)順位取得 service(フロント側)
//
// 動作:
//   1. 本番(Vercel)は同一ドメインの /api/gsc-rank に POST。
//   2. ローカル開発は .env の VITE_API_BASE(例: http://localhost:8000)/gsc-rank。
//   3. VITE_API_BASE 未設定(ローカルで API 未接続)= configured:false を返す。
//
// 後端(api/gsc-rank.ts)は GSC_SA_KEY_B64 / GSC_SITE_URL 未設定なら
// configured:false を返す。フロントはそれを「GSC 未接続」として表示する。
// aiArticle.ts と同じ apiBase() 規約。

export interface GscRankResult {
  keyword: string
  /** 平均掲載順位(直近 28 日)。データなし / 未接続 = null */
  position: number | null
  /** GSC 認証情報(env)が後端に設定済みか。false = 未接続 */
  configured: boolean
}

function apiBase(): string {
  // 本番(Vercel)はフロントと同一ドメインの /api を使用。
  // ローカル開発は .env の VITE_API_BASE(例: http://localhost:8000)。
  if (import.meta.env.PROD) return '/api'
  return import.meta.env.VITE_API_BASE ?? ''
}

export async function fetchGoogleRank(keyword: string): Promise<GscRankResult> {
  const base = apiBase()
  // API 未接続(ローカルで VITE_API_BASE 未設定)= 未接続として返す。エラーにしない。
  if (!base) return { keyword, position: null, configured: false }

  const res = await fetch(`${base.replace(/\/$/, '')}/gsc-rank`, {
    method: 'POST',
    // VITE_API_SECRET 設定時は後端の API_SECRET 門に合わせて送る(aiArticle.ts と同一規約)。
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.VITE_API_SECRET
        ? { 'x-api-key': import.meta.env.VITE_API_SECRET as string }
        : {}),
    },
    body: JSON.stringify({ keyword }),
    // GSC API(token 交換 + query)は数秒。余裕を持って 20s。
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`GSC 順位の取得に失敗しました (HTTP ${res.status})`)
  const data = (await res.json()) as { position?: number | null; configured?: boolean }
  return {
    keyword,
    position: data.position ?? null,
    configured: data.configured ?? false,
  }
}

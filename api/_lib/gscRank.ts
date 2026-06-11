// Google Search Console(GSC)査流分析クライアント — 指定キーワードの
// 「平均掲載順位(position)」を GSC から取得する。Deno / Vercel 両対応
// (Web Crypto + fetch のみ、外部依存なし)。
//
// 認証: サービスアカウント(SA)。SA の JSON キー全体を base64 して env で渡す。
//   GSC_SA_KEY_B64 = base64(SA の JSON キー)
//   GSC_SITE_URL   = GSC プロパティ(例 "https://example.com/" または "sc-domain:example.com")
// 事前準備: GSC で SA のメールアドレスを当該プロパティの「ユーザー」に追加 +
//   Google Cloud で Search Console API を有効化。
//
// ⚠️ 仕様の注意:
//   - GSC は **Google のみ**。Yahoo の順位は取得できない。
//   - サイトが一度も表示されていないクエリは行が返らない(= データなし → position:null)。
//   - データは 2〜3 日遅延。直近 28 日の平均掲載順位を返す。
//
// ★ このファイルは GSC 認証情報がまだ無い状態で書かれた「骨架」。実際の疎通確認は
//   env に本物のキーを入れてから。エラーが出たら token/query のレスポンス本文を見る。

export interface GscRank {
  keyword: string
  /** 平均掲載順位(四捨五入)。データなし = null */
  position: number | null
  impressions: number
  clicks: number
  source: 'gsc'
}

interface SaKey {
  client_email: string
  private_key: string
}

function b64urlBytes(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlStr(str: string): string {
  return b64urlBytes(new TextEncoder().encode(str))
}

/** PEM(PKCS#8)→ DER バイト列(ArrayBuffer 裏付けで返し crypto.subtle に渡せるように)。 */
function pemToDer(pem: string) {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const der = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i)
  return der
}

/** SA で署名した JWT を OAuth トークンエンドポイントに交換し、access_token を得る。 */
export async function getAccessToken(sa: SaKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64urlStr(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  )
  const signingInput = `${header}.${claim}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  )
  const jwt = `${signingInput}.${b64urlBytes(new Uint8Array(sigBuf))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    throw new Error(`GSC token 取得失敗 (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('GSC token レスポンスに access_token なし')
  return data.access_token
}

export function decodeSaKey(b64: string): SaKey {
  const bin = atob(b64.trim())
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const json = new TextDecoder().decode(bytes)
  const sa = JSON.parse(json) as Partial<SaKey>
  if (!sa.client_email || !sa.private_key) {
    throw new Error('SA キーに client_email / private_key がありません')
  }
  return sa as SaKey
}

/**
 * 指定キーワードの GSC 平均掲載順位を取得する(直近 28 日)。
 * データが無いクエリは position:null を返す(エラーではない)。
 */
export async function fetchGscRank(
  keyword: string,
  opts: { saKeyB64: string; siteUrl: string },
): Promise<GscRank> {
  const sa = decodeSaKey(opts.saKeyB64)
  const token = await getAccessToken(sa)

  const end = new Date()
  const start = new Date(end.getTime() - 28 * 86_400_000)
  // 日本市場プロパティのため JST 基準の日付に変換(UTC のままだと最大 1 日ずれる)
  const fmt = (d: Date) => new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10)

  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(opts.siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ['query'],
        dimensionFilterGroups: [
          { filters: [{ dimension: 'query', operator: 'equals', expression: keyword }] },
        ],
        rowLimit: 1,
      }),
    },
  )
  if (!res.ok) {
    throw new Error(`GSC query 失敗 (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`)
  }
  const data = (await res.json()) as {
    rows?: { position: number; impressions: number; clicks: number }[]
  }
  const row = data.rows?.[0]
  if (!row) return { keyword, position: null, impressions: 0, clicks: 0, source: 'gsc' }
  return {
    keyword,
    position: Math.round(row.position),
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    source: 'gsc',
  }
}

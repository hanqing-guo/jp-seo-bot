// Vercel Edge Function — /api/index-status
// サイトの sitemap.xml の全 URL を GSC URL Inspection API で照会し、
// Google に収録(インデックス)済みかどうかを一覧で返す。
// 新規サイトは「収録されているか」が順位以前のボトルネック — それを見える化する。
//
// env: GSC_SA_KEY_B64 / GSC_SITE_URL(gsc-rank と同じ。未設定なら configured:false)
// 制限: URL Inspection API は 600 リクエスト/分・2,000/日(プロパティ単位)。
//       小規模サイト(数十ページ)前提。50 URL で打ち切る。

import { decodeSaKey, getAccessToken } from './_lib/gscRank'

export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

const MAX_URLS = 50

interface PageStatus {
  url: string
  indexed: boolean
  /** GSC coverageState(例 "Submitted and indexed" / "Discovered - currently not indexed") */
  state: string
  lastCrawl: string | null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' })

  // API_SECRET 設定時のみ有効な共有シークレット門(generate-article と同一規約)。
  const secret = process.env.API_SECRET
  if (secret && req.headers.get('x-api-key') !== secret) {
    return json(401, { error: 'UNAUTHORIZED' })
  }

  const saKeyB64 = process.env.GSC_SA_KEY_B64
  const siteUrl = process.env.GSC_SITE_URL
  if (!saKeyB64 || !siteUrl) return json(200, { configured: false, pages: [] })

  try {
    const base = siteBase(siteUrl)
    const urls = (await fetchSitemapUrls(base)).slice(0, MAX_URLS)
    if (urls.length === 0) {
      return json(200, { configured: true, total: 0, indexedCount: 0, pages: [] })
    }

    const token = await getAccessToken(decodeSaKey(saKeyB64))
    const results = await Promise.allSettled(urls.map((u) => inspectUrl(u, siteUrl, token)))
    const pages: PageStatus[] = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { url: urls[i], indexed: false, state: '照会失敗', lastCrawl: null },
    )
    return json(200, {
      configured: true,
      total: pages.length,
      indexedCount: pages.filter((p) => p.indexed).length,
      pages,
    })
  } catch (e) {
    console.error('index-status error', e)
    return json(502, {
      error: 'INDEX_STATUS_FAILED',
      message: e instanceof Error ? e.message : String(e),
    })
  }
}

/** GSC プロパティ表記("sc-domain:example.com" / "https://example.com/")→ サイトのベース URL */
function siteBase(siteUrl: string): string {
  if (siteUrl.startsWith('sc-domain:')) return `https://${siteUrl.slice('sc-domain:'.length)}`
  return siteUrl.replace(/\/$/, '')
}

async function fetchSitemapUrls(base: string): Promise<string[]> {
  const res = await fetch(`${base}/sitemap.xml`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`sitemap.xml 取得失敗 (HTTP ${res.status})`)
  const xml = await res.text()
  const urls: string[] = []
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1].trim())
  return urls
}

async function inspectUrl(url: string, siteUrl: string, token: string): Promise<PageStatus> {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inspectionUrl: url, siteUrl }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    throw new Error(`URL Inspection 失敗 (HTTP ${res.status}): ${(await res.text()).slice(0, 120)}`)
  }
  const data = (await res.json()) as {
    inspectionResult?: {
      indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string }
    }
  }
  const idx = data.inspectionResult?.indexStatusResult
  return {
    url,
    indexed: idx?.verdict === 'PASS',
    state: idx?.coverageState ?? '不明',
    lastCrawl: idx?.lastCrawlTime ?? null,
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

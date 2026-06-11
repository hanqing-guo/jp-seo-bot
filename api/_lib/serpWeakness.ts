// SERP 弱度実測 — 語彙ヒューリスティック KD の最大の弱点
// (「メタディスクリプション 書き方」を簡単と誤判定する等)を補正する。
//
// 仕組み: DataForSEO で google.co.jp の上位 10 件を実取得し、
// 「弱いサイト(UGC / 個人ブログ / Q&A)」が何件いるかで勝てる見込みを判定。
// 弱いサイトが上位にいる = 新規ドメインでも入り込める余地がある(アフィリエイト界の定石)。
//
// env: DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD(未設定なら configured:false を返す)

export interface SerpWeakness {
  keyword: string
  /** 上位 10 件のドメイン(順位順) */
  domains: string[]
  /** うち「弱いサイト」と判定したドメイン */
  weakDomains: string[]
  weakCount: number
  /** 勝てる見込み: winnable(弱 3+)/ fair(弱 1-2)/ tough(全部企業サイト) */
  verdict: 'winnable' | 'fair' | 'tough'
  /** ヒューリスティック KD への補正値(フロントで加算) */
  kdAdjust: number
}

// UGC・個人ブログ・Q&A 等「ドメイン権威で守られていない」ホスト。
// ここが上位にいるキーワードは個別ページの品質勝負 = 新規サイトでも勝てる。
const WEAK_HOSTS = [
  'note.com', 'ameblo.jp', 'hatenablog.com', 'hatenablog.jp', 'hatena.ne.jp',
  'fc2.com', 'livedoor.jp', 'blog.jp', 'seesaa.net', 'goo.ne.jp', 'exblog.jp',
  'chiebukuro.yahoo.co.jp', 'detail.chiebukuro.yahoo.co.jp', 'oshiete.goo.ne.jp', 'okwave.jp',
  'reddit.com', 'qiita.com', 'zenn.dev', 'youtube.com', 'x.com', 'twitter.com',
  'instagram.com', 'tiktok.com', 'wordpress.com', 'wixsite.com', 'jimdofree.com',
  'jimdosite.com', 'studio.site', 'peraichi.com',
]

function isWeakHost(domain: string): boolean {
  const d = domain.toLowerCase()
  return WEAK_HOSTS.some((w) => d === w || d.endsWith(`.${w}`))
}

export function scoreWeakness(keyword: string, domains: string[]): SerpWeakness {
  const top10 = domains.slice(0, 10)
  const weakDomains = top10.filter(isWeakHost)
  const weakCount = weakDomains.length
  let verdict: SerpWeakness['verdict']
  let kdAdjust: number
  if (weakCount >= 3) {
    verdict = 'winnable'
    kdAdjust = -12
  } else if (weakCount >= 1) {
    verdict = 'fair'
    kdAdjust = -4
  } else {
    // 上位 10 件すべて企業サイト = ドメイン権威の壁。ヒューリスティックが
    // 何と言おうと新規サイトには長期戦。
    verdict = 'tough'
    kdAdjust = +18
  }
  return { keyword, domains: top10, weakDomains, weakCount, verdict, kdAdjust }
}

/** DataForSEO live/regular で google.co.jp(日本語)の上位 10 ドメインを取得。 */
export async function fetchSerpTop10(
  keyword: string,
  auth: { login: string; password: string },
): Promise<string[]> {
  const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${auth.login}:${auth.password}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        keyword,
        location_code: 2392, // Japan
        language_code: 'ja',
        device: 'desktop',
        depth: 10,
      },
    ]),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status}`)
  const data = (await res.json()) as {
    tasks?: {
      status_code?: number
      status_message?: string
      result?: { items?: { type?: string; domain?: string }[] }[]
    }[]
  }
  const task = data.tasks?.[0]
  if (!task || (task.status_code && task.status_code >= 40000)) {
    throw new Error(`DataForSEO task error: ${task?.status_message ?? 'no task'}`)
  }
  const items = task.result?.[0]?.items ?? []
  return items
    .filter((i) => i.type === 'organic' && i.domain)
    .map((i) => i.domain as string)
    .slice(0, 10)
}

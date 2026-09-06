import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { RequestOptions } from 'node:https'

export const URL_AUDIT_LIMITS = {
  maxRedirects: 3,
  maxResponseBytes: 512_000,
  maxPages: 1,
  timeoutMs: 6_000,
  maxSitemapBytes: 128_000,
} as const

export interface UrlAuditFinding {
  key: string
  label: string
  status: 'ok' | 'review' | 'missing'
  detail: string
}

export interface UrlAuditRecommendation {
  period: string
  action: string
  reason: string
}

export interface UrlAuditReport {
  mode: 'live-public-page' | 'sample'
  requestedUrl: string
  finalUrl: string
  fetchedAt: string
  inspectedPages: number
  limits: { maxPages: number; maxResponseBytes: number }
  page: {
    httpStatus: number
    title: string | null
    description: string | null
    h1: string | null
    lang: string | null
    canonical: string | null
    robots: string | null
    contentCharacters: number
    headings: { h1: number; h2: number; h3: number }
    structuredDataTypes: string[]
    hasViewport: boolean
    internalLinks: number
    images: number
    imagesMissingAlt: number
    imagesLazyLoaded: number
    scriptTags: number
    responseBytes: number
  }
  findings: UrlAuditFinding[]
  systems: {
    googleSeo: {
      label: 'Google SEO'
      state: 'automated-public-page'
      httpStatus: number
      redirects: number
      findings: UrlAuditFinding[]
      sitemap: { state: 'found' | 'not-found' | 'not-checked'; url: string; detail: string }
      limitations: string
    }
    yahooJapan: {
      label: 'Yahoo! JAPAN'
      state: 'manual-unconfigured'
      measuredRank: null
      detail: string
      limitations: string
    }
    geo: {
      label: 'GEO（生成AI向け情報設計）'
      state: 'heuristic-guidance'
      findings: UrlAuditFinding[]
      limitations: string
    }
  }
  recommendations: UrlAuditRecommendation[]
  disclosure: {
    automated: string
    heuristic: string
    manualReview: string
    noChangesMade: string
  }
}

type Resolver = (hostname: string) => Promise<string[]>
type Fetcher = typeof fetch

export async function normalizeAndValidatePublicUrl(
  value: unknown,
  resolver: Resolver = resolveHostname,
): Promise<URL> {
  return (await validateAndResolve(value, resolver)).url
}

async function validateAndResolve(value: unknown, resolver: Resolver): Promise<{ url: URL; addresses: string[] }> {
  if (typeof value !== 'string' || value.length > 2_048 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new UrlAuditError('INVALID_URL')
  }

  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new UrlAuditError('INVALID_URL')
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new UrlAuditError('INVALID_URL')
  }
  if ((url.protocol === 'http:' && url.port && url.port !== '80') ||
      (url.protocol === 'https:' && url.port && url.port !== '443')) {
    throw new UrlAuditError('URL_NOT_PUBLIC')
  }
  url.hash = ''

  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
  if (
    !hostname ||
    hostname.length > 253 ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.home.arpa')
  ) {
    throw new UrlAuditError('URL_NOT_PUBLIC')
  }

  const addresses = isIP(hostname) ? [hostname] : await resolver(hostname).catch(() => [])
  if (addresses.length === 0 || addresses.some(isNonPublicAddress)) {
    throw new UrlAuditError('URL_NOT_PUBLIC')
  }
  return { url, addresses }
}

export async function auditPublicUrl(
  value: unknown,
  dependencies: { fetcher?: Fetcher; resolver?: Resolver; now?: () => Date } = {},
): Promise<UrlAuditReport> {
  const resolver = dependencies.resolver ?? resolveHostname
  let validated = await validateAndResolve(value, resolver)
  let current = validated.url
  let response: Response | null = null
  let redirectCount = 0

  for (let redirects = 0; redirects <= URL_AUDIT_LIMITS.maxRedirects; redirects += 1) {
    response = dependencies.fetcher
      ? await fetchWithTimeout(dependencies.fetcher, current)
      : await fetchPinned(current, validated.addresses, URL_AUDIT_LIMITS.maxResponseBytes, 'text/html,application/xhtml+xml')
    if (![301, 302, 303, 307, 308].includes(response.status)) break
    redirectCount += 1
    if (redirects === URL_AUDIT_LIMITS.maxRedirects) throw new UrlAuditError('FETCH_FAILED')
    const location = response.headers.get('location')
    if (!location) throw new UrlAuditError('FETCH_FAILED')
    await response.body?.cancel()
    let next: URL
    try {
      next = new URL(location, current)
    } catch {
      throw new UrlAuditError('FETCH_FAILED')
    }
    validated = await validateAndResolve(next.href, resolver)
    current = validated.url
  }

  if (!response || !response.ok) throw new UrlAuditError('FETCH_FAILED')
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml+xml')) {
    throw new UrlAuditError('UNSUPPORTED_PAGE')
  }
  const declaredSize = Number(response.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredSize) && declaredSize > URL_AUDIT_LIMITS.maxResponseBytes) {
    throw new UrlAuditError('PAGE_TOO_LARGE')
  }

  const html = await readLimitedText(response, URL_AUDIT_LIMITS.maxResponseBytes)
  const page = extractPageSignals(html, response.status, current)
  const findings = buildFindings(page)
  const geoFindings = buildGeoFindings(html, page)
  const sitemap = await discoverSitemap(current, validated.addresses, dependencies.fetcher, resolver)
  return {
    mode: 'live-public-page',
    requestedUrl: String(value).trim(),
    finalUrl: current.href,
    fetchedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    inspectedPages: 1,
    limits: {
      maxPages: URL_AUDIT_LIMITS.maxPages,
      maxResponseBytes: URL_AUDIT_LIMITS.maxResponseBytes,
    },
    page,
    findings,
    systems: {
      googleSeo: {
        label: 'Google SEO',
        state: 'automated-public-page',
        httpStatus: page.httpStatus,
        redirects: redirectCount,
        findings,
        sitemap,
        limitations: '公開HTMLとsitemap.xml候補だけの確認です。Googleのインデックス登録、検索順位、Core Web Vitalsは測定していません。',
      },
      yahooJapan: {
        label: 'Yahoo! JAPAN',
        state: 'manual-unconfigured',
        measuredRank: null,
        detail: '順位計測は未接続です。表示されるサンプル順位やGoogle向け推定を、Yahoo! JAPANの実測順位として扱いません。',
        limitations: '検索結果の確認には、対象キーワード・地域・日時を定めた別の手動確認または正式な計測接続が必要です。',
      },
      geo: {
        label: 'GEO（生成AI向け情報設計）',
        state: 'heuristic-guidance',
        findings: geoFindings,
        limitations: '公開HTMLの構造から改善候補を示すだけです。生成AIでの表示、引用、参照、可視性を測定・保証するものではありません。',
      },
    },
    recommendations: buildRecommendations(findings),
    disclosure: {
      automated: '指定された公開ページ1件のHTMLを取得し、タイトル・説明・見出し・canonical・robotsなどを機械的に確認しました。',
      heuristic: '文字数やタグ有無に基づく簡易判定です。検索順位、検索需要、サイト全体の品質は測定していません。',
      manualReview: '30日計画を確定するには、Search Consoleの閲覧専用データと担当者による競合・意図の確認が必要です。',
      noChangesMade: '対象サイトへのログイン、書き込み、設定変更は一切行っていません。',
    },
  }
}

export class UrlAuditError extends Error {
  constructor(public readonly code: 'INVALID_URL' | 'URL_NOT_PUBLIC' | 'FETCH_FAILED' | 'UNSUPPORTED_PAGE' | 'PAGE_TOO_LARGE') {
    super(code)
  }
}

async function resolveHostname(hostname: string): Promise<string[]> {
  const results = await lookup(hostname, { all: true, verbatim: true })
  return [...new Set(results.map((result) => result.address))]
}

function isNonPublicAddress(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0]
  if (normalized.startsWith('::ffff:')) return isNonPublicAddress(normalized.slice(7))
  if (isIP(normalized) === 4) {
    const [a, b, c] = normalized.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 2) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    )
  }
  if (isIP(normalized) === 6) {
    const words = expandIpv6(normalized)
    if (!words) return true
    // Public audit accepts only native IPv6 global unicast (2000::/3), then
    // removes IANA special-use blocks inside that space. This positive gate is
    // intentionally narrower than merely enumerating private/link-local ranges.
    const globalUnicast = words[0] >= 0x2000 && words[0] <= 0x3fff
    const protocolAssignments = words[0] === 0x2001 && words[1] <= 0x01ff // 2001::/23
    const documentation = words[0] === 0x2001 && words[1] === 0x0db8 // 2001:db8::/32
    const sixToFour = words[0] === 0x2002 // may encode a non-public IPv4 endpoint
    const documentationV2 = words[0] === 0x3fff && words[1] <= 0x0fff // 3fff::/20
    return !globalUnicast || protocolAssignments || documentation || sixToFour || documentationV2
  }
  return true
}

function expandIpv6(address: string): number[] | null {
  const halves = address.split('::')
  if (halves.length > 2) return null
  const parseHalf = (half: string): number[] | null => {
    if (!half) return []
    const result: number[] = []
    for (const token of half.split(':')) {
      if (token.includes('.')) {
        const bytes = token.split('.').map(Number)
        if (bytes.length !== 4 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return null
        result.push((bytes[0] << 8) | bytes[1], (bytes[2] << 8) | bytes[3])
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(token)) return null
        result.push(Number.parseInt(token, 16))
      }
    }
    return result
  }
  const left = parseHalf(halves[0])
  const right = parseHalf(halves[1] ?? '')
  if (!left || !right) return null
  const missing = 8 - left.length - right.length
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null
  return [...left, ...Array(Math.max(0, missing)).fill(0), ...right]
}

async function fetchWithTimeout(fetcher: Fetcher, url: URL): Promise<Response> {
  try {
    return await fetcher(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'EnkiSeoPublicAudit/1.0 (+https://enkiseojp.com/)',
      },
      signal: AbortSignal.timeout(URL_AUDIT_LIMITS.timeoutMs),
    })
  } catch {
    throw new UrlAuditError('FETCH_FAILED')
  }
}

/** Connect to the exact address that passed validation; DNS is not consulted by the socket. */
async function fetchPinned(
  url: URL,
  addresses: string[],
  maxBytes: number,
  accept: string,
): Promise<Response> {
  const address = addresses[0]
  if (!address || isNonPublicAddress(address)) throw new UrlAuditError('URL_NOT_PUBLIC')
  return await new Promise<Response>((resolve, reject) => {
    let settled = false
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(pinnedRequestOptions(url, address, accept), (incoming) => {
      const chunks: Buffer[] = []
      let total = 0
      incoming.on('data', (chunk: Buffer) => {
        total += chunk.byteLength
        if (total > maxBytes) {
          incoming.destroy(new UrlAuditError('PAGE_TOO_LARGE'))
          return
        }
        chunks.push(chunk)
      })
      incoming.on('end', () => {
        if (settled) return
        settled = true
        clearTimeout(totalTimer)
        const headers = new Headers()
        for (const [key, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) value.forEach((item) => headers.append(key, item))
          else if (value !== undefined) headers.set(key, String(value))
        }
        const status = incoming.statusCode ?? 502
        resolve(new Response(status === 204 || status === 304 ? null : Buffer.concat(chunks), { status, headers }))
      })
      incoming.on('error', (error) => {
        if (settled) return
        settled = true
        clearTimeout(totalTimer)
        reject(error)
      })
    })
    const totalTimer = setTimeout(() => request.destroy(new UrlAuditError('FETCH_FAILED')), URL_AUDIT_LIMITS.timeoutMs)
    request.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(totalTimer)
      reject(error instanceof UrlAuditError ? error : new UrlAuditError('FETCH_FAILED'))
    })
    request.end()
  })
}

export function pinnedRequestOptions(url: URL, validatedAddress: string, accept: string): RequestOptions {
  if (isNonPublicAddress(validatedAddress)) throw new UrlAuditError('URL_NOT_PUBLIC')
  return {
    protocol: url.protocol,
    // The socket connects to this already-validated literal, never a fresh DNS lookup.
    hostname: validatedAddress,
    family: isIP(validatedAddress),
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    method: 'GET',
    // Preserve certificate validation and virtual hosting for the requested hostname.
    servername: url.hostname.replace(/^\[|\]$/g, ''),
    headers: {
      Host: url.host,
      Accept: accept,
      'User-Agent': 'EnkiSeoPublicAudit/1.0 (+https://enkiseojp.com/)',
    },
  }
}

async function discoverSitemap(
  pageUrl: URL,
  validatedAddresses: string[],
  injectedFetcher: Fetcher | undefined,
  resolver: Resolver,
): Promise<UrlAuditReport['systems']['googleSeo']['sitemap']> {
  const sitemapUrl = new URL('/sitemap.xml', pageUrl)
  try {
    const validated = sitemapUrl.hostname === pageUrl.hostname
      ? { url: sitemapUrl, addresses: validatedAddresses }
      : await validateAndResolve(sitemapUrl.href, resolver)
    const response = injectedFetcher
      ? await fetchWithTimeout(injectedFetcher, validated.url)
      : await fetchPinned(validated.url, validated.addresses, URL_AUDIT_LIMITS.maxSitemapBytes, 'application/xml,text/xml,text/plain')
    const type = response.headers.get('content-type')?.toLowerCase() ?? ''
    const found = response.ok && (type.includes('xml') || /<urlset\b|<sitemapindex\b/i.test(await readLimitedText(response, URL_AUDIT_LIMITS.maxSitemapBytes)))
    return found
      ? { state: 'found', url: sitemapUrl.href, detail: 'sitemap.xml候補を公開URLで確認しました。掲載URLの網羅性は別途確認が必要です。' }
      : { state: 'not-found', url: sitemapUrl.href, detail: '標準位置ではsitemap.xmlを確認できませんでした。別URLで提供されている場合があります。' }
  } catch {
    return { state: 'not-checked', url: sitemapUrl.href, detail: '安全な取得上限内でsitemap.xmlを確認できませんでした。' }
  }
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new UrlAuditError('PAGE_TOO_LARGE')
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

function extractPageSignals(html: string, httpStatus: number, pageUrl: URL): UrlAuditReport['page'] {
  const title = cleanText(firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i))
  const description = cleanText(metaContent(html, 'description'))
  const h1 = cleanText(firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i))
  const lang = attributeValue(firstMatch(html, /<html\b([^>]*)>/i), 'lang')
  const canonicalTag = firstMatch(html, /<link\b([^>]*\brel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*)>/i)
  const canonical = attributeValue(canonicalTag, 'href')
  const robots = metaContent(html, 'robots')
  const headingCount = (level: number) => (html.match(new RegExp(`<h${level}\\b`, 'gi')) ?? []).length
  const structuredDataTypes = [...new Set(
    [...html.matchAll(/["']@type["']\s*:\s*["']([^"']+)["']/gi)].map((match) => cleanText(match[1])).filter((item): item is string => Boolean(item)),
  )].slice(0, 12)
  const hasViewport = Boolean(metaContent(html, 'viewport'))
  let internalLinks = 0
  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const href = attributeValue(match[1], 'href')
    if (!href || /^(?:mailto:|tel:|javascript:|#)/i.test(href)) continue
    try {
      if (new URL(href, pageUrl).origin === pageUrl.origin) internalLinks += 1
    } catch { /* malformed links are ignored */ }
  }
  const imageTags = [...html.matchAll(/<img\b([^>]*)>/gi)]
  const visible = cleanText(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' '),
  )
  return {
    httpStatus,
    title,
    description,
    h1,
    lang,
    canonical,
    robots,
    contentCharacters: visible?.length ?? 0,
    headings: { h1: headingCount(1), h2: headingCount(2), h3: headingCount(3) },
    structuredDataTypes,
    hasViewport,
    internalLinks,
    images: imageTags.length,
    imagesMissingAlt: imageTags.filter((match) => attributeValue(match[1], 'alt') === null).length,
    imagesLazyLoaded: imageTags.filter((match) => attributeValue(match[1], 'loading')?.toLowerCase() === 'lazy').length,
    scriptTags: (html.match(/<script\b/gi) ?? []).length,
    responseBytes: new TextEncoder().encode(html).byteLength,
  }
}

function buildFindings(page: UrlAuditReport['page']): UrlAuditFinding[] {
  return [
    signal('title', 'ページタイトル', page.title, 15, 65),
    signal('description', 'メタ説明', page.description, 40, 180),
    signal('h1', '主見出し（H1）', page.h1, 2, 120),
    {
      key: 'canonical', label: 'canonical', status: page.canonical ? 'ok' : 'review',
      detail: page.canonical ? 'canonical URL が指定されています。' : '指定が見つかりません。重複URLの有無とあわせて確認してください。',
    },
    {
      key: 'robots', label: 'インデックス指示',
      status: /noindex/i.test(page.robots ?? '') ? 'missing' : 'ok',
      detail: /noindex/i.test(page.robots ?? '') ? 'noindex 指示が見つかりました。意図した設定か確認してください。' : 'HTML上に noindex 指示は見つかりませんでした。',
    },
    {
      key: 'content', label: '本文量（簡易）', status: page.contentCharacters >= 500 ? 'ok' : 'review',
      detail: `可視テキストを約 ${page.contentCharacters.toLocaleString('ja-JP')} 文字として検出しました。内容の有用性は人による確認が必要です。`,
    },
    {
      key: 'headings', label: '見出し構造', status: page.headings.h1 === 1 && page.headings.h2 > 0 ? 'ok' : 'review',
      detail: `H1 ${page.headings.h1}件、H2 ${page.headings.h2}件、H3 ${page.headings.h3}件を検出しました。階層と内容は人による確認が必要です。`,
    },
    {
      key: 'structured-data', label: '構造化データ', status: page.structuredDataTypes.length ? 'ok' : 'review',
      detail: page.structuredDataTypes.length ? `検出タイプ: ${page.structuredDataTypes.join('、')}` : 'JSON-LDの@typeを検出できませんでした。必要性を確認してください。',
    },
    {
      key: 'lang-viewport', label: '言語・viewport', status: page.lang && page.hasViewport ? 'ok' : 'review',
      detail: `lang: ${page.lang ?? '検出なし'}、viewport: ${page.hasViewport ? 'あり' : '検出なし'}。`,
    },
    {
      key: 'internal-links', label: '内部リンク', status: page.internalLinks > 0 ? 'ok' : 'review',
      detail: `同一オリジンへのリンクを${page.internalLinks}件検出しました。リンク先の品質や到達可否は確認していません。`,
    },
    {
      key: 'performance-hints', label: '表示性能の安全なヒント', status: page.responseBytes < 200_000 ? 'ok' : 'review',
      detail: `HTML約${Math.ceil(page.responseBytes / 1024)}KB、script ${page.scriptTags}件、画像${page.images}件（loading=lazy ${page.imagesLazyLoaded}件）を検出しました。速度やCore Web Vitalsは計測していません。`,
    },
  ]
}

function buildGeoFindings(html: string, page: UrlAuditReport['page']): UrlAuditFinding[] {
  const visible = cleanText(html) ?? ''
  const hasOrg = page.structuredDataTypes.some((type) => /Organization|LocalBusiness|Person/i.test(type)) || /会社概要|運営者|著者/.test(visible)
  const hasDate = page.structuredDataTypes.some((type) => /Article|BlogPosting|NewsArticle/i.test(type)) || /(?:公開|更新)日|20\d{2}[年./-]/.test(visible)
  const hasSources = /参考|出典|引用|source|citation/i.test(visible) || (html.match(/<a\b/gi) ?? []).length >= 3
  const faqSuitable = (html.match(/<h[2-4]\b[^>]*>[^<]*(?:？|\?)/gi) ?? []).length > 0 || /よくある質問|FAQ/i.test(visible)
  const answerFirst = Boolean(page.description && page.h1 && page.contentCharacters >= 300)
  return [
    { key: 'answer-first', label: '結論先行の要約', status: answerFirst ? 'ok' : 'review', detail: answerFirst ? 'タイトル・説明・主見出しと一定量の本文を検出しました。回答の明確さは人が確認してください。' : '冒頭で対象・結論・提供価値を短く明示する余地があります。' },
    { key: 'entity-clarity', label: '組織・著者の明確さ', status: hasOrg ? 'ok' : 'review', detail: hasOrg ? '組織・著者を示す語または構造化データを検出しました。正確性は未確認です。' : '運営組織、著者、専門性、問い合わせ先を明確にすることを検討してください。' },
    { key: 'dates-sources', label: '日付・根拠・出典', status: hasDate && hasSources ? 'ok' : 'review', detail: `日付: ${hasDate ? '候補あり' : '未検出'}、出典: ${hasSources ? '候補あり' : '未検出'}。重要な主張には一次情報への参照を添えてください。` },
    { key: 'geo-structured-data', label: '意味構造・構造化データ', status: page.structuredDataTypes.length ? 'ok' : 'review', detail: page.structuredDataTypes.length ? `検出タイプ: ${page.structuredDataTypes.join('、')}。内容との一致は未確認です。` : 'ページ内容に合う構造化データを、事実と一致する場合だけ検討してください。' },
    { key: 'faq-freshness', label: 'FAQ適性・鮮度', status: faqSuitable && hasDate ? 'ok' : 'review', detail: `FAQ候補: ${faqSuitable ? 'あり' : '未検出'}、更新日候補: ${hasDate ? 'あり' : '未検出'}。実際の顧客質問と更新履歴を人が確認してください。` },
  ]
}

function signal(key: string, label: string, value: string | null, min: number, max: number): UrlAuditFinding {
  if (!value) return { key, label, status: 'missing', detail: `${label}が見つかりません。` }
  const status = value.length >= min && value.length <= max ? 'ok' : 'review'
  return { key, label, status, detail: `${value.length}文字です。内容と検索意図の一致は人による確認が必要です。` }
}

function buildRecommendations(findings: UrlAuditFinding[]): UrlAuditRecommendation[] {
  const needs = new Map(findings.filter((item) => item.status !== 'ok').map((item) => [item.key, item]))
  return [
    {
      period: '1〜3日目',
      action: needs.has('robots') ? 'noindex の意図を確認し、公開対象なら設定を見直す' : 'Search Consoleで対象ページのインデックス状況と検索クエリを確認する',
      reason: '公開HTMLだけではGoogleの登録状況や流入クエリを確定できないため',
    },
    {
      period: '4〜10日目',
      action: needs.has('title') || needs.has('description') || needs.has('h1') ? 'タイトル・説明・H1を検索意図に合わせて整理する' : '主要クエリとページ内容の対応を確認し、伝わりにくい箇所を改善する',
      reason: '検索結果とページ冒頭で内容を明確に伝えるため',
    },
    {
      period: '11〜20日目',
      action: needs.has('content') ? '顧客の疑問、選び方、料金・対応範囲など不足情報を補う' : '関連ページからの内部リンクと、次の行動への導線を点検する',
      reason: '訪問者が判断に必要な情報へ到達しやすくするため',
    },
    {
      period: '21〜30日目',
      action: '変更日を記録し、Search Consoleで表示回数・クリック・掲載順位の変化を比較する',
      reason: '順位や成果を保証せず、実データで次の改善優先度を決めるため',
    },
  ]
}

function metaContent(html: string, name: string): string | null {
  for (const match of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs = match[1]
    if (attributeValue(attrs, 'name')?.toLowerCase() === name) return attributeValue(attrs, 'content')
  }
  return null
}

function attributeValue(attributes: string | null, name: string): string | null {
  if (!attributes) return null
  const pattern = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, 'i')
  const match = attributes.match(pattern)
  return match ? decodeEntities(match[1] ?? match[2] ?? '') : null
}

function firstMatch(value: string, pattern: RegExp): string | null {
  return value.match(pattern)?.[1] ?? null
}

function cleanText(value: string | null): string | null {
  if (!value) return null
  const result = decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  return result || null
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

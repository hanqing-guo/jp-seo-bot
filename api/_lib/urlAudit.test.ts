import { describe, expect, it, vi } from 'vitest'
import { auditPublicUrl, normalizeAndValidatePublicUrl, pinnedRequestOptions, UrlAuditError } from './urlAudit'

const publicResolver = async () => ['93.184.216.34']

describe('normalizeAndValidatePublicUrl', () => {
  it.each([
    'file:///etc/passwd',
    'http://localhost/',
    'http://service.internal/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://[fec0::1]/',
    'http://[64:ff9b:1::1]/',
    'http://[100::1]/',
    'http://[2001:2::1]/',
    'http://[2001:db8::1]/',
    'http://[2002:0a00:0001::1]/',
    'http://[3fff::1]/',
    'http://169.254.169.254/latest/meta-data/',
    'https://user:password@example.com/',
    'https://example.com:8443/',
  ])('rejects unsafe URL %s', async (url) => {
    await expect(normalizeAndValidatePublicUrl(url, publicResolver)).rejects.toSatisfy(
      (error: unknown) => error instanceof UrlAuditError && ['INVALID_URL', 'URL_NOT_PUBLIC'].includes(error.code),
    )
  })

  it('rejects hostnames if any resolved address is private', async () => {
    await expect(normalizeAndValidatePublicUrl('https://example.com/', async () => ['93.184.216.34', '10.0.0.4']))
      .rejects.toMatchObject({ code: 'URL_NOT_PUBLIC' })
  })

  it('accepts a regular public HTTPS URL and removes fragments', async () => {
    const url = await normalizeAndValidatePublicUrl('https://example.com/path#private-fragment', publicResolver)
    expect(url.href).toBe('https://example.com/path')
  })

  it('accepts a native public IPv6 global-unicast literal', async () => {
    const url = await normalizeAndValidatePublicUrl('https://[2606:4700:4700::1111]/', publicResolver)
    expect(url.hostname).toBe('[2606:4700:4700::1111]')
  })
})

describe('auditPublicUrl', () => {
  it('pins the socket to the validated IP while preserving TLS SNI and Host', () => {
    const options = pinnedRequestOptions(new URL('https://example.com/path?q=1'), '93.184.216.34', 'text/html')
    expect(options.hostname).toBe('93.184.216.34')
    expect(options.servername).toBe('example.com')
    expect(options.headers).toMatchObject({ Host: 'example.com' })
    expect(options.path).toBe('/path?q=1')
  })

  it('extracts public HTML signals and returns an explicitly limited heuristic report', async () => {
    const fetcher = vi.fn(async () => new Response(`<!doctype html>
      <html lang="ja"><head>
        <title>東京のサンプル事業者｜サービス案内</title>
        <meta name="description" content="地域のお客様向けサービスの内容、料金、対応地域をご案内します。初めての方にも分かりやすく説明します。">
        <link rel="canonical" href="https://example.com/">
      </head><body><h1>地域のお客様向けサービス</h1><p>${'公開情報です。'.repeat(100)}</p></body></html>`, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })) as typeof fetch

    const report = await auditPublicUrl('https://example.com/', {
      fetcher,
      resolver: publicResolver,
      now: () => new Date('2026-09-06T00:00:00.000Z'),
    })

    expect(report.mode).toBe('live-public-page')
    expect(report.inspectedPages).toBe(1)
    expect(report.limits.maxPages).toBe(1)
    expect(report.page.title).toContain('サンプル事業者')
    expect(report.page.h1).toBe('地域のお客様向けサービス')
    expect(report.recommendations).toHaveLength(4)
    expect(report.systems.googleSeo.label).toBe('Google SEO')
    expect(report.systems.googleSeo.state).toBe('automated-public-page')
    expect(report.systems.googleSeo.findings.map((finding) => finding.key)).toEqual(expect.arrayContaining([
      'headings', 'structured-data', 'lang-viewport', 'internal-links', 'performance-hints',
    ]))
    expect(report.systems.yahooJapan).toMatchObject({
      label: 'Yahoo! JAPAN',
      state: 'manual-unconfigured',
      measuredRank: null,
    })
    expect(report.systems.yahooJapan.detail).toContain('実測順位として扱いません')
    expect(report.systems.geo.label).toBe('GEO（生成AI向け情報設計）')
    expect(report.systems.geo.state).toBe('heuristic-guidance')
    expect(report.systems.geo.findings.map((finding) => finding.key)).toEqual(expect.arrayContaining([
      'answer-first', 'entity-clarity', 'dates-sources', 'geo-structured-data', 'faq-freshness',
    ]))
    expect(report.systems.geo.limitations).toContain('測定・保証するものではありません')
    expect(JSON.stringify(report.systems.geo)).not.toMatch(/visibility score|可視性スコア|引用数/i)
    expect(report.disclosure.heuristic).toContain('簡易判定')
    expect(report.disclosure.noChangesMade).toContain('変更は一切')
    expect(fetcher).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: 'manual', method: 'GET' }))
  })

  it('discovers the standard sitemap as a bounded auxiliary request', async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input)
      if (url.endsWith('/sitemap.xml')) {
        return new Response('<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url></urlset>', {
          headers: { 'content-type': 'application/xml' },
        })
      }
      return new Response('<html lang="ja"><head><title>十分な長さのタイトルです</title><meta name="viewport" content="width=device-width"></head><body><h1>見出し</h1><h2>詳細</h2></body></html>', {
        headers: { 'content-type': 'text/html' },
      })
    }) as typeof fetch
    const report = await auditPublicUrl('https://example.com/', { fetcher, resolver: publicResolver })
    expect(report.systems.googleSeo.sitemap.state).toBe('found')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('revalidates redirect destinations and blocks a redirect to a private host', async () => {
    const fetcher = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1/admin' },
    })) as typeof fetch

    await expect(auditPublicUrl('https://example.com/', { fetcher, resolver: publicResolver }))
      .rejects.toMatchObject({ code: 'URL_NOT_PUBLIC' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects a response larger than the byte cap without returning its content', async () => {
    const fetcher = vi.fn(async () => new Response('<html></html>', {
      headers: { 'content-type': 'text/html', 'content-length': '600000' },
    })) as typeof fetch

    await expect(auditPublicUrl('https://example.com/', { fetcher, resolver: publicResolver }))
      .rejects.toEqual(new UrlAuditError('PAGE_TOO_LARGE'))
  })

  it('does not expose upstream response details in its error', async () => {
    const fetcher = vi.fn(async () => new Response('secret upstream details', { status: 500 })) as typeof fetch
    await expect(auditPublicUrl('https://example.com/', { fetcher, resolver: publicResolver }))
      .rejects.toEqual(new UrlAuditError('FETCH_FAILED'))
  })
})

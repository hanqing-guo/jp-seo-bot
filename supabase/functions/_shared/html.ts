// HTML 取得 + パース基盤 (Deno + linkedom)
// DIAGNOSIS_SPEC.md §3-§7 の各 module から共通利用される。

// linkedom は Deno 互換の ESM 化 DOM パーサ。
import { parseHTML as linkedomParse } from 'https://esm.sh/linkedom@0.16.10'

export interface FetchHtmlOptions {
  timeoutMs?: number
  userAgent?: string
}

const DEFAULT_UA = 'JP-SEO-Bot/1.0 (+https://jp-seo-bot.example.co.jp/bot)'

export class FetchError extends Error {
  constructor(public code: string, message: string, public status?: number) {
    super(message)
    this.name = 'FetchError'
  }
}

/**
 * 任意 URL の HTML を取得する。Phase 2-3 の各 module から呼ばれる。
 * SSRF ガード (§13 BLOCKED_HOSTS) と timeout を組み込み。
 */
export async function fetchHtml(
  url: string,
  opts: FetchHtmlOptions = {},
): Promise<string> {
  const timeout = opts.timeoutMs ?? 10000
  const ua = opts.userAgent ?? DEFAULT_UA

  const host = new URL(url).hostname
  const blocked = /^(127\.|localhost|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/
  if (blocked.test(host)) {
    throw new FetchError('BLOCKED_HOST', `内部アドレス (${host}) へのアクセスはブロックされました`)
  }

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept-Language': 'ja,en;q=0.8' },
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow',
    })
  } catch (e) {
    throw new FetchError(
      'SITE_UNREACHABLE',
      `サイトにアクセスできませんでした: ${e instanceof Error ? e.message : String(e)}`,
    )
  }

  if (!res.ok) {
    throw new FetchError('HTTP_ERROR', `HTTP ${res.status} を返しました`, res.status)
  }

  const ct = res.headers.get('content-type') ?? ''
  if (!/text\/html|application\/xhtml/i.test(ct)) {
    throw new FetchError('NOT_HTML', `HTML 以外のコンテンツです (Content-Type: ${ct})`)
  }

  return await res.text()
}

/** HTML 文字列 → DOM-like document (querySelector / querySelectorAll など利用可) */
export function parseHTML(html: string): Document {
  const { document } = linkedomParse(html)
  return document as unknown as Document
}

/** URL からドメイン (hostname) を抽出 */
export function extractDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '')
}

/** URL 正規化 (protocol 補完など) */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return new URL(withProto).toString()
}

import { apiError, apiJson, readJsonObject } from './_lib/apiSecurity'
import { auditPublicUrl, UrlAuditError } from './_lib/urlAudit'
import type { IncomingMessage, ServerResponse } from 'node:http'

const WINDOW_MS = 15 * 60_000
const REQUEST_LIMIT = 5
const buckets = new Map<string, { count: number; resetAt: number }>()

export async function handleUrlAuditRequest(req: Request): Promise<Response> {
  if (req.method !== 'POST') return apiError(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' })

  const rate = consume(req)
  if (!rate.allowed) {
    return apiError(429, 'RATE_LIMITED', {
      'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1_000))),
    })
  }

  const body = await readJsonObject(req, 2_200)
  if (body instanceof Response) return body

  try {
    return apiJson(200, await auditPublicUrl(body.url))
  } catch (error) {
    if (error instanceof UrlAuditError) {
      const statuses: Record<UrlAuditError['code'], number> = {
        INVALID_URL: 400,
        URL_NOT_PUBLIC: 400,
        FETCH_FAILED: 422,
        UNSUPPORTED_PAGE: 422,
        PAGE_TOO_LARGE: 422,
      }
      return apiError(statuses[error.code], error.code)
    }
    console.error('url-audit failed')
    return apiError(500, 'AUDIT_FAILED')
  }
}

/** Vercel Node Functions entrypoint (Node request/response contract). */
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item))
    else if (value !== undefined) headers.set(key, String(value))
  }
  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    else body = await readNodeBody(req)
  }
  const response = await handleUrlAuditRequest(new Request(`https://local.invalid${req.url ?? '/api/url-audit'}`, {
    method: req.method,
    headers,
    body,
  }))
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

async function readNodeBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += bytes.byteLength
    if (total > 2_200) return JSON.stringify({ oversized: true, padding: 'x'.repeat(2_201) })
    chunks.push(bytes)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function consume(req: Request): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const key = `url-audit:${ip}`
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 2_000) {
      for (const [candidate, value] of buckets) if (value.resetAt <= now) buckets.delete(candidate)
    }
    const created = { count: 1, resetAt: now + WINDOW_MS }
    buckets.set(key, created)
    return { allowed: true, resetAt: created.resetAt }
  }
  if (bucket.count >= REQUEST_LIMIT) return { allowed: false, resetAt: bucket.resetAt }
  bucket.count += 1
  return { allowed: true, resetAt: bucket.resetAt }
}

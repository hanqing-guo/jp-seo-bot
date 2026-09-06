/**
 * Shared protection for private/cost-bearing pilot APIs.
 *
 * Tokens are minted out-of-band by the pilot operator and are never embedded in
 * the Vite bundle. Format: base64url(JSON payload).base64url(HMAC-SHA256).
 */

export type PilotScope = 'article:generate' | 'gsc:read' | 'serp:read'

interface PilotTokenPayload {
  v: 1
  sub: string
  exp: number
  scopes: PilotScope[]
  /** Exact server-side resource binding, used to prevent cross-site GSC access. */
  resource?: string
}

interface AuthorizeOptions {
  signingSecret?: string
  allowedOrigin?: string
  scope: PilotScope
  limit: number
  windowMs: number
  requiredResource?: string
}

interface RateBucket {
  count: number
  resetAt: number
}

const rateBuckets = new Map<string, RateBucket>()
const MAX_BUCKETS = 5_000

const commonHeaders: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export async function authorizePilotRequest(
  req: Request,
  options: AuthorizeOptions,
): Promise<Response | { subject: string }> {
  if (!options.signingSecret || options.signingSecret.length < 32) {
    return apiError(503, 'SERVICE_UNAVAILABLE')
  }
  const origin = req.headers.get('origin')
  if (origin && options.allowedOrigin && origin !== options.allowedOrigin) {
    return apiError(403, 'FORBIDDEN')
  }

  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return apiError(401, 'UNAUTHORIZED')
  const token = auth.slice('Bearer '.length).trim()
  const payload = await verifyPilotToken(token, options.signingSecret)
  if (!payload || !payload.scopes.includes(options.scope)) {
    return apiError(401, 'UNAUTHORIZED')
  }
  if (options.requiredResource && payload.resource !== options.requiredResource) {
    return apiError(403, 'RESOURCE_FORBIDDEN')
  }

  const ip = clientIp(req)
  const subjectRate = consumeRateLimit(`subject:${options.scope}:${payload.sub}`, options.limit, options.windowMs)
  const ipRate = consumeRateLimit(`ip:${options.scope}:${ip}`, options.limit * 2, options.windowMs)
  if (!subjectRate.allowed || !ipRate.allowed) {
    const resetAt = Math.max(subjectRate.resetAt, ipRate.resetAt)
    return apiError(429, 'RATE_LIMITED', {
      'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
    })
  }
  return { subject: payload.sub }
}

export async function readJsonObject(
  req: Request,
  maxBytes = 4_096,
): Promise<Record<string, unknown> | Response> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return apiError(415, 'UNSUPPORTED_MEDIA_TYPE')
  }
  const declaredLength = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return apiError(413, 'PAYLOAD_TOO_LARGE')
  }
  let text: string
  try {
    text = await req.text()
  } catch {
    return apiError(400, 'INVALID_REQUEST')
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return apiError(413, 'PAYLOAD_TOO_LARGE')
  }
  try {
    const value = JSON.parse(text) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return apiError(400, 'INVALID_REQUEST')
    }
    return value as Record<string, unknown>
  } catch {
    return apiError(400, 'INVALID_JSON')
  }
}

export function validKeyword(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null
  const keyword = value.trim()
  if (!keyword || keyword.length > maxLength || /[\u0000-\u001f\u007f]/.test(keyword)) return null
  return keyword
}

export function apiError(
  status: number,
  code: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...commonHeaders, ...headers },
  })
}

export function apiJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: commonHeaders })
}

async function verifyPilotToken(token: string, secret: string): Promise<PilotTokenPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(parts[1]),
      new TextEncoder().encode(parts[0]),
    )
    if (!valid) return null
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as Partial<PilotTokenPayload>
    if (
      payload.v !== 1 ||
      typeof payload.sub !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(payload.sub) ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      payload.exp > Math.floor(Date.now() / 1000) + 31 * 86_400 ||
      !Array.isArray(payload.scopes) ||
      !payload.scopes.every(isPilotScope) ||
      (payload.resource !== undefined && (
        typeof payload.resource !== 'string' ||
        payload.resource.length < 1 ||
        payload.resource.length > 512 ||
        /[\u0000-\u001f\u007f]/.test(payload.resource)
      ))
    ) return null
    return payload as PilotTokenPayload
  } catch {
    return null
  }
}

function isPilotScope(value: unknown): value is PilotScope {
  return value === 'article:generate' || value === 'gsc:read' || value === 'serp:read'
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'unknown'
}

function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = rateBuckets.get(key)
  if (!current || current.resetAt <= now) {
    if (rateBuckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of rateBuckets) {
        if (bucket.resetAt <= now) rateBuckets.delete(bucketKey)
      }
      if (rateBuckets.size >= MAX_BUCKETS) rateBuckets.delete(rateBuckets.keys().next().value as string)
    }
    const resetAt = now + windowMs
    rateBuckets.set(key, { count: 1, resetAt })
    return { allowed: true, resetAt }
  }
  if (current.count >= limit) return { allowed: false, resetAt: current.resetAt }
  current.count += 1
  return { allowed: true, resetAt: current.resetAt }
}

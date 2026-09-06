import { createHmac, randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { authorizePilotRequest, readJsonObject, validKeyword, type PilotScope } from './apiSecurity'

const secret = 'test-only-signing-secret-at-least-32-characters'

function token(scopes: PilotScope[], options: { exp?: number; subject?: string; resource?: string } = {}) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    sub: options.subject ?? randomUUID(),
    exp: options.exp ?? Math.floor(Date.now() / 1000) + 300,
    scopes,
    ...(options.resource ? { resource: options.resource } : {}),
  })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function request(auth?: string) {
  return new Request('https://example.test/api', {
    method: 'POST',
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
  })
}

describe('pilot API authorization', () => {
  it('fails closed without a server signing secret', async () => {
    const result = await authorizePilotRequest(request(), {
      scope: 'gsc:read', limit: 2, windowMs: 60_000,
    })
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(503)
    expect(await (result as Response).json()).toEqual({ error: 'SERVICE_UNAVAILABLE' })
  })

  it('rejects missing, tampered, expired, and wrong-scope tokens', async () => {
    const cases = [
      undefined,
      `${token(['gsc:read'])}x`,
      token(['gsc:read'], { exp: Math.floor(Date.now() / 1000) - 1 }),
      token(['serp:read']),
    ]
    for (const candidate of cases) {
      const result = await authorizePilotRequest(request(candidate), {
        signingSecret: secret, scope: 'gsc:read', limit: 10, windowMs: 60_000,
      })
      expect(result).toBeInstanceOf(Response)
      expect((result as Response).status).toBe(401)
    }
  })

  it('enforces a per-subject and IP quota', async () => {
    const access = token(['serp:read'])
    const options = { signingSecret: secret, scope: 'serp:read' as const, limit: 2, windowMs: 60_000 }
    expect(await authorizePilotRequest(request(access), options)).not.toBeInstanceOf(Response)
    expect(await authorizePilotRequest(request(access), options)).not.toBeInstanceOf(Response)
    const limited = await authorizePilotRequest(request(access), options) as Response
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
  })

  it('rejects browser calls from an unexpected origin', async () => {
    const access = token(['gsc:read'])
    const req = new Request('https://example.test/api', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, Origin: 'https://attacker.test' },
    })
    const result = await authorizePilotRequest(req, {
      signingSecret: secret,
      allowedOrigin: 'https://enkiseojp.com',
      scope: 'gsc:read',
      limit: 10,
      windowMs: 60_000,
    }) as Response
    expect(result.status).toBe(403)
  })

  it('binds GSC access to the exact configured property', async () => {
    const access = token(['gsc:read'], { resource: 'https://customer-a.example/' })
    const allowed = await authorizePilotRequest(request(access), {
      signingSecret: secret, scope: 'gsc:read', requiredResource: 'https://customer-a.example/', limit: 10, windowMs: 60_000,
    })
    expect(allowed).not.toBeInstanceOf(Response)
    const denied = await authorizePilotRequest(request(access), {
      signingSecret: secret, scope: 'gsc:read', requiredResource: 'https://customer-b.example/', limit: 10, windowMs: 60_000,
    }) as Response
    expect(denied.status).toBe(403)
    expect(await denied.json()).toEqual({ error: 'RESOURCE_FORBIDDEN' })
  })
})

describe('request validation', () => {
  it('requires bounded JSON objects', async () => {
    const wrongType = await readJsonObject(new Request('https://example.test', {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}',
    })) as Response
    expect(wrongType.status).toBe(415)

    const oversized = await readJsonObject(new Request('https://example.test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(100) }),
    }), 20) as Response
    expect(oversized.status).toBe(413)
  })

  it('accepts normal Japanese keywords and rejects control or oversized input', () => {
    expect(validKeyword('  日本 SEO  ')).toBe('日本 SEO')
    expect(validKeyword('bad\nkeyword')).toBeNull()
    expect(validKeyword('長'.repeat(121))).toBeNull()
  })
})

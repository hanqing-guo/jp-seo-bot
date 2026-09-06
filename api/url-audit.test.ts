import { describe, expect, it } from 'vitest'
import vercelHandler, { handleUrlAuditRequest as handler } from './url-audit'

describe('/api/url-audit request controls', () => {
  it('allows POST only', async () => {
    const response = await handler(new Request('https://app.test/api/url-audit', { method: 'GET' }))
    expect(response.status).toBe(405)
    await expect(response.json()).resolves.toEqual({ error: 'METHOD_NOT_ALLOWED' })
  })

  it('requires a small JSON object body', async () => {
    const response = await handler(new Request('https://app.test/api/url-audit', {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'x-forwarded-for': '192.0.2.10' },
      body: 'url=https://example.com',
    }))
    expect(response.status).toBe(415)
    await expect(response.json()).resolves.toEqual({ error: 'UNSUPPORTED_MEDIA_TYPE' })
  })

  it('rate limits repeated anonymous requests by IP', async () => {
    const request = () => handler(new Request('https://app.test/api/url-audit', {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'x-forwarded-for': '192.0.2.20' },
      body: 'invalid',
    }))
    for (let index = 0; index < 5; index += 1) expect((await request()).status).toBe(415)
    const limited = await request()
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
    await expect(limited.json()).resolves.toEqual({ error: 'RATE_LIMITED' })
  })

  it('exposes a Vercel Node request/response handler and returns safe errors', async () => {
    const headers = new Map<string, string>()
    let responseBody = ''
    const response = {
      statusCode: 0,
      setHeader: (key: string, value: string | number | readonly string[]) => headers.set(key.toLowerCase(), String(value)),
      end: (value: Buffer) => { responseBody = value.toString('utf8') },
    }
    await vercelHandler({
      method: 'POST',
      url: '/api/url-audit',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.31' },
      body: { url: 'http://127.0.0.1/private' },
    } as never, response as never)
    expect(response.statusCode).toBe(400)
    expect(headers.get('cache-control')).toBe('no-store')
    expect(JSON.parse(responseBody)).toEqual({ error: 'URL_NOT_PUBLIC' })
  })
})

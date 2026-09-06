import { createHmac, randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import generateArticle from './generate-article'
import gscRank from './gsc-rank'
import indexStatus from './index-status'
import serpCheck from './serp-check'

const secret = 'test-only-signing-secret-at-least-32-characters'

function token(scopes: string[]) {
  const payload = Buffer.from(JSON.stringify({
    v: 1, sub: randomUUID(), exp: Math.floor(Date.now() / 1000) + 300, scopes,
  })).toString('base64url')
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
}

function post(path: string, body: unknown, access?: string) {
  return new Request(`https://example.test/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

afterEach(() => vi.unstubAllEnvs())

describe('private API endpoints', () => {
  it.each([
    ['generate-article', generateArticle],
    ['gsc-rank', gscRank],
    ['index-status', indexStatus],
    ['serp-check', serpCheck],
  ])('protects %s before revealing configuration', async (path, handler) => {
    vi.stubEnv('PILOT_ACCESS_SIGNING_SECRET', secret)
    vi.stubEnv('DEEPSEEK_API_KEY', 'configured-but-must-not-be-used')
    vi.stubEnv('GSC_SA_KEY_B64', 'configured-but-must-not-be-used')
    vi.stubEnv('GSC_SITE_URL', 'sc-domain:example.test')
    vi.stubEnv('DATAFORSEO_LOGIN', 'configured-but-must-not-be-used')
    vi.stubEnv('DATAFORSEO_PASSWORD', 'configured-but-must-not-be-used')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await handler(post(path, {}))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('validates article count before calling the generation provider', async () => {
    vi.stubEnv('PILOT_ACCESS_SIGNING_SECRET', secret)
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await generateArticle(post('generate-article', {
      keyword: 'SEO', tier: 'easy', count: 99,
    }, token(['article:generate'])))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'INVALID_COUNT' })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('keeps paid generation disabled when its provider is absent', async () => {
    vi.stubEnv('PILOT_ACCESS_SIGNING_SECRET', secret)
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    const response = await generateArticle(post('generate-article', {
      keyword: 'SEO', tier: 'easy', count: 1,
    }, token(['article:generate'])))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'FEATURE_UNAVAILABLE' })
  })

  it('rejects index-status request parameters', async () => {
    vi.stubEnv('PILOT_ACCESS_SIGNING_SECRET', secret)
    const response = await indexStatus(post('index-status', { url: 'https://attacker.test' }, token(['gsc:read'])))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'INVALID_REQUEST' })
  })
})

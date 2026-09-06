import { apiError, apiJson } from './_lib/apiSecurity'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Minimal deployment probe. It intentionally exposes no provider/configuration state. */
export async function handleHealthRequest(req: Request): Promise<Response> {
  if (req.method !== 'GET') return apiError(405, 'METHOD_NOT_ALLOWED', { Allow: 'GET' })
  return apiJson(200, { status: 'ok' })
}

/** Vercel Node Functions entrypoint. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleHealthRequest(new Request(`https://local.invalid${req.url ?? '/api/health'}`, {
    method: req.method,
  }))
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

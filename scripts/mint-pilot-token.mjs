import { createHmac } from 'node:crypto'

const secret = process.env.PILOT_ACCESS_SIGNING_SECRET
if (!secret || secret.length < 32) {
  console.error('PILOT_ACCESS_SIGNING_SECRET must be at least 32 characters')
  process.exitCode = 1
} else {
  const subject = process.argv[2]
  const hours = Number(process.argv[3] ?? '24')
  const requestedScopes = (process.argv[4] ?? 'article:generate,gsc:read,serp:read').split(',')
  const allowedScopes = new Set(['article:generate', 'gsc:read', 'serp:read'])
  if (!subject || !/^[a-zA-Z0-9_-]{1,64}$/.test(subject)) {
    console.error('Usage: npm run pilot:token -- <pilot-id> [hours<=168] [comma-separated-scopes]')
    process.exitCode = 1
  } else if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
    console.error('Token lifetime must be between 0 and 168 hours')
    process.exitCode = 1
  } else if (requestedScopes.length === 0 || requestedScopes.some((scope) => !allowedScopes.has(scope))) {
    console.error('Invalid scope requested')
    process.exitCode = 1
  } else if (requestedScopes.includes('gsc:read') && !process.env.GSC_SITE_URL) {
    console.error('GSC_SITE_URL is required when minting a gsc:read token')
    process.exitCode = 1
  } else {
    const payload = {
      v: 1,
      sub: subject,
      exp: Math.floor(Date.now() / 1000) + Math.floor(hours * 3600),
      scopes: requestedScopes,
      ...(requestedScopes.includes('gsc:read') && process.env.GSC_SITE_URL
        ? { resource: process.env.GSC_SITE_URL }
        : {}),
    }
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = createHmac('sha256', secret).update(encoded).digest('base64url')
    process.stdout.write(`${encoded}.${signature}\n`)
  }
}

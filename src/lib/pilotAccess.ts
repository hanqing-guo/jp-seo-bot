const TOKEN_KEY = 'seo-pilot-access-token'

/** Access tokens are session-only and must be provisioned out-of-band to approved pilots. */
export function getPilotAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setPilotAccessToken(token: string | null): void {
  if (typeof sessionStorage === 'undefined') return
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function pilotAuthorizationHeaders(): Record<string, string> {
  const token = getPilotAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

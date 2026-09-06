# Pilot API security

All GSC, index-inspection, SERP-provider, and external article-generation APIs are private pilot features. They fail closed unless the server has a `PILOT_ACCESS_SIGNING_SECRET` of at least 32 characters. Set `APP_ALLOWED_ORIGIN` to the exact frontend origin (production defaults to `https://enkiseojp.com`). Never expose either secret through a `VITE_*` variable.

An operator can mint a scoped token locally without sending the signing secret to the browser:

```sh
PILOT_ACCESS_SIGNING_SECRET='server-secret-at-least-32-characters' \
GSC_SITE_URL='https://approved-customer.example/' \
  npm run pilot:token -- pilot-001 24 gsc:read,serp:read
```

The browser keeps an approved token only in `sessionStorage` via `setPilotAccessToken`; it is removed when the tab session ends. Visitors without a token do not call private APIs and remain in sample-data/template demo mode.

Tokens that include `gsc:read` are bound to the exact `GSC_SITE_URL` present when they are minted. The API rejects the token if the server's configured property does not match, preventing one pilot token from reading another pilot's globally configured property. For the manual pilot, keep GSC access operator-only and do not distribute these tokens to customers; a true multi-tenant service still requires per-tenant credential and property storage.

Current limits apply independently per token subject and source IP, per warm serverless instance:

- article generation: 4/hour
- GSC rank: 30/hour
- index inspection: 4/day
- paid SERP checks: 10/hour

These in-memory limits are a fail-safe, not durable billing quotas across all serverless instances. Before widening the pilot, add a durable shared rate-limit store and server-side user/session issuance. Tokens expire after at most 31 days; the included minting command limits normal issuance to 7 days.

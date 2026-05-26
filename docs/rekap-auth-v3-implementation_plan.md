# Rekap Viewer — Veryresto Auth Integration

## Background

Rekap Viewer is a **Node.js + Express backend** serving a **vanilla HTML/CSS/JS frontend** from `public/`. There is no React, no bundler, no framework on the frontend. The backend proxies Google Sheets data through a Tigris object storage cache and serves the static files directly via `express.static`.

The goal is to gate the app behind Veryresto community auth so that only approved residents can view the data.

---

## Approach: Option A — Backend-Only Auth

The Express server reads and validates the `veryresto-auth` cookie on every protected request. The vanilla JS frontend has **zero auth code** — it never knows auth exists. Unauthorized requests are handled entirely at the server layer.

This is the correct choice for a backend-rendered vanilla app: simple, robust, no CDN SDK, no client-side session state.

---

## Two Distinct Failure Modes

This is the most important design principle of the auth layer:

| Failure | Cause | HTTP (API) | Browser (page) | User message |
|---|---|---|---|---|
| **Authentication failure** | No cookie, unparseable cookie, expired/invalid JWT | `401 Unauthorized` | `302 → portal` | "Please sign in" |
| **Governance denial** | Valid session, but `approval_status ≠ 'approved'` | `403 Forbidden` | `auth-denied.html` | "Your account is pending review" or "Access denied" |

These must never be conflated:
- A **401/redirect** means: *"We don't know who you are."* The fix is to log in.
- A **403/denied page** means: *"We know exactly who you are — you're just not permitted."* Logging in again will not help.

Mixing them confuses users ("I'm already logged in, why does it keep sending me to the login page?") and obscures the actual problem from developers.

---

## How It Will Work

```
User visits rekap.veryresto.com
        │
        ▼
   ┌─────────────────────────────────────────────────────────┐
   │              STEP 1: AUTHENTICATION CHECK               │
   │  Parse veryresto-auth cookie → verify JWT via Supabase  │
   └─────────────────────────────────────────────────────────┘
        │
   ✗ No cookie / bad cookie / invalid JWT / expired token
        │
        └──► 302 redirect → community.veryresto.com/?redirect_to=<url>
             ("We don't know who you are — please sign in.")
        │
   ✓ Valid JWT → user identity confirmed
        │
        ▼
   ┌─────────────────────────────────────────────────────────┐
   │              STEP 2: GOVERNANCE CHECK                   │
   │     Query profiles.approval_status for user.id          │
   └─────────────────────────────────────────────────────────┘
        │
   ✗ status = 'pending' | 'rejected' | 'suspended'
        │
        └──► Serve auth-denied.html?reason=pending|rejected
             ("We know who you are — you're not approved yet.")
             Never redirects to portal. Logging in again won't help.
        │
   ✓ status = 'approved'
        │
        ▼
        ✅ Serve index.html / API data normally
```

### API Endpoint Responses

The `/api/rekap` endpoint follows the same semantics but returns JSON:

| Situation | HTTP Status | Body |
|---|---|---|
| No/invalid cookie or bad JWT | `401 Unauthorized` | `{ "error": "Authentication required" }` |
| Valid session, not approved | `403 Forbidden` | `{ "error": "Access denied", "reason": "pending" }` |
| Approved | `200 OK` | Cache data |

Clients can distinguish the two cases programmatically by status code, without parsing the body.

---

## Open Questions

> [!NOTE]
> **Local development**: On `localhost`, the `veryresto-auth` cookie from the portal (`community.localtest.me:5173`) will be accessible if the app is run at `rekap.localtest.me:3000`. The plan includes a `DEV_BYPASS` env var to skip auth entirely on `localhost` for solo development without the portal running.

---

## Proposed Changes

### Dependencies

#### [MODIFY] package.json
- Add `@supabase/supabase-js` for the server-side Supabase client.

---

### Backend Auth Layer

#### [NEW] src/auth.js
Pure utility functions. **No `req`, `res`, or Express imports.** Usable in any context (tests, scripts, future frameworks).

```js
// Supabase client (singleton)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Parse the veryresto-auth cookie value from a raw cookie header string.
// Returns { access_token, refresh_token } or null.
function extractSessionFromCookieHeader(cookieHeader) { ... }

// Verify a JWT with Supabase Auth. Returns the user object or null.
async function verifyJwt(accessToken) { ... }

// Query profiles.approval_status for a given user ID.
// Returns 'approved' | 'rejected' | 'suspended' | 'pending' | null.
async function fetchApprovalStatus(userId) { ... }

// Build the full portal redirect URL preserving the current request URL,
// INCLUDING query string (e.g. ?blok=A&search=123).
//
// Must be constructed as:
//   const currentUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
//                                                                 ^^^^^^^^^^^^^^
//   Use req.originalUrl — NOT req.path or req.url.
//   req.path strips the query string. req.originalUrl preserves it.
//   This ensures deep-linked filter/search state survives the auth redirect round-trip.
//
// Validates the constructed origin against an allowlist to prevent
// Host header injection attacks.
//
// ALLOWED_RETURN_ORIGINS = [
//   'http://rekap.localtest.me:3000',
//   'https://rekap.veryresto.com',
// ];
//
// If new URL(currentUrl).origin is not in the allowlist, returns null.
// The middleware must treat null as an auth failure (redirect to portal root, no redirect_to).
function buildPortalRedirectUrl(currentUrl) { ... }

module.exports = { extractSessionFromCookieHeader, verifyJwt, fetchApprovalStatus, buildPortalRedirectUrl };
```

> [!NOTE]
> The community platform (`community.veryresto.com`) already validates the **incoming** `redirect_to` on its side via `ALLOWED_ORIGINS` in `App.tsx`. This allowlist in `src/auth.js` is the **outgoing** validation — defence-in-depth against a forged `Host` header causing rekap-viewer to send users to an untrusted return URL.

#### [NEW] src/middleware/auth.js
Express-specific. Imports from `src/auth.js` and handles all `req`/`res` logic. Knows about HTTP, headers, cookies, and redirect conventions. Auth utilities do not.

```js
const { extractSessionFromCookieHeader, verifyJwt, fetchApprovalStatus, buildPortalRedirectUrl } = require('../auth');

/**
 * Step 1 — Authentication gate.
 * Reads and verifies the veryresto-auth cookie.
 * SUCCESS → attaches req.user, calls next().
 * FAILURE → 302 to portal (browser requests) or 401 JSON (API/XHR requests).
 */
async function requireAuth(req, res, next) { ... }

/**
 * Step 2 — Governance gate.
 * Requires req.user set by requireAuth.
 * SUCCESS → calls next().
 * FAILURE → auth-denied.html?reason= (browser) or 403 JSON (API/XHR requests).
 *           Sets Cache-Control: no-store so the denial page is never cached.
 */
async function requireApprovedResident(req, res, next) { ... }

module.exports = { requireAuth, requireApprovedResident };
```

How `server.js` imports them:

```js
const { requireAuth, requireApprovedResident } = require('./middleware/auth');

app.get('/',          requireAuth, requireApprovedResident, serveIndex);
app.get('/api/rekap', requireAuth, requireApprovedResident, apiHandler);
app.get('/auth-denied', serveDeniedPage);  // public
app.get('/health',    healthHandler);      // public
```

#### [MODIFY] src/server.js
- Import `requireAuth` and `requireApprovedResident` from `./middleware/auth`
- Convert `GET /` from `express.static` passthrough to an explicit guarded route
  - Set `Cache-Control: no-store` before sending `index.html` — prevents browsers from caching the authenticated view on shared/public computers
- Apply both middleware to `GET /api/rekap`
- Add `GET /auth-denied` as a public route serving `public/auth-denied.html`
  - Set `Cache-Control: no-store` — the denial page must not be cached; the user's status may change
- `express.static` remains for CSS, JS, and other assets (cacheable — no sensitive data)
- Leave `GET /health` public

```js
// Cache headers applied by the middleware and explicit routes:
// Protected HTML  → Cache-Control: no-store
// auth-denied     → Cache-Control: no-store
// Static assets   → (browser default / express.static defaults — fine)
// API JSON        → no caching needed; already not cached by default
```

#### [NEW] public/auth-denied.html
Served **only when the user is authenticated but not approved** — never for auth failures. Accepts a `?reason=` query param:

| `?reason=` | Heading | Body copy |
|---|---|---|
| `pending` | "Your account is under review" | "You've successfully signed in, but your resident account is awaiting admin approval. You'll be notified once access is granted." |
| `rejected` | "Access not granted" | "Your account registration was not approved. Please contact the community admin if you believe this is an error." |
| `suspended` | "Account suspended" | "Your account has been suspended. Please contact the community admin." |
| _(default)_ | "Access denied" | Generic fallback. |

The page must **not** offer a "Sign in" button (the user is already signed in). It should offer a "Back to Portal" link (`community.veryresto.com`) and possibly a "Sign out" link.

---

### Environment Variables

#### [MODIFY] .env (and document)
Add:
```env
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
PORTAL_URL="https://community.veryresto.com"
DEV_BYPASS_AUTH="false"   # set to "true" to skip auth on localhost
```

---

## Future Improvements

### In-Process JWT Verification Cache

> [!TIP]
> Not needed for v1, but worth implementing if request volume grows or Supabase Auth latency becomes noticeable.

Currently, every request to a protected route calls `supabase.auth.getUser(token)` — a live network round-trip to Supabase. For an app that auto-refreshes on a browser tab, this adds ~20–80ms per request and consumes Supabase Auth API quota unnecessarily.

**Design sketch** (to be implemented in `src/auth.js`):

```js
// Simple in-process LRU-style TTL cache keyed by access_token
const verificationCache = new Map();
const CACHE_TTL_MS = 45_000; // 45 seconds

async function verifySessionCached(accessToken) {
  const cached = verificationCache.get(accessToken);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result; // { user, approvalStatus }
  }

  // Cold path: real Supabase network call
  const result = await verifySessionAndApproval(accessToken);

  if (result) {
    verificationCache.set(accessToken, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  return result;
}
```

**Considerations for when this is implemented:**
- TTL should be **shorter than the JWT expiry** (~1 hour) — 30–60 seconds is safe.
- Cache is **in-process only** (no Redis needed at this scale). Lost on restart, which is fine.
- Cache must be **keyed by the full `access_token` string**, not by user ID, so a revoked token is never re-used after its TTL window.
- If approval status changes (e.g., account suspended), the change takes effect within one TTL window — acceptable for this use case.
- Periodically sweep expired entries to prevent unbounded memory growth (or use a small fixed-size Map with eviction).

---

## Verification Plan

### Automated Tests
None planned (consistent with existing project — no test suite).

### Manual Verification

1. **No cookie**: Visit `http://rekap.localtest.me:3000` without a session → confirm redirect to portal.
2. **With cookie**: Log in via portal → confirm redirect back → data loads.
3. **API guard**: `curl http://rekap.localtest.me:3000/api/rekap` (no cookie) → confirm `401`.
4. **Pending account**: Temporarily set a test user to `approval_status = 'pending'` → confirm denied page appears.
5. **DEV_BYPASS**: Set `DEV_BYPASS_AUTH=true` in `.env`, run on `localhost:3000` → confirm data loads without cookie.
6. **Portal allowlist**: Confirm `http://rekap.localtest.me:3000` and `https://rekap.veryresto.com` are in `community-platform/src/App.tsx` `ALLOWED_ORIGINS`.

---

## Files Summary

| File | Action | Description |
|---|---|---|
| `package.json` | MODIFY | Add `@supabase/supabase-js` |
| `src/auth.js` | NEW | Pure auth utility functions (no Express) |
| `src/middleware/auth.js` | NEW | Express middleware: `requireAuth`, `requireApprovedResident` |
| `src/server.js` | MODIFY | Apply middleware to routes; add `/auth-denied` route |
| `public/auth-denied.html` | NEW | Governance denial UI (authenticated but not approved) |
| `.env` | MODIFY | Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORTAL_URL`, `DEV_BYPASS_AUTH` |

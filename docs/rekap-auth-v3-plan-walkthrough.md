# Veryresto Auth Integration

The rekap-viewer application is now fully protected by the Veryresto Identity Protocol using the backend-only authentication approach. The integration distinguishes between authentication failures and governance denials, ensuring a correct user experience and secure API endpoints.

## Implementation Details

### Clean Architecture

We implemented a strict separation of concerns, dividing the auth layer into two distinct modules:

1. **`src/auth.js` (Pure Functions)**
   - Contains pure utility functions with zero knowledge of Express.
   - Handles Supabase JWT verification, checking `profiles.approval_status`, and extracting the session from a raw cookie string.
   - Responsible for validating the constructed origin against `ALLOWED_RETURN_ORIGINS` to prevent Host header injection attacks.

2. **`src/middleware/auth.js` (Express Logic)**
   - Houses the `requireAuth` and `requireApprovedResident` Express middleware functions.
   - Manages all `req` and `res` logic, including redirects, setting HTTP headers, and distinguishing between browser requests (HTML) and API requests (JSON).
   - Carefully utilizes `req.originalUrl` to guarantee that deep-linked search and filter parameters survive the authentication redirect round-trip.

### Two-Stage Middleware

Routes are now protected by composing the two middleware functions:

```js
app.get('/', requireAuth, requireApprovedResident, (req, res) => { ... });
app.get('/api/rekap', requireAuth, requireApprovedResident, async (req, res) => { ... });
```

This enforces the explicit two-failure-mode contract:
- **Authentication Failure**: Fails at `requireAuth` (401 or 302 redirect to portal).
- **Governance Denial**: Passes `requireAuth` but fails at `requireApprovedResident` (403 or redirect to `/auth-denied`).

### Cache Prevention

To prevent secure data from leaking on shared devices after sign-out, strict `Cache-Control: no-store` headers are set on:
- The `index.html` main view.
- The `auth-denied.html` view (since an account's approval status can change).

### Support for Local Development

The `.env` file now supports `DEV_BYPASS_AUTH=true`. Setting this bypasses the Supabase auth checks entirely, enabling standalone local development of the application without requiring a running instance of the community portal or a live internet connection.

## Ecosystem Configuration

The community platform (`community-platform/src/App.tsx`) has been updated. `http://rekap.localtest.me:3000` is now an allowed origin, permitting seamless local end-to-end testing between the portal and the rekap-viewer app.

## Verification

The system is fully ready for verification.

> [!NOTE]
> Since the backend server intercepts all requests, you can now run the `rekap-viewer` dev server on port 3000. Navigating to `http://rekap.localtest.me:3000` will properly bounce unauthenticated users to the portal for login.

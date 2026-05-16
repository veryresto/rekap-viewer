# Rekap Viewer — Clerk Authentication Integration Spec

## Objective

Integrate Clerk authentication into Rekap Viewer while preserving the existing lightweight Express + Vanilla JS architecture.

The goal is:

* protect `/api/rekap`
* require login before viewing payment data
* centralize authentication using Clerk
* use `clerk.veryresto.com` as Clerk Frontend API domain
* use `accounts.veryresto.com` as Clerk Account Portal (Hosted Pages)
* use `rekap-auth.veryresto.com` as the application domain
* keep frontend minimal
* prepare for future multi-app SSO

This phase does NOT include:

* approval workflow
* roles
* admin dashboard
* database persistence
* RBAC

---

# Existing Architecture

Current app:

* Express backend
* Vanilla JS frontend
* deployed on Fly.io
* frontend fetches `/api/rekap`

Important:

* backend already acts as API proxy
* Google API key must remain server-side
* existing frontend rendering logic should remain mostly unchanged

---

# Authentication Architecture

## Domains
### Production
* **Application**: `rekap-auth.veryresto.com`
* **Clerk Frontend API**: `clerk.veryresto.com`
* **Clerk Account Portal**: `accounts.veryresto.com` (Hosted Pages)

### Local Development
* **Application**: `localhost:3000`
* **Clerk Domain**: Default Clerk dev domain (e.g. `*.accounts.dev`)

---

# Clerk Configuration

## Create Clerk Application

Application name:

* `Kawan Identity`

Authentication methods:

* Google login
* Email OTP

Disable:

* username/password auth

---

# Clerk Custom Domain

Configure Clerk custom domain:

```txt
kawan.veryresto.com
```

Agent should:

* use Clerk CLI if possible
* document required DNS records if manual action required

---

# Environment Variables

Add support for:

```env
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SIGN_IN_URL=https://accounts.veryresto.com/sign-in
CLERK_SIGN_UP_URL=https://accounts.veryresto.com/sign-up
```

Ensure:

* compatible with Fly secrets
* no secrets exposed to frontend

---

# Dependencies

Install:

* `@clerk/express`

Do NOT add:

* Next.js
* React
* Passport.js
* custom JWT libraries

---

# Backend Changes

## Express Middleware

Add Clerk middleware globally.

Protect:

* `/api/rekap`

Add Lightweight Check:

* `/api/me`: Returns `{ authenticated: boolean, userId?: string, signInUrl: string, signOutUrl: string }`

Example behavior:

### Unauthenticated

Return:

```json
{
  "error": "Unauthorized"
}
```

HTTP status:

```txt
401
```

### Authenticated

Allow existing logic unchanged.

---

# Frontend Changes

## Existing Frontend Must Stay Mostly Intact

Do NOT rewrite frontend architecture.

Keep:

* vanilla JS
* existing rendering flow
* existing table rendering

---

# Unauthorized State

If frontend receives `401` from `/api/rekap`:

Display:

* login-required message
* login button

Example button action:

```txt
https://accounts.veryresto.com/sign-in?redirect_url=https://rekap-auth.veryresto.com
```

---

# Authenticated State

If authenticated:

* existing UI should behave normally
* no visible auth complexity required yet

---

# Logout

Add optional logout button.

Logout target (fallback if SDK not loaded):

```txt
https://accounts.veryresto.com/user
```

Logout implementation:

* Use `window.Clerk.signOut()` for silent logout if script is loaded.
* Fallback to `/user` profile page.

---

# Security Requirements

Must ensure:

* Google API key remains backend-only
* auth enforced server-side
* frontend cannot bypass auth
* no localStorage token handling
* no manual JWT parsing

Prefer:

* Clerk session cookies

---

# Fly.io Requirements

Document:

* required Fly secrets
* required app restart commands
* required DNS setup

Ensure:

* HTTPS enforced
* Clerk works behind Fly.io deployment

---

# Expected Deliverables

Agent should provide:

1. Updated backend middleware
2. Updated frontend unauthorized flow
3. Required environment variables
4. Fly.io deployment notes
5. Clerk configuration notes
6. DNS instructions for custom domain
7. Local development instructions

---

# Non Goals

Do NOT implement:

* approval workflow
* user database
* admin dashboard
* resident verification
* RBAC
* organizations
* multi-tenant architecture
* custom auth server
* self-hosted auth

These will be implemented later.

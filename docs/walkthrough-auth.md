# Walkthrough — Clerk Authentication Integration

This document outlines the journey of integrating Clerk authentication into Rekap Viewer, detailing the obstacles encountered, the final domain strategy, and key technical lessons.

## 🚀 Final Production Architecture

*   **Application Domain**: `rekap-auth.veryresto.com`
*   **Clerk Frontend API**: `clerk.veryresto.com` (Used for `clerk.js` and session management)
*   **Account Portal**: `accounts.veryresto.com` (Hosted sign-in/sign-up/profile pages)

---

## 🚧 Key Obstacles & Solutions

### 1. The Base64 Subdomain Trap
*   **Obstacle**: The Clerk Publishable Key contains a base64-encoded payload that includes the frontend API domain. Our initial logic used the raw base64 string as the subdomain, leading to broken `https://zxrlcm...clerk.accounts.dev` URLs.
*   **Solution**: Decoded the middle part of the publishable key using `atob` (frontend) and `Buffer` (backend) to extract the actual domain (`eternal-longhorn-48.clerk.accounts.dev`).

### 2. Sign-Out 404 (Hidden Path)
*   **Obstacle**: We assumed a standard `/sign-out` URL existed on the Account Portal. However, Clerk Hosted Pages do not provide a direct sign-out page; sign-out is intended to be handled via the SDK.
*   **Solution**: Implemented a hybrid approach. We dynamically load the `clerk.js` SDK after login to enable silent `Clerk.signOut()`. If the SDK isn't ready, we fallback to redirecting the user to their Profile page (`/user`), where a logout button is available.

### 3. CSS "Hidden" Override
*   **Obstacle**: The `auth-overlay` remained visible even after authentication. We discovered that the CSS rule `.auth-overlay { display: flex; }` was overriding the HTML `hidden` attribute.
*   **Solution**: Added a global CSS rule `[hidden] { display: none !important; }` to ensure the attribute is respected regardless of other display rules.

### 4. Cross-Domain Cookie Restrictions
*   **Obstacle**: Initially trying to use `rekap-auth.fly.dev` (app) with `accounts.veryresto.com` (auth).
*   **Lesson**: Mixing `fly.dev` and `veryresto.com` causes significant friction. Clerk restricts redirects to external domains for security, and cross-domain cookies can be blocked by browsers. 
*   **Resolution**: Moved the application to `rekap-auth.veryresto.com`. Keeping both the app and auth on the same primary domain (`veryresto.com`) ensures seamless session sharing and simplifies redirect security.

---

## ⚙️ Missing Configurations (Lessons Learned)

### 1. Home URL
We initially missed setting the **Application Home URL** in the Clerk Dashboard. Without this, Clerk didn't know where to send users after a successful sign-in, often defaulting to a generic dashboard or the primary domain.
*   **Fix**: Set `home_url` via Clerk CLI API PATCH.

### 2. Allowed Redirect URLs
By default, Clerk only allows redirects to your Home URL. Any other URLs (including temporary test deployments) must be explicitly whitelisted.
*   **Fix**: Added `https://rekap-auth.veryresto.com` to the **Redirect URLs** list using the Clerk CLI.

---

## 🛠️ Essential CLI Reference

Useful commands discovered during this implementation:

```bash
# Pull production keys
clerk env pull --instance prod --file /tmp/prod.env

# Update Application Home URL
clerk api /instance -X PATCH --instance prod -d '{"home_url": "https://rekap-auth.veryresto.com"}'

# Add a trusted redirect URL
clerk api /redirect_urls -X POST --instance prod -d '{"url": "https://rekap-auth.veryresto.com"}'
```

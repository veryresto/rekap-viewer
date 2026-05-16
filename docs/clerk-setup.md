# Clerk Setup Guide

This document outlines the required configuration in the Clerk Dashboard for Rekap Viewer.

## 1. Authentication Methods

Go to **User & Authentication > Emails, Phones, Usernames**:

- **Email Address**:
  - Required for sign-up: Yes
  - Use for sign-in: Yes
  - Authentication strategies: **Email verification code**
- **Username**: Disabled
- **Phone Number**: Disabled
- **Password**: Disabled

Go to **User & Authentication > Social Connections**:

- Enable **Google**.
- Configure Google Client ID and Secret if using your own credentials, or use Clerk's shared credentials for development.

## 2. Custom Domain

Go to **Paths & Domains > Custom Domains**:

- Add `kawan.veryresto.com`.
- Add the following DNS records to your domain provider (e.g., Cloudflare, Route53):

| Type | Name | Content |
| :--- | :--- | :--- |
| CNAME | kawan | `clerk.kawan.veryresto.com` (Example, check dashboard for exact value) |

## 3. Environment Variables

### Local Development (`.env.local`)
Use the default Clerk development domain. These keys are already pulled via `clerk env pull`.

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# DO NOT set CLERK_SIGN_IN_URL here for local dev if you want to use the default domain
```

### Production (Fly.io Secrets)
Use the custom domain.

```env
CLERK_PUBLISHABLE_KEY=pk_test_... (or prod key)
CLERK_SECRET_KEY=sk_test_... (or prod key)
CLERK_SIGN_IN_URL=https://kawan.veryresto.com/sign-in
CLERK_SIGN_UP_URL=https://kawan.veryresto.com/sign-up
```

For Fly.io:
```bash
fly secrets set CLERK_PUBLISHABLE_KEY=... CLERK_SECRET_KEY=... CLERK_SIGN_IN_URL=... CLERK_SIGN_UP_URL=...
```

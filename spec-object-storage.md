# Rekap Viewer Phase 1 — Cached Backend Architecture

## Goal

Improve application responsiveness and reduce dependency on Google Sheets API by introducing a cached JSON layer using object storage.

The frontend API contract should remain unchanged.

Current flow:

Browser -> Fly backend -> Google Sheets API

Target flow:

Browser -> Fly backend -> Cached JSON (object storage)

Google Sheets API should only be accessed periodically for refresh purposes.

---

## Current State

Current implementation already:
- runs on Fly.io Machines
- uses Node.js + Express
- proxies Google Sheets API through backend
- protects GOOGLE_API_KEY and SHEET_ID using Fly secrets
- serves frontend from same codebase
- exposes GET /api/rekap

Frontend functionality already works and should remain unchanged.

Do not redesign frontend architecture.

---

## Requirements

### Storage Layer

Use Fly.io Tigris object storage as cache storage.

Store a single JSON file containing processed sheet data.

Suggested object name:

rekap-cache.json

---

## Cache Refresh Strategy

Backend should refresh Google Sheets data periodically every 5 minutes.

Refresh flow:

1. Fetch latest Google Sheets data
2. Apply existing backend filtering/privacy logic
3. Upload processed JSON to Tigris
4. Log refresh success/failure

Do not fetch Google Sheets API on every user request anymore.

---

## Request Flow

GET /api/rekap should:

1. Read cached JSON from Tigris
2. Return JSON response to frontend
3. Never directly call Google Sheets API during request lifecycle

This keeps user requests fast and predictable.

---

## Startup Behavior

On server startup:

- attempt initial cache refresh if cache does not exist
- log startup status clearly
- app should continue running even if refresh fails

---

## Logging

Add lightweight operational logging.

Log:
- cache refresh start
- cache refresh success
- refresh duration
- Tigris upload success/failure
- cache read failures
- request duration for /api/rekap
- current Fly region

Example useful metadata:
- process.env.FLY_REGION
- cache age
- refresh timestamp

Do not add excessive noisy logs.

---

## API Response Headers

Add lightweight debugging headers:

X-Fly-Region
X-Cache-Updated-At

Optional:
X-Cache-Age

These are useful for future multi-region experiments.

---

## Fly.io Requirements

Continue using Fly Machines.

Single region only for now:
- sin

Do not introduce multi-region deployment yet.

---

## Secrets / Environment Variables

Existing:
- GOOGLE_API_KEY
- SHEET_ID

New:
- Tigris credentials/config if needed

Use Fly secrets or environment variables only.

Do not hardcode credentials.

---

## Error Handling

If cache exists:
- serve stale cache even if refresh fails

If cache does not exist:
- return proper error response

Frontend should continue showing existing error UI.

---

## Constraints

- Keep frontend behavior unchanged
- Keep existing /api/rekap contract
- Keep single deployable app
- Avoid unnecessary abstractions
- Avoid introducing databases
- Avoid background worker services
- Avoid React/Vite/etc

Keep implementation operationally simple.

---

## Verification Checklist

Verify:
- browser no longer waits for Google Sheets API
- /api/rekap response becomes noticeably faster
- logs show periodic refresh activity
- cache survives multiple requests
- stale cache works when Google API temporarily fails
- Fly deployment still works correctly

---

## Future Preparation (Do Not Implement Yet)

Phase 2 will later introduce:
- multi-region Fly deployment
- regional latency comparison
- curl-based benchmarking from different geographic regions

Current implementation should make that future experiment easier.
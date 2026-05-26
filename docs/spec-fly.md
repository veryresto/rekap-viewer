# Rekap Viewer Backend Refactor (Fly.io Practice Project)

## Goal

Refactor the current Rekap Viewer project so the frontend no longer calls Google Sheets API directly from browser JavaScript.

Instead:

Browser -> Backend API -> Google Sheets API

The project should remain a single codebase and deploy as one Fly.io app.

The purpose is:
- improve security (API key not exposed)
- practice Fly.io operational concepts
- keep architecture simple

---

## Current State

Current project is a static single-file frontend app:
- index.html contains HTML, CSS, and JS
- frontend currently fetches Google Sheets API directly
- config.js exposes SHEET_ID and API_KEY in browser

Existing frontend functionality should remain unchanged:
- filtering
- sticky columns
- search
- summaries
- responsive behavior

Do not redesign the UI.

---

## Requirements

### Backend

Use Node.js + Express.

Create backend endpoint:

GET /api/rekap

Backend responsibilities:
- read GOOGLE_API_KEY from environment variable
- read SHEET_ID from environment variable
- fetch data from Google Sheets API
- return JSON response to frontend
- log useful errors to console

Do not expose Google API key to frontend.

---

### Frontend

Frontend should fetch from:

/api/rekap

instead of directly calling Google Sheets API.

Keep rendering logic mostly unchanged.

---

## Suggested Project Structure

public/
  index.html
  app.js
  styles.css

server.js
package.json
fly.toml

Splitting JS/CSS from index.html is allowed and preferred.

---

## Fly.io Requirements

App should deploy on Fly.io Machines.

Environment variables should be provided via Fly secrets:
- GOOGLE_API_KEY
- SHEET_ID

Use PORT environment variable correctly.

Expose HTTP service properly.

---

## Logging

Add lightweight logging:
- backend startup
- incoming API requests
- Google Sheets fetch failures

No excessive logging.

---

## Error Handling

Frontend should show existing error UI if backend fails.

Backend should return proper HTTP status codes.

---

## Important Constraints

- Keep frontend behavior intact
- Do not introduce React/Vite/Next.js/etc
- Keep implementation simple
- Avoid unnecessary abstractions
- Single deployable app only
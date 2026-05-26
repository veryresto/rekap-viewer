# 📋 Rekap Viewer — Codebase Summary
filename: rekap-codebase-summary.md

A secure, high-performance web application for visualizing IPL (Iuran Pemeliharaan Lingkungan) payment data. It features a Node.js backend that proxies Google Sheets data while protecting sensitive user information.

## 🏗️ Technology Stack

- **Backend**: Node.js with **Express**.
- **Frontend**: Vanilla JavaScript (ES6+), Vanilla CSS, and Semantic HTML5.
- **Data Source**: Google Sheets API v4 (proxied via backend).
- **Deployment**: **Fly.io** (Dockerized).
- **Typography**: Google Fonts (Inter).

## 🚀 Key Features

- **Privacy-First Data**: The backend automatically strips the 'Nama' column from the Google Sheets data before it reaches the client, ensuring resident names are not exposed in the browser.
- **Backend API Proxy**: Centralizes Google Sheets API requests, hiding the `GOOGLE_API_KEY` and `SHEET_ID` from the frontend.
- **Sticky UI Layout**: 
  - Sticky table headers (top-frozen).
  - Sticky identity columns (Blok, Nomor) and Year Summary columns (frozen on horizontal scroll).
- **Mobile-First UX**:
  - **Auto-Collapse**: Automatically collapses specific columns on screens narrower than 640px to maximize data visibility.
  - **Collapsible Filter Bar**: Block filter chips are hidden behind a toggle button on mobile to save vertical space.
- **Advanced Filtering**:
  - **Live Search**: Debounced text search for 'Nomor'.
  - **Blok Chips**: Multi-select filter chips for specific resident blocks.
- **Visual Analytics**:
  - **Year Summary Columns**: Sticky columns ('24, '25, '26) showing `paid_months/12` with color-coded status.
  - **Full-Year Highlighting**: Rows with 12/12 months paid are highlighted with distinct green shades (odd/even year parity).
  - **Custom Markers**: Automatically converts `√` in the sheet to `✓` for better readability.

## 📂 Project Structure

- **Backend**:
  - [server.js](server.js): Express server handling the API proxy, data filtering (privacy), and static file serving.
  - [Dockerfile](Dockerfile) / [fly.toml](fly.toml): Configuration for containerized deployment on Fly.io.
  - [package.json](package.json): Node.js dependencies and start scripts.
- **Frontend (`/public`)**:
  - [index.html](public/index.html): Semantic HTML structure.
  - [app.js](public/app.js): Core application logic (rendering, filtering, sticky calculations, and fetching from `/api/rekap`).
  - [styles.css](public/styles.css): Modern CSS with variables and responsive design.
- **Documentation**:
  - [rekap-codebase-summary.md](rekap-codebase-summary.md): This architectural overview.
  - [spec-fly.md](spec-fly.md): Detailed specification for the backend and Fly.io deployment.
  - [README.md](README.md): Setup guides and deployment instructions.

## ⚙️ Deployment & Security

- **Hosting**: Deployed on **Fly.io** using a Docker container.
- **Security**: 
  - Sensitive credentials (`GOOGLE_API_KEY`, `SHEET_ID`) are stored as **Fly Secrets** or environment variables.
  - Frontend has zero access to the Google API key.
  - Response timeout (8s) and basic logging implemented for reliability.
- **Performance**: Efficient data mapping and minimal DOM updates ensure smooth performance for large datasets.

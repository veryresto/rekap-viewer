# 📋 Rekap Viewer — Codebase Summary
filename: rekap-codebase-summary.md

A high-performance, mobile-friendly web application for visualizing IPL (Iuran Pemeliharaan Lingkungan) payment data directly from Google Sheets.

## 🏗️ Technology Stack

- **Frontend**: Pure HTML5, Vanilla JavaScript (ES6+), and Vanilla CSS.
- **Data Source**: Google Sheets API v4.
- **Build Tools**: None (Static implementation).
- **Typography**: Google Fonts (Inter).

## 🚀 Key Features

- **Live Data Sync**: Fetches real-time data from a public Google Sheet using a secure API Key and Spreadsheet ID.
- **Sticky UI Layout**: 
  - Sticky table headers (top-frozen).
  - Sticky identity columns (Blok, Nama, Nomor) and Year Summary columns (frozen on horizontal scroll).
- **Mobile-First UX**:
  - **Collapsible Identity Columns**: A toggle (◀/▶) allows users to hide 'Nama' and 'Blok' columns to maximize visible data space on small screens.
  - **Auto-Collapse**: Automatically collapses identity columns on screens narrower than 640px.
  - **Collapsible Filter Bar**: On mobile, block filter chips are hidden behind a toggle button to save vertical space.
- **Advanced Filtering**:
  - **Live Search**: Debounced text search for 'Nama' or 'Nomor'.
  - **Blok Chips**: Filter data by specific resident blocks.
- **Visual Analytics**:
  - **Year Summary Columns**: Computed sticky columns ('24, '25, '26) showing `paid_months/12` with color-coded status.
  - **Full-Year Highlighting**: Rows with 12/12 months paid are highlighted with distinct green shades (odd/even year parity).
  - **Custom Markers**: Automatically converts `√` in the sheet to `✓` for better readability.

## 📂 Project Structure

- [index.html](index.html): The core application file. Contains all UI structure, styling, and business logic (rendering, filtering, sticky column calculations).
- [config.js](config.js) / [config.js.example](config.js.example): Configuration for Google Sheets API credentials. `config.js` is git-ignored for security.
- [spec.md](spec.md): Detailed technical specification, covering data normalization, rendering logic, and UX requirements.
- [README.md](README.md): High-level project documentation, setup guides, and deployment instructions.

## ⚙️ Deployment & Security

- **Hosting**: Optimized for static hosting platforms like **Netlify**.
- **Security**: API keys and Sheet IDs are injected as environment variables during build time or loaded from a local `config.js`.
- **Performance**: Zero dependencies and minimal DOM manipulations (using `DocumentFragment`) ensure smooth performance even with 1,000+ rows.

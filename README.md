# 📋 Rekap IPL Viewer

A secure, high-performance web application to visualize IPL (Iuran Pemeliharaan Lingkungan) payment data. Now features a Node.js backend proxy that protects resident privacy by stripping sensitive information before it reaches the browser.

## ✨ Features

- **Privacy-First**: Resident names ('Nama' column) are automatically stripped on the server side to ensure privacy.
- **Secure Proxy**: Uses a Node.js/Express backend to fetch Google Sheets data, keeping your API keys and Spreadsheet IDs hidden from the public.
- **Sticky UI Layout**: 
  - Sticky table headers (top-frozen).
  - Sticky identity columns (Blok, Nomor) and Year Summary columns (frozen on horizontal scroll).
- **Mobile Optimized**: Auto-collapses columns on small screens and features a collapsible filter bar.
- **Visual Analytics**: Instant calculation of yearly payment status (e.g., "12/12") with color-coded highlighting.

---

## 🛠️ Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/rekap-viewer.git
   cd rekap-viewer
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   - Create a `.env` file in the root directory:
     ```env
     GOOGLE_API_KEY=your_google_api_key
     SHEET_ID=your_spreadsheet_id
     PORT=3000
     ```

4. **Run Locally**:
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deployment (Fly.io)

This project is optimized for deployment on **Fly.io** using Docker.

### 1. Launch App
```bash
fly launch
```

### 2. Set Secrets
Ensure your sensitive credentials are set as Fly secrets:
```bash
fly secrets set GOOGLE_API_KEY=AIza... SHEET_ID=1xWE...
```

### 3. Deploy
```bash
fly deploy
```

---

## 📊 Google Sheets Requirements

The application expects a specific sheet structure, though it filters data for privacy:

1. **Permissions**: The sheet must be shared as **"Anyone with the link → Viewer"**.
2. **Sheet Tab Name**: The default tab name should be `Import` (configurable via `RANGE` env var).
3. **Structure (Original Sheet)**: 
   - **Column A**: RT (Ignored by app)
   - **Column B**: Blok (Sticky)
   - **Column C**: Nama (**STRICTLY STRIPPED** by server for privacy)
   - **Column D**: Nomor (Sticky)
   - **Subsequent columns**: Monthly payment data (e.g., Jan-24, Feb-24...)

## 📄 License
MIT

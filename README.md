# 📋 Rekap IPL Viewer

> [!IMPORTANT]
> This branch (`main`) contains the legacy **Static Frontend** version. 
> For the latest version featuring a **Secure Node.js Backend** and **Tigris Object Storage Caching**, please switch to the [**fly-object-storage**](https://github.com/veryresto/rekap-viewer/tree/fly-object-storage) branch.
> 
> [**View Architecture Evolution & Live Demo**](https://github.com/veryresto/rekap-viewer/tree/fly-object-storage#%EF%B8%8F-architecture-evolution)

---

A premium, mobile-friendly web application to visualize IPL (Iuran Pemeliharaan Lingkungan) payment data directly from Google Sheets. Built with pure HTML/CSS/JS for maximum performance and zero dependencies.

![UI Preview](mobile-sample.jpeg)

## ✨ Features

- **Live Sync**: Automatically fetches data from your Google Sheet using the Sheets API v4.
- **Sticky Layout**: Header and key identification columns (Blok, Nama, Nomor) stay frozen for easy tracking.
- **Collapsible Nama**: Toggle the 'Nama' and 'Blok' columns to maximize visible data on smaller screens.
- **Mobile Optimized**: Auto-collapses on small screens and supports smooth horizontal scrolling.
- **Premium Aesthetics**: Modern typography, a deep blue professional palette, and subtle micro-animations.

---

## 🛠️ Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/rekap-viewer.git
   cd rekap-viewer
   ```

2. **Configure your environment**:
   - Copy the example config file:
     ```bash
     cp config.js.example config.js
     ```
   - Open `config.js` and enter your **Sheet ID** and **Google Cloud API Key**.
   - *Note: `config.js` is ignored by Git to keep your keys secure.*

3. **Run Locally**:
   Simply open `index.html` in any modern web browser.

---

## 🚀 Deployment (Netlify)

This project is designed to be deployed to **Netlify** with zero build tools while maintaining security.

### 1. Set Environment Variables
In your Netlify Dashboard, go to **Site settings** > **Build & deploy** > **Environment variables** and add:
- `SHEET_ID`: Your Google Spreadsheet ID.
- `API_KEY`: Your Google Cloud API Key.
- `RANGE`: The range to fetch (e.g., `Import!A1:ZZ550`).

### 2. Configure Build Command
Set the **Build Command** to the following one-liner. This dynamically generates your configuration file during deployment:

```bash
echo "window.APP_CONFIG = { SHEET_ID: '$SHEET_ID', API_KEY: '$API_KEY', RANGE: '$RANGE' };" > config.js
```

### 3. Set Publish Directory
Set the **Publish directory** to: `.` (or leave it blank).

---

## 📊 Google Sheets Requirements

1. **Permissions**: The sheet must be shared as **"Anyone with the link → Viewer"**.
2. **Structure**: 
   - Column A: RT (Ignored by the viewer)
   - Column B: Blok (Sticky)
   - Column C: Nama (Sticky/Collapsible)
   - Column D: Nomor (Sticky)
   - Subsequent columns: Monthly payment data

## 📄 License
MIT

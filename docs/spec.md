# Rekap Viewer — Implementation Spec

## 1. Objective

Build a **read-only web page** that displays Google Sheets IPL data with:

- **Sticky header**: Top row remains visible during vertical scrolling.
- **Sticky columns**: Blok, Nama, Nomor, and Year Summary columns remain visible during horizontal scrolling.
- **Collapsible identity columns**: A ◀/▶ toggle hides Nama and Blok to maximize screen space on mobile.
- **Year summary columns**: Computed `'24`, `'25`, `'26` columns (right after Nomor) show paid/12 count per year with color coding.
- **Full-year payment highlighting**: Rows where all 12 months of a year are paid get a colored block — dark green for odd years, light green for even years.
- **Live search**: Filter rows instantly by Nama or Nomor (case-insensitive, debounced).
- **Block filter**: Chip-based filter to show only specific Blok groups.
- **Collapsible mobile filter bar**: On mobile, the Blok chips are hidden behind a toggle button; the search field always remains visible.
- **Scrollable interaction**: Smooth horizontal and vertical scrolling.
- **Mobile-friendly**: Optimized layout for small screens (≤ 600px).
- **Auto-sync**: Live data fetching from Google Sheets without manual exports.

---

## 2. Data Source

### 2.1 API
Use **Google Sheets API v4**.

**Endpoint:**
```http
https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&key={API_KEY}
```

### 2.2 Requirements
- **Sheet Permissions:** Must be shared as "Anyone with the link → Viewer".
- **Authentication:** API key must be created and restricted in the Google Cloud Console.

---

## 3. Configuration

Secrets are loaded from `config.js` (git-ignored), which sets `window.APP_CONFIG`.

```javascript
// config.js (git-ignored)
window.APP_CONFIG = {
  SHEET_ID: "YOUR_SHEET_ID_HERE",
  API_KEY:  "YOUR_API_KEY_HERE",
  RANGE:    "Import!A1:ZZ550"
};
```

The in-page `CONFIG` object reads from this:

```javascript
const CONFIG = {
  SHEET_ID:       window.APP_CONFIG?.SHEET_ID,
  API_KEY:        window.APP_CONFIG?.API_KEY,
  RANGE:          window.APP_CONFIG?.RANGE || "Import!A1:ZZ550",
  STICKY_COLUMNS: [1, 2, 3]  // data-col indices for Blok, Nama, Nomor
};
```

A `config.js.example` file (committed) shows the shape without real credentials.

---

## 4. Tech Stack

- **HTML5**: Semantic structure.
- **Vanilla JavaScript**: Pure logic, no external frameworks or dependencies.
- **Vanilla CSS**: Modern CSS for layout and sticky positioning.
- **Google Fonts**: Inter (400, 500, 600, 700).
- **Build Tools**: None required (Static implementation).

---

## 5. Data Fetching

```javascript
async function loadData() {
  if (!CONFIG.SHEET_ID || !CONFIG.API_KEY) {
    showError("Konfigurasi Belum Lengkap.");
    return;
  }
  showLoading();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(CONFIG.RANGE)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&key=${CONFIG.API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json())?.error?.message || "HTTP " + res.status);
    const data = await res.json();
    hideLoading();
    if (!data.values?.length) { showError("Data tidak tersedia."); return; }
    render(data.values);
  } catch (err) {
    hideLoading();
    showError("Gagal memuat data: " + err.message);
  }
}
```

---

## 6. Data Structure

### 6.1 Response Format
```json
{
  "range": "...",
  "majorDimension": "ROWS",
  "values": [
    ["RT", "Blok", "Nama", "Nomor", "Jan-24", "Feb-24", "..."],
    ["001", "D", "SARI...", "D4", "15/1/2024", "√", ""]
  ]
}
```

### 6.2 Column Index Map

| Index | Name   | Sticky | Notes                          |
|-------|--------|--------|--------------------------------|
| 0     | RT     | —      | Skipped entirely in rendering  |
| 1     | Blok   | Yes    | Hidden when filter = Semua or collapsed |
| 2     | Nama   | Yes    | Hidden when panel collapsed    |
| 3     | Nomor  | Yes    | Always visible                 |
| s24   | '24    | Yes    | Computed summary column        |
| s25   | '25    | Yes    | Computed summary column        |
| s26   | '26    | Yes    | Computed summary column        |
| 4+    | Months | No     | Payment month columns          |

### 6.3 Implementation Notes
- **Column 0 (RT)**: Skipped entirely — not rendered in the table.
- All values are returned as **strings**.
- Empty cells may be **missing** from the array or returned as an **empty string**.
- Month headers follow the pattern `MMM-YY` (e.g. `Jan-24`, `Dec-25`).

---

## 7. Data Normalization

Ensure all rows have equal length based on the header count:

```javascript
const normalizedRow = [...row];
while (normalizedRow.length < headers.length) {
  normalizedRow.push("");
}
```

---

## 8. Year Group Detection

Before rendering, scan headers to build a map of column indices grouped by year.
Used by both the full-year highlighter and the summary columns.

```javascript
const yearGroups = {}; // e.g. { "24": [4,5,...,15], "25": [16,...,27] }
headers.forEach((text, i) => {
  if (i <= 3) return; // skip identity cols
  const match = text.match(/[- /](\d{2,4})$/);
  if (match) {
    const year = match[1];
    const yearKey = year.length === 4 ? year.slice(-2) : year;
    if (!yearGroups[yearKey]) yearGroups[yearKey] = [];
    yearGroups[yearKey].push(i);
  }
});
```

---

## 9. UI Structure

```html
<header class="app-header">
  <h1>📋 Rekap IPL</h1>
  <span id="row-count" class="badge">X warga</span>
</header>

<main class="main">
  <!-- Loading / Error -->
  <div id="status" aria-live="polite"></div>

  <!-- Filter Bar (revealed after data loads) -->
  <div class="filter-bar" id="filter-bar">
    <!-- Top row: always visible -->
    <div class="filter-main-row">
      <div class="search-wrap">
        <input id="search-input" type="search" placeholder="Cari nama atau nomor…" />
        <button id="search-clear" hidden>✕</button>
      </div>
      <!-- Mobile only: toggle chips visibility -->
      <button id="filter-toggle-btn" class="filter-toggle-btn">
        Unit Blok
        <span id="active-filter-count" class="filter-count-badge" hidden></span>
        <span class="toggle-arrow">▾</span>
      </button>
    </div>

    <!-- Collapsible on mobile -->
    <div id="filter-collapse-content" class="filter-content">
      <span class="filter-label">Filter Blok</span>
      <div class="chip-group" id="blok-chips"></div>
    </div>
  </div>

  <!-- Table -->
  <div class="table-container" id="table-container">
    <table id="rekap-table">
      <thead id="thead"></thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>
</main>
```

---

## 10. Rendering Logic

### 10.1 Render Header
1. Iterate `headers`, skip index 0 (RT). Create `<th data-col="{i}">`.
2. Add ◀/▶ toggle button inside the Nomor `<th>` (data-col=3).
3. **After** appending the row to `<thead>`, inject summary `<th>` elements for `'24`, `'25`, `'26` using `insertAdjacentElement("afterend")` on the Nomor `<th>` **in reverse order** so they appear left-to-right.

### 10.2 Render Rows
1. For each data row, create `<td data-col="{i}">` cells; skip index 0 (RT). Store refs in `cellsByCol`.
2. **Full-year highlighting**: After all cells are created, loop `yearGroups`. If a year has exactly 12 columns and all 12 are non-empty, add `status-full-odd` (odd year) or `status-full-even` (even year) to those 12 cells.
3. **Summary column cells**: Inject `<td data-col="s24/s25/s26">` cells after the Nomor `<td>` **in reverse order**. Each shows `paidCount/12` with color class.

```javascript
const SUMMARY_YEARS = [
  { key: "s24", label: "'24", yearKey: "24", full: 2024 },
  { key: "s25", label: "'25", yearKey: "25", full: 2025 },
  { key: "s26", label: "'26", yearKey: "26", full: 2026 },
];
```

---

## 11. Sticky & Collapsible Logic

### 11.1 Dynamic Offset Calculation (`applyStickyColumns`)
1. Clear all previous `.sticky-col` and `.sticky-last` classes and inline styles.
2. Filter `CONFIG.STICKY_COLUMNS` to only visible (not `.col-hidden`) columns.
3. Apply `position: sticky`, accumulating `left` offset left-to-right.
4. **Continue** the same `leftPx` accumulation for summary columns `["s24", "s25", "s26"]`.
5. The last pinned column (s26) gets `.sticky-last` which adds a right-edge drop shadow.

### 11.2 Column Collapse Feature (`collapsePanel` / `expandPanel`)
- **Toggle button**: ◀/▶ inside the Nomor header.
- **Effect**: Adds `col-hidden` (`display: none`) to all elements with `data-col="2"` (Nama) and conditionally `data-col="1"` (Blok) via `updateColumnVisibility()`.
- **Auto-collapse**: On screens narrower than 640px, `collapsePanel()` is called automatically after render.
- **Summary columns** use `data-col="s24/s25/s26"` — not targeted by collapse logic, so they **always remain visible**.

### 11.3 Column Visibility (`updateColumnVisibility`)
Called whenever `isCollapsed` or `blokShouldShow` changes:
- Blok (col 1): hidden when `isCollapsed` OR `blokShouldShow === false` (i.e. filter = Semua / single blok).
- Nama (col 2): hidden when `isCollapsed`.

---

## 12. Full-Year Payment Highlighting

Color-code entire 12-month blocks when a resident has paid the full year.

| Year Parity | CSS Class         | Color           |
|-------------|-------------------|-----------------|
| Odd (2025)  | `status-full-odd` | Dark green `#166534`, white text |
| Even (2024, 2026) | `status-full-even` | Light green `#86efac`, dark green text |

**Rule**: Applied only when `yearGroups[key].length === 12` AND all 12 cells are non-empty. Individual partial months are not colored.

Hover states: slightly darker shade of the same green on `tbody tr:hover`.

---

## 13. Year Summary Columns

Three **computed, sticky** columns injected right after Nomor: `'24`, `'25`, `'26`.

### Display Logic

| Paid Count | Class               | Display   |
|------------|---------------------|-----------|
| 12/12      | `status-full-odd` or `status-full-even` | `12/12` green |
| 1–11/12    | `sum-partial`       | `8/12` amber (`#fef9c3` bg, `#854d0e` text) |
| 0/12       | *(none)*            | `0/12` neutral |
| Year not in sheet | *(none)*     | `—` muted |

- Fixed denominator `/12` regardless of how many months currently have data.
- These columns are always visible (collapse toggle does not affect them).
- `SUMMARY_YEARS` is hardcoded to 2024–2026. To add future years, append to the array.

---

## 14. Live Search

A pill-shaped search input always visible at the top of the filter bar.

- **Searches**: Nama (data-col 2) and Nomor (data-col 3) cell text.
- **Case-insensitive**: Both sides `.toLowerCase()`.
- **Debounced**: 200ms delay after each keystroke.
- **Composed with Blok filter**: AND logic — a row is visible only if it matches both the active chip and the search term.
- **Clear button**: `✕` appears when field is non-empty; clicking clears and re-filters.
- **DOM-based**: Reads from existing `<td>` text content, so it works even when columns are visually collapsed.

```javascript
let searchTerm = ""; // global, lowercase+trimmed

// In applyFilter():
const matchesSearch = !searchTerm
  || namaText.includes(searchTerm)
  || nomorText.includes(searchTerm);
const show = matchesBlok && matchesSearch;
```

---

## 15. Block Filter (Chip Bar)

- **Semua** chip: default active state, shows all rows.
- **Blok chips**: auto-populated from unique values in data-col 1.
- Multi-select: multiple blok chips can be active simultaneously.
- Falling back to Semua when all blok chips are deselected.
- `blokShouldShow`: Blok column is only shown when more than one blok chip is active (and not collapsed).

---

## 16. Mobile Filter Bar

On screens ≤ 600px:
- The **search input** remains permanently visible in a top row.
- A **"Unit Blok ▾" button** toggles the chip area below.
- An **active filter count badge** on the button shows how many bloks are selected (e.g. `2`).
- The toggle arrow flips to ▴ when expanded.
- On desktop, the toggle button is `display: none` and all chips are always shown.

---

## 17. Data Rendering Rules

| Raw Value        | Display  |
|:-----------------|:---------|
| `"√"`            | ✓        |
| Date string      | As-is    |
| `""` or `null`   | Empty    |

---

## 18. Mobile Behavior

- **Scrolling**: Seamless horizontal and vertical via `-webkit-overflow-scrolling: touch`.
- **Auto-Collapse**: `collapsePanel()` called automatically on screens < 640px.
- **Filter Bar**: Blok chips hidden behind toggle; search always accessible.
- **Font size**: `clamp()` used throughout — minimum ~11px for data cells, ~10px for headers.

---

## 19. Error Handling

- Missing config (`SHEET_ID` / `API_KEY`): shows inline error before fetching.
- API error: surfaces `error.message` from the JSON response.
- Empty data: shows localized "Data tidak tersedia" message.
- All errors shown in `#status` element with ARIA `aria-live="polite"`.

---

## 20. Security

- **Credentials**: `config.js` is git-ignored. Only `config.js.example` is committed.
- **API Key**: Restrict by HTTP Referrer in Google Cloud Console.

---

## 21. Performance

- **Rows**: Scalable up to ~1,000 rows.
- **Columns**: Scalable up to ~100 columns.
- DOM writes batched via `DocumentFragment`.
- Sticky recalculation via `requestAnimationFrame`.

---

## 22. Acceptance Criteria

- [x] RT column is removed from the UI.
- [x] Header remains fixed at the top.
- [x] Blok, Nama, Nomor, and summary columns remain sticky on horizontal scroll.
- [x] Sticky offsets are recalculated after collapse/expand and column visibility changes.
- [x] `√` markers are rendered as `✓`.
- [x] Collapse toggle hides/shows Nama and Blok; summary columns always stay visible.
- [x] Auto-collapse on mobile screens (< 640px).
- [x] Search by Nama or Nomor with debounce and clear button.
- [x] Search AND blok chip filter compose correctly.
- [x] Full-year blocks (12/12) highlighted in dark green (odd year) or light green (even year).
- [x] Year summary columns `'24`, `'25`, `'26` show `paid/12` with amber (partial) and green (full) coloring.
- [x] Mobile filter bar collapses blok chips behind a toggle with active count badge.

---

## 23. Non-Goals

- Data editing or writing.
- Complex authentication (OAuth, user accounts).
- Dynamic column sorting.
- Server-side rendering or build pipeline.
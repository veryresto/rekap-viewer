# Rekap Viewer — Implementation Spec

## 1. Objective

Build a **read-only web page** that displays Google Sheets IPL data with:

- **Sticky header**: Top row remains visible during vertical scrolling.
- **Sticky columns**: Blok, Nama, and Nomor (or just Nomor when collapsed) remain visible during horizontal scrolling.
- **Collapsible Column**: Ability to hide the 'Nama' and 'Blok' columns to maximize visible data on small screens.
- **Scrollable interaction**: Smooth horizontal and vertical scrolling.
- **Mobile-friendly**: Optimized layout for small screens.
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

Define a `CONFIG` object at the top of the script for easy maintenance:

```javascript
const CONFIG = {
  SHEET_ID: "YOUR_SHEET_ID_HERE",
  SHEET_NAME: "Import",
  RANGE: "Import!A1:ZZ500",
  // Columns to keep sticky (Blok, Nama, Nomor)
  STICKY_COLUMNS: [1, 2, 3], 
  API_KEY: "YOUR_API_KEY_HERE"
};
```

---

## 4. Tech Stack

- **HTML5**: Semantic structure.
- **Vanilla JavaScript**: Pure logic, no external frameworks or dependencies.
- **Vanilla CSS**: Modern CSS for layout and sticky positioning.
- **Build Tools**: None required (Static implementation).

---

## 5. Data Fetching

### 5.1 Fetch Implementation
```javascript
const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(CONFIG.RANGE)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&key=${CONFIG.API_KEY}`;

const res = await fetch(url);
const data = await res.json();
```

---

## 6. Data Structure

The Google Sheets API returns a JSON object containing the cell values in a 2D array.

### 6.1 Response Format
```json
{
  "range": "...",
  "majorDimension": "ROWS",
  "values": [
    ["RT", "Blok", "Nama", "Nomor", "Jan-24", "Feb-24"],
    ["001", "D", "SARI...", "D4", "15/1/2024", "√"]
  ]
}
```

### 6.2 Implementation Notes
- **Column 0 (RT)**: Should be skipped or ignored in the final table rendering.
- All values are returned as **strings**.
- Empty cells may be **missing** from the array or returned as an **empty string**.

---

## 7. Data Normalization

Ensure all rows have equal length based on the header count:

```javascript
const headers = data.values[0];
const rows = data.values.slice(1);

const normalizedRows = rows.map(row => {
  const newRow = [...row];
  while (newRow.length < headers.length) {
    newRow.push("");
  }
  return newRow;
});
```

---

## 8. UI Structure

```html
<div class="table-container">
  <table id="rekap-table">
    <thead>
      <!-- Headers will be injected here -->
    </thead>
    <tbody>
      <!-- Data rows will be injected here -->
    </tbody>
  </table>
</div>
```

---

## 9. Rendering Logic

### 9.1 Render Header
Inject headers, skipping index 0 (RT). Add a toggle button inside the "Nomor" column header.

### 9.2 Render Rows
Inject data cells, skipping index 0 (RT).

---

## 10. Styling

- Use `position: sticky` for headers and frozen columns.
- Use `z-index` to ensure headers stay above body cells.
- Implementation should include a "collapsed" state for the sticky columns.

---

## 11. Sticky & Collapsible Logic

### 11.1 Dynamic Offset Calculation
Calculate the `left` position for each sticky column dynamically based on the width of visible preceding columns.

### 11.2 Collapse Feature
- **Toggle**: A ◀/▶ button located in the "Nomor" header.
- **Effect**: Hides 'Nama' and 'Blok' columns.
- **Purpose**: Maximizes screen real estate for month columns on mobile devices.

---

## 12. Data Rendering Rules

| Raw Value | Display |
| :--- | :--- |
| `"√"` | ✓ |
| Date string | Display as-is |
| `""` or `null` | Empty cell |

---

## 13. Mobile Behavior

- **Scrolling**: Seamless horizontal and vertical scrolling.
- **Auto-Collapse**: Automatically collapse Nama/Blok on screens narrower than `640px`.
- **Typography**: Minimum font size of `12px`.

---

## 14. Error Handling

Basic validation for API responses:
```javascript
if (!data.values || data.values.length === 0) {
  showError("Failed to load data or sheet is empty.");
}
```

---

## 15. Security

**API Key Protection:**
- Restrict the API key by **HTTP Referrer**.
- Use placeholders in public code.

---

## 16. Performance Constraints

- **Rows**: Scalable up to ~1,000 rows.
- **Columns**: Scalable up to ~100 columns.

---

## 18. Acceptance Criteria

- [ ] RT Column is successfully removed from the UI.
- [ ] Header remains fixed at the top.
- [ ] Blok, Nama, and Nomor remain sticky.
- [ ] Collapse toggle correctly hides/shows Nama and Blok.
- [ ] Sticky offsets are recalculated after collapse/expand.
- [ ] `√` markers are rendered as `✓`.

---

## 19. Non-Goals

- Data editing or writing.
- Complex authentication.

---

## 20. Optional Enhancements

- Client-side search and filtering.
- Dynamic sorting.
- Color highlighting for payment statuses.
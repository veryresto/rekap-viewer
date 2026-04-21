# Rekap Viewer — Implementation Spec

## 1. Objective

Build a **read-only web page** that displays Google Sheets IPL data with:

- Sticky header (top row always visible)
- Sticky first columns (RT, Blok, Nomor always visible)
- Horizontal + vertical scrolling
- Mobile-friendly layout
- Auto-sync from Google Sheets (no manual export)

---

## 2. Data Source

### 2.1 Endpoint

Use Google Visualization API:

```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet={SHEET_NAME}
```

### 2.2 Requirements

- Google Sheet must be **published to web**
- Sheet name must be URL-encoded

---

## 3. Configuration

Define a config object at the top of the script:

```javascript
const CONFIG = {
  SHEET_ID: "YOUR_SHEET_ID",
  SHEET_NAME: "Import",
  STICKY_COLUMNS: 4
};
```

---

## 4. Tech Stack

- HTML (static)
- Vanilla JavaScript (no framework)
- CSS

No build tools required.

---

## 5. Data Fetching

### 5.1 Fetch

```javascript
const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;

const res = await fetch(url);
const text = await res.text();
```

---

## 6. Data Parsing

Google Visualization API returns JSONP-style wrapped JSON, not plain JSON.

### 6.1 Parse Logic

```javascript
const json = JSON.parse(text.substring(47).slice(0, -2));
```

---

## 7. Data Structure

### 7.1 Columns

```javascript
json.table.cols
```

### 7.2 Rows

```javascript
json.table.rows
```

### 7.3 Cell Value

```javascript
cell?.v ?? ""
```

---

## 8. UI Structure

### 8.1 HTML

```html
<div class="table-container">
  <table>
    <thead></thead>
    <tbody></tbody>
  </table>
</div>
```

---

## 9. Rendering Logic

### 9.1 Render Header

```javascript
cols.forEach(col => {
  const th = document.createElement("th");
  th.innerText = col.label || "";
  theadRow.appendChild(th);
});
```

### 9.2 Render Rows

```javascript
rows.forEach(row => {
  const tr = document.createElement("tr");

  row.c.forEach(cell => {
    const td = document.createElement("td");
    td.innerText = cell?.v ?? "";
    tr.appendChild(td);
  });

  tbody.appendChild(tr);
});
```

---

## 10. Styling

### 10.1 Container Scroll

```css
.table-container {
  overflow: auto;
  max-height: 80vh;
  border: 1px solid #ddd;
}
```

### 10.2 Table Base

```css
table {
  border-collapse: collapse;
  width: max-content;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  white-space: nowrap;
  font-size: 14px;
  background: #fff;
}
```

### 10.3 Sticky Header

```css
thead th {
  position: sticky;
  top: 0;
  z-index: 3;
}
```

---

## 11. Sticky Columns

### 11.1 Requirement

The first `CONFIG.STICKY_COLUMNS` columns must remain visible during horizontal scroll.

### 11.2 Implementation Strategy

**Step 1 — After render, measure the width of each sticky column:**

```javascript
const firstRowCells = document.querySelectorAll("thead th");

let offsets = [];
let cumulative = 0;

for (let i = 0; i < CONFIG.STICKY_COLUMNS; i++) {
  offsets.push(cumulative);
  cumulative += firstRowCells[i].offsetWidth;
}
```

**Step 2 — Apply `position: sticky` with calculated `left` offset:**

```javascript
for (let i = 0; i < CONFIG.STICKY_COLUMNS; i++) {
  const left = offsets[i];

  document.querySelectorAll(`th:nth-child(${i + 1}), td:nth-child(${i + 1})`)
    .forEach(el => {
      el.style.position = "sticky";
      el.style.left = `${left}px`;
      el.style.zIndex = 2;
      el.style.background = "#fff";
    });
}
```

---

## 12. Data Rules

- Null → empty string
- Dates → display as-is
- Symbols (✓) → display as-is
- No transformation required

---

## 13. Mobile Behavior

- Horizontal scroll must work
- Sticky columns must remain functional
- Minimum font size: 12px

---

## 14. Error Handling

- If fetch fails → display message: `"Failed to load data"`
- If parsing fails → log error and show empty table

---

## 15. Performance Constraints

- Rows: up to ~500
- Columns: up to ~50
- No virtualization required

---

## 16. Deployment

**Option A (Recommended):** Static HTML file, deployed via:

- GitHub Pages
- Netlify

---

## 17. Acceptance Criteria

- [ ] Header stays visible on vertical scroll
- [ ] First 3 columns stay visible on horizontal scroll
- [ ] Data matches Google Sheets
- [ ] Works on mobile devices
- [ ] No Google Sheets UI is visible
- [ ] No formulas are exposed

---

## 18. Non-Goals

- Editing data
- Authentication
- Real-time updates (polling optional, not required)

---

## 19. Optional Enhancements (Not Required)

- Search / filter
- Sorting
- Color highlight for paid status
- Pagination
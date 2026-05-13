"use strict";

// ── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  STICKY_COLUMNS: [1, 2, 3]
};

// ── ELEMENT REFS ─────────────────────────────────────────────────────────
const statusEl = document.getElementById("status");
const filterBarEl = document.getElementById("filter-bar");
const chipGroupEl = document.getElementById("blok-chips");
const containerEl = document.getElementById("table-container");
const theadEl = document.getElementById("thead");
const tbodyEl = document.getElementById("tbody");
const rowCountEl = document.getElementById("row-count");

// ── PANEL COLLAPSE STATE ─────────────────────────────────────────────────
let isCollapsed = false;   // whether Nama/Blok are hidden by user toggle
let toggleBtn = null;    // the ◀/▶ button element
let blokShouldShow = false;   // whether filter state says Blok col should show
let searchTerm = "";     // current normalised search string (lowercase, trimmed)

// ── HELPERS ──────────────────────────────────────────────────────────────

/**
 * Returns the best displayable string for a GViz cell object.
 * Preference: cell.f (formatted) → cell.v → ""
 */
function cellDisplay(val) {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  // spec rules
  if (str === "√") return "✓";
  return str;
}

function showLoading() {
  statusEl.className = "loading";
  statusEl.innerHTML =
    '<div class="spinner" aria-hidden="true"></div>' +
    '<span>Mengambil data dari server…</span>';
  statusEl.style.display = "";
}

function hideLoading() { statusEl.style.display = "none"; }

function showError(msg) {
  statusEl.className = "error";
  statusEl.textContent = "⚠️ " + msg;
  statusEl.style.display = "block";
  rowCountEl.textContent = "Error";
}

// ── STICKY COLUMNS ───────────────────────────────────────────────────────
function applyStickyColumns() {
  // 1. Clear previous sticky state entirely
  document.querySelectorAll(".sticky-col").forEach(el => {
    el.classList.remove("sticky-col", "sticky-last");
    el.style.position = "";
    el.style.left = "";
    el.style.zIndex = "";
  });

  // 2. Determine which of the configured sticky columns are currently visible
  const visibleSticky = CONFIG.STICKY_COLUMNS.filter(colIdx => {
    const th = document.querySelector(`#thead [data-col="${colIdx}"]`);
    return th && !th.classList.contains("col-hidden");
  });

  // 3. Apply sticky left-to-right, accumulating offsets
  let leftPx = 0;
  visibleSticky.forEach((colIdx, i) => {
    const isLast = i === visibleSticky.length - 1;
    const th = document.querySelector(`#thead [data-col="${colIdx}"]`);
    if (!th) return;
    const width = th.getBoundingClientRect().width;

    document.querySelectorAll(`[data-col="${colIdx}"]`).forEach(el => {
      el.style.position = "sticky";
      el.style.left = leftPx + "px";
      el.classList.add("sticky-col");
      if (isLast) el.classList.add("sticky-last");
    });

    // Header corner cells need highest z-index to sit above body sticky cells
    document.querySelectorAll(`#thead [data-col="${colIdx}"]`)
      .forEach(el => { el.style.zIndex = isLast ? "6" : "5"; });
    document.querySelectorAll(`#tbody [data-col="${colIdx}"]`)
      .forEach(el => { el.style.zIndex = "2"; });

    leftPx += width;
  });

  // Pin summary columns (s24, s25, s26) continuing the same leftPx offset
  const SUMMARY_KEYS = ["s24", "s25", "s26"];
  SUMMARY_KEYS.forEach((key, i) => {
    const isLast = i === SUMMARY_KEYS.length - 1;
    const th = document.querySelector(`#thead [data-col="${key}"]`);
    if (!th) return;
    const width = th.getBoundingClientRect().width;

    document.querySelectorAll(`[data-col="${key}"]`).forEach(el => {
      el.style.position = "sticky";
      el.style.left = leftPx + "px";
      el.classList.add("sticky-col");
      if (isLast) el.classList.add("sticky-last");
    });

    document.querySelectorAll(`#thead [data-col="${key}"]`)
      .forEach(el => { el.style.zIndex = isLast ? "6" : "5"; });
    document.querySelectorAll(`#tbody [data-col="${key}"]`)
      .forEach(el => { el.style.zIndex = "2"; });

    leftPx += width;
  });
}

// ── COLUMN VISIBILITY ──────────────────────────────────────────────────────
function updateColumnVisibility() {
  // Nama (data-col 2): hidden when panel is collapsed
  document.querySelectorAll(`[data-col="2"]`)
    .forEach(el => el.classList.toggle("col-hidden", isCollapsed));
  // Blok (data-col 1): hidden when collapsed OR when filter doesn't need it
  const showBlok = blokShouldShow && !isCollapsed;
  document.querySelectorAll(`[data-col="1"]`)
    .forEach(el => el.classList.toggle("col-hidden", !showBlok));
}

// ── COLLAPSE / EXPAND ─────────────────────────────────────────────────────
function collapsePanel() {
  isCollapsed = true;
  updateColumnVisibility();
  requestAnimationFrame(() => applyStickyColumns());
  if (toggleBtn) {
    toggleBtn.textContent = "▶";
    toggleBtn.title = "Tampilkan Nama";
    toggleBtn.setAttribute("aria-label", "Tampilkan kolom Nama");
  }
}

function expandPanel() {
  isCollapsed = false;
  updateColumnVisibility();
  requestAnimationFrame(() => applyStickyColumns());
  if (toggleBtn) {
    toggleBtn.textContent = "◀";
    toggleBtn.title = "Sembunyikan Nama";
    toggleBtn.setAttribute("aria-label", "Sembunyikan kolom Nama");
  }
}

// ── FILTER ───────────────────────────────────────────────────────────────
function applyFilter() {
  const activeChips = [...chipGroupEl.querySelectorAll(".chip:not(.chip-all).active")];
  const isSemua = activeChips.length === 0;
  const selectedBloks = new Set(activeChips.map(c => c.dataset.blok));

  // Hide/show rows
  let visibleCount = 0;
  document.querySelectorAll("#tbody tr").forEach(tr => {
    const blokCell  = tr.querySelector(`[data-col="1"]`);
    const blokVal   = blokCell ? blokCell.textContent.trim() : "";
    const namaText  = tr.querySelector(`[data-col="2"]`)?.textContent.trim().toLowerCase() ?? "";
    const nomorText = tr.querySelector(`[data-col="3"]`)?.textContent.trim().toLowerCase() ?? "";
    const matchesBlok   = isSemua || selectedBloks.has(blokVal);
    const matchesSearch = !searchTerm
      || namaText.includes(searchTerm)
      || nomorText.includes(searchTerm);
    const show = matchesBlok && matchesSearch;
    tr.classList.toggle("row-hidden", !show);
    if (show) visibleCount++;
  });

  // Update Blok column visibility (respects both filter and collapse state)
  blokShouldShow = activeChips.length > 1;
  updateColumnVisibility();

  // Re-pin sticky columns (offsets may change with col visibility)
  requestAnimationFrame(() => applyStickyColumns());

  rowCountEl.textContent = visibleCount + " warga";

  // Update toggle button badge if on mobile
  const badge = document.getElementById("active-filter-count");
  if (badge) {
    if (activeChips.length > 0) {
      badge.textContent = activeChips.length;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }
}

// ── SEARCH ───────────────────────────────────────────────────────────────
function initSearch() {
  const input    = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");
  if (!input) return;

  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchTerm = input.value.trim().toLowerCase();
      clearBtn.hidden = !searchTerm;
      applyFilter();
    }, 200);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    searchTerm = "";
    clearBtn.hidden = true;
    input.focus();
    applyFilter();
  });
}

// ── MOBILE TOGGLE ────────────────────────────────────────────────────────
function initFilterToggle() {
  const btn = document.getElementById("filter-toggle-btn");
  const content = document.getElementById("filter-collapse-content");
  if (!btn || !content) return;

  btn.addEventListener("click", () => {
    const isExpanded = content.classList.toggle("expanded");
    btn.querySelector(".toggle-arrow").textContent = isExpanded ? "▴" : "▾";
    btn.setAttribute("aria-expanded", isExpanded);
  });
}

// ── FILTER CHIPS ─────────────────────────────────────────────────────────
function buildFilterChips(rows) {
  const blokSet = new Set();
  rows.slice(1).forEach(row => {
    const val = cellDisplay(row[1]);
    if (val) blokSet.add(val);
  });
  const bloks = [...blokSet].sort();

  const allChip = document.createElement("button");
  allChip.className = "chip chip-all active";
  allChip.textContent = "Semua";
  allChip.dataset.blok = "";
  allChip.setAttribute("aria-pressed", "true");
  chipGroupEl.appendChild(allChip);

  bloks.forEach(blok => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = blok;
    chip.dataset.blok = blok;
    chip.setAttribute("aria-pressed", "false");
    chipGroupEl.appendChild(chip);
  });

  filterBarEl.classList.add("visible");
  initSearch();
  initFilterToggle();

  chipGroupEl.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    if (chip.classList.contains("chip-all")) {
      chipGroupEl.querySelectorAll(".chip").forEach(c => {
        c.classList.remove("active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chipGroupEl.querySelector(".chip-all").classList.remove("active");
      chipGroupEl.querySelector(".chip-all").setAttribute("aria-pressed", "false");
      chip.classList.toggle("active");
      chip.setAttribute("aria-pressed", chip.classList.contains("active") ? "true" : "false");

      const anyActive = [...chipGroupEl.querySelectorAll(".chip:not(.chip-all)")]
        .some(c => c.classList.contains("active"));
      if (!anyActive) {
        const all = chipGroupEl.querySelector(".chip-all");
        all.classList.add("active");
        all.setAttribute("aria-pressed", "true");
      }
    }
    applyFilter();
  });
}

// ── RENDER ───────────────────────────────────────────────────────────────
function render(rows) {
  if (!rows || rows.length === 0) {
    showError("Data tidak tersedia.");
    return;
  }

  const headers = rows[0];
  const yearGroups = {}; 
  headers.forEach((text, i) => {
    if (i <= 3) return; 
    const match = text.match(/[- /](\d{2,4})$/);
    if (match) {
      const year = match[1];
      const yearKey = year.length === 4 ? year.slice(-2) : year; 
      if (!yearGroups[yearKey]) yearGroups[yearKey] = [];
      yearGroups[yearKey].push(i);
    }
  });

  const theadRow = document.createElement("tr");
  headers.forEach((text, i) => {
    if (i === 0) return; 
    const th = document.createElement("th");
    th.textContent = text;
    th.dataset.col = i;
    theadRow.appendChild(th);
  });

  const nomorTh = theadRow.querySelector(`[data-col="3"]`);
  if (nomorTh) {
    nomorTh.classList.add("has-toggle");
    toggleBtn = document.createElement("button");
    toggleBtn.className = "col-toggle-btn";
    toggleBtn.textContent = "◀";
    toggleBtn.title = "Sembunyikan Nama";
    toggleBtn.setAttribute("aria-label", "Sembunyikan kolom Nama");
    toggleBtn.addEventListener("click", () =>
      isCollapsed ? expandPanel() : collapsePanel()
    );
    nomorTh.appendChild(toggleBtn);
  }
  theadEl.appendChild(theadRow);

  const SUMMARY_YEARS = [
    { key: "s24", label: "'24", yearKey: "24", full: 2024 },
    { key: "s25", label: "'25", yearKey: "25", full: 2025 },
    { key: "s26", label: "'26", yearKey: "26", full: 2026 },
  ];

  const nomorThInDom = theadEl.querySelector(`[data-col="3"]`);
  if (nomorThInDom) {
    [...SUMMARY_YEARS].reverse().forEach(({ key, label }) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.dataset.col = key;
      th.classList.add("sum-th", "sum-col");
      nomorThInDom.insertAdjacentElement("afterend", th);
    });
  }

  const dataRows = rows.slice(1);
  const fragment = document.createDocumentFragment();

  dataRows.forEach(row => {
    const tr = document.createElement("tr");
    const normalizedRow = [...row];
    while (normalizedRow.length < headers.length) {
      normalizedRow.push("");
    }

    const cellsByCol = {}; 
    normalizedRow.forEach((val, i) => {
      if (i === 0) return; 
      const td = document.createElement("td");
      td.textContent = cellDisplay(val);
      td.dataset.col = i;
      tr.appendChild(td);
      cellsByCol[i] = td;
    });

    for (const [year, colIndices] of Object.entries(yearGroups)) {
      if (colIndices.length === 12) {
        const isComplete = colIndices.every(idx => {
          const val = row[idx];
          return val && val.trim() !== "";
        });

        if (isComplete) {
          const yearNum = parseInt(year);
          const isOdd = (yearNum % 2) !== 0;
          const className = isOdd ? "status-full-odd" : "status-full-even";

          colIndices.forEach(idx => {
            if (cellsByCol[idx]) cellsByCol[idx].classList.add(className);
          });
        }
      }
    }
    const nomorTd = cellsByCol[3];
    if (nomorTd) {
      [...SUMMARY_YEARS].reverse().forEach(({ key, yearKey, full }) => {
        const colIndices = yearGroups[yearKey] || [];
        const paidCount = colIndices.filter(idx => {
          const val = row[idx];
          return val && val.trim() !== "";
        }).length;

        const td = document.createElement("td");
        td.dataset.col = key;
        td.classList.add("sum-col");

        if (colIndices.length === 0) {
          td.textContent = "—";
          td.style.color = "var(--text-muted)";
        } else {
          td.textContent = paidCount + "/12";
          if (paidCount === 12) {
            const isOdd = full % 2 !== 0;
            td.classList.add(isOdd ? "status-full-odd" : "status-full-even");
          } else if (paidCount > 0) {
            td.classList.add("sum-partial");
          }
        }
        nomorTd.insertAdjacentElement("afterend", td);
      });
    }
    fragment.appendChild(tr);
  });
  tbodyEl.appendChild(fragment);

  containerEl.classList.add("visible");
  rowCountEl.textContent = (rows.length - 1) + " warga";
  buildFilterChips(rows);

  requestAnimationFrame(() => {
    updateColumnVisibility();
    applyStickyColumns();
    if (window.innerWidth < 640) collapsePanel();
  });
}

// ── FETCH & PARSE ────────────────────────────────────────────────────────
async function loadData() {
  showLoading();
  try {
    const res = await fetch("/api/rekap");
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.error || "Gagal memuat data (HTTP " + res.status + ")");
    }
    const data = await res.json();
    hideLoading();

    if (!data.values || data.values.length === 0) {
      showError("Data tidak tersedia atau sheet kosong.");
      return;
    }
    render(data.values);
  } catch (err) {
    hideLoading();
    showError(err.message);
    console.error("[rekap] Load error:", err);
  }
}

loadData();

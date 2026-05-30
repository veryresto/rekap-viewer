"use strict";

// ── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  STICKY_COLUMNS: [1, 2]
};

// ── ELEMENT REFS ─────────────────────────────────────────────────────────
const statusEl = document.getElementById("status");
const filterBarEl = document.getElementById("filter-bar");
const chipGroupEl = document.getElementById("blok-chips");
const chipGroupLunasEl = document.getElementById("lunas-chips");
const containerEl = document.getElementById("table-container");
const theadEl = document.getElementById("thead");
const tbodyEl = document.getElementById("tbody");
const rowCountEl = document.getElementById("row-count");
const syncTimeEl = document.getElementById("sync-time");

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
  const headers = document.querySelectorAll("#thead th");
  const hasNamaCol = Array.from(headers).some(th => th.textContent.trim() === 'Nama');

  // Blok (data-col 1): hidden when collapsed OR when filter doesn't need it
  const showBlok = blokShouldShow && !isCollapsed;
  document.querySelectorAll(`[data-col="1"]`)
    .forEach(el => el.classList.toggle("col-hidden", !showBlok));

  // Nama (data-col 2): hidden when collapsed (only if the "Nama" column exists)
  if (hasNamaCol) {
    document.querySelectorAll(`[data-col="2"]`)
      .forEach(el => el.classList.toggle("col-hidden", isCollapsed));
  }
}

// ── COLLAPSE / EXPAND ─────────────────────────────────────────────────────
function collapsePanel() {
  isCollapsed = true;
  if (toggleBtn) toggleBtn.textContent = "▶";
  updateColumnVisibility();
  requestAnimationFrame(() => applyStickyColumns());
}

function expandPanel() {
  isCollapsed = false;
  if (toggleBtn) toggleBtn.textContent = "◀";
  updateColumnVisibility();
  requestAnimationFrame(() => applyStickyColumns());
}

// ── FILTER ───────────────────────────────────────────────────────────────
function applyFilter() {
  const activeChips = [...chipGroupEl.querySelectorAll(".chip:not(.chip-all).active")];
  const isSemua = activeChips.length === 0;
  const selectedBloks = new Set(activeChips.map(c => c.dataset.blok));

  const activeLunasChips = chipGroupLunasEl ? [...chipGroupLunasEl.querySelectorAll(".chip:not(.chip-all).active")] : [];
  const isLunasSemua = activeLunasChips.length === 0;
  const selectedLunasYears = new Set(activeLunasChips.map(c => c.dataset.year));

  // Hide/show rows
  let visibleCount = 0;
  const headers = document.querySelectorAll("#thead th");
  const hasNamaCol = Array.from(headers).some(th => th.textContent.trim() === 'Nama');
  const nomorColIdx = hasNamaCol ? 3 : 2;

  document.querySelectorAll("#tbody tr").forEach(tr => {
    const blokCell  = tr.querySelector(`[data-col="1"]`);
    const blokVal   = blokCell ? blokCell.textContent.trim() : "";
    const nomorText = tr.querySelector(`[data-col="${nomorColIdx}"]`)?.textContent.trim().toLowerCase() ?? "";
    const namaText = hasNamaCol ? (tr.querySelector(`[data-col="2"]`)?.textContent.trim().toLowerCase() ?? "") : "";

    let matchesLunas = true;
    if (!isLunasSemua) {
      for (const year of selectedLunasYears) {
        const summaryCell = tr.querySelector(`[data-col="s${year}"]`);
        const isPaidOff = summaryCell && summaryCell.textContent.trim() === "12/12";
        if (!isPaidOff) {
          matchesLunas = false;
          break;
        }
      }
    }

    const matchesBlok   = isSemua || selectedBloks.has(blokVal);
    const matchesSearch = !searchTerm
      || nomorText.includes(searchTerm)
      || (hasNamaCol && namaText.includes(searchTerm));
    const show = matchesBlok && matchesSearch && matchesLunas;
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

// ── LUNAS CHIPS ─────────────────────────────────────────────────────────
function buildLunasChips(yearGroups) {
  if (!chipGroupLunasEl) return;
  chipGroupLunasEl.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.className = "chip chip-all active";
  allChip.textContent = "Semua";
  allChip.dataset.year = "";
  allChip.setAttribute("aria-pressed", "true");
  chipGroupLunasEl.appendChild(allChip);

  const years = Object.keys(yearGroups).sort();
  years.forEach(year => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = `Lunas '${year}`;
    chip.dataset.year = year;
    chip.setAttribute("aria-pressed", "false");
    chipGroupLunasEl.appendChild(chip);
  });

  chipGroupLunasEl.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    if (chip.classList.contains("chip-all")) {
      chipGroupLunasEl.querySelectorAll(".chip").forEach(c => {
        c.classList.remove("active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chipGroupLunasEl.querySelector(".chip-all").classList.remove("active");
      chipGroupLunasEl.querySelector(".chip-all").setAttribute("aria-pressed", "false");
      chip.classList.toggle("active");
      chip.setAttribute("aria-pressed", chip.classList.contains("active") ? "true" : "false");

      const anyActive = [...chipGroupLunasEl.querySelectorAll(".chip:not(.chip-all)")]
        .some(c => c.classList.contains("active"));
      if (!anyActive) {
        const all = chipGroupLunasEl.querySelector(".chip-all");
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
  const hasNamaCol = headers.some(cell => typeof cell === 'string' && cell.trim() === 'Nama');
  const identityColCount = hasNamaCol ? 3 : 2;
  CONFIG.STICKY_COLUMNS = hasNamaCol ? [1, 2, 3] : [1, 2];

  const yearGroups = {}; 
  headers.forEach((text, i) => {
    if (i <= identityColCount) return; 
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
    if (text && text.trim() === "Nama") {
      th.classList.add("col-nama");
    }
    theadRow.appendChild(th);
  });

  // Inject ◀/▶ toggle button in the Nomor <th> to collapse identity columns
  const nomorTh = theadRow.querySelector(`[data-col="${identityColCount}"]`);
  if (nomorTh && hasNamaCol) {
    nomorTh.classList.add("has-toggle");
    toggleBtn = document.createElement("button");
    toggleBtn.className = "col-toggle-btn";
    toggleBtn.setAttribute("aria-label", "Toggle info columns");
    toggleBtn.textContent = isCollapsed ? "▶" : "◀";
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isCollapsed) {
        expandPanel();
      } else {
        collapsePanel();
      }
    });
    nomorTh.appendChild(toggleBtn);
  }

  theadEl.appendChild(theadRow);

  const SUMMARY_YEARS = [
    { key: "s24", label: "'24", yearKey: "24", full: 2024 },
    { key: "s25", label: "'25", yearKey: "25", full: 2025 },
    { key: "s26", label: "'26", yearKey: "26", full: 2026 },
  ];

  const nomorThInDom = theadEl.querySelector(`[data-col="${identityColCount}"]`);
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
      if (headers[i] && headers[i].trim() === "Nama") {
        td.classList.add("col-nama");
      }
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
    const nomorTd = cellsByCol[identityColCount];
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
  buildLunasChips(yearGroups);

  requestAnimationFrame(() => {
    updateColumnVisibility();
    applyStickyColumns();
    if (window.innerWidth < 640 && hasNamaCol) collapsePanel();
  });
}

// ── FETCH & PARSE ────────────────────────────────────────────────────────
function displaySyncTime(isoString) {
  if (!syncTimeEl) return;
  if (!isoString) {
    syncTimeEl.textContent = "";
    return;
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      syncTimeEl.textContent = "";
      return;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    syncTimeEl.textContent = `Sinkronisasi terakhir: ${day} ${month} ${year} ${hours}:${minutes}`;
  } catch (e) {
    console.error("[rekap] Error formatting sync time:", e);
    syncTimeEl.textContent = "";
  }
}

async function loadData() {
  showLoading();
  try {
    const res = await fetch("/api/rekap");
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.error || "Gagal memuat data (HTTP " + res.status + ")");
    }

    // Extract last update timestamp from headers
    const syncTimeHeader = res.headers.get("X-Cache-Updated-At");
    displaySyncTime(syncTimeHeader);

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

// ── USER PROFILE ─────────────────────────────────────────────────────────
async function fetchUser() {
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const user = await res.json();
      
      const initials = (user.name ? user.name.substring(0, 2) : user.email.substring(0, 2)).toUpperCase();
      document.getElementById("user-initials").textContent = initials;
      document.getElementById("user-initials-large").textContent = initials;
      
      document.getElementById("user-name").textContent = user.name || user.email;
      document.getElementById("user-email").textContent = user.email;
      
      if (user.avatar_url) {
        document.getElementById("user-avatar-btn").innerHTML = `<img src="${user.avatar_url}" alt="Avatar" />`;
        document.getElementById("user-avatar-large").innerHTML = `<img src="${user.avatar_url}" alt="Avatar" />`;
      }

      const roleEl = document.getElementById("user-role");
      if (roleEl) {
        if (user.profile) {
          const type = user.profile.participant_type;
          const subtype = user.profile.resident_subtype;
          const affiliation = user.profile.requested_affiliation;
          
          let label = "";
          if (type === "resident") {
            if (subtype === "owner") {
              label = "Warga (Pemilik)";
            } else if (subtype === "renter") {
              label = "Warga (Penyewa)";
            } else {
              label = "Warga";
            }
          } else if (type === "non_resident") {
            if (affiliation === "security") {
              label = "Non-Warga (Keamanan)";
            } else if (affiliation === "secretariat") {
              label = "Non-Warga (Sekretariat)";
            } else if (affiliation === "vendor") {
              label = "Non-Warga (Mitra)";
            } else if (affiliation === "contractor") {
              label = "Non-Warga (Kontraktor)";
            } else if (affiliation === "assistant") {
              label = "Non-Warga (Asisten)";
            } else if (affiliation === "other") {
              label = "Non-Warga (Lainnya)";
            } else {
              label = "Non-Warga";
            }
          }
          roleEl.textContent = label;
          roleEl.style.display = label ? "" : "none";
        } else {
          roleEl.style.display = "none";
        }
      }
    }
  } catch (err) {
    console.error("[rekap] User profile error:", err);
  }
}

// ── DROPDOWN & LOGOUT EVENTS ──────────────────────────────────────────────
function initUserDropdown() {
  const btn = document.getElementById("user-menu-btn");
  const dropdown = document.getElementById("user-dropdown");
  const signoutBtn = document.getElementById("sign-out-btn");
  
  if (!btn || !dropdown) return;
  
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isExpanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", !isExpanded);
    dropdown.classList.toggle("show");
  });
  
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.remove("show");
      btn.setAttribute("aria-expanded", "false");
    }
  });
  
  signoutBtn.addEventListener("click", async () => {
    try {
      // Call the backend endpoint to log out globally from Supabase and clear the cookie
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    
    // Determine the portal URL based on the environment
    const isLocal = window.location.hostname.endsWith('.localtest.me') || 
                    window.location.hostname.endsWith('.lvh.me') || 
                    window.location.hostname === 'localhost';
    
    const portalUrl = isLocal 
      ? 'http://community.localtest.me:5173'
      : 'https://community.veryresto.com';
      
    window.location.href = portalUrl;
  });
}

fetchUser();
initUserDropdown();
loadData();


const API_BASE = "http://localhost:3000/api";

let bookingsCache = [];
let homestaysCache = [];
let deleteBookingId = null;

let applyTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  wireModalCloseButtons();
  await loadHomestayFilter();

  // initial load using server-side filters (none)
  await applyServerFilters();

  // local-only filters
  document.getElementById("searchInput")?.addEventListener("input", filterTable);
  document.getElementById("homestay")?.addEventListener("change", filterTable);
  document.getElementById("dateFilterType")?.addEventListener("change", filterTable);
  document.getElementById("startDate")?.addEventListener("change", filterTable);
  document.getElementById("endDate")?.addEventListener("change", filterTable);

  // server-side filters
  document.getElementById("payStatus")?.addEventListener("change", applyServerFilters);
  document.getElementById("custId")?.addEventListener("input", debouncedApplyServerFilters);
  document.getElementById("minGrandTotal")?.addEventListener("input", debouncedApplyServerFilters);
});

// -----------------------
// Debounce for server filters
// -----------------------
function debouncedApplyServerFilters() {
  clearTimeout(applyTimer);
  applyTimer = setTimeout(() => applyServerFilters(), 350);
}

// -----------------------
// Modal close wiring
// -----------------------
function wireModalCloseButtons() {
  const deleteModal = document.getElementById("deleteModal");
  const successModal = document.getElementById("successModal");

  deleteModal?.querySelector(".close-btn")?.addEventListener("click", () => {
    deleteModal.style.display = "none";
    deleteBookingId = null;
  });

  successModal?.querySelector(".close-btn")?.addEventListener("click", () => {
    successModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
      deleteModal.style.display = "none";
      deleteBookingId = null;
    }
    if (e.target === successModal) {
      successModal.style.display = "none";
    }
  });

  document.getElementById("okSuccessBtn")?.addEventListener("click", () => {
    successModal.style.display = "none";
  });

  document.getElementById("cancelDelete")?.addEventListener("click", () => {
    deleteModal.style.display = "none";
    deleteBookingId = null;
  });
}

// -----------------------
// Load homestay dropdown
// -----------------------
async function loadHomestayFilter() {
  const select = document.getElementById("homestay");
  if (!select) return;

  try {
    const res = await fetch(`${API_BASE}/homestays`);
    const data = await res.json().catch(() => []);

    homestaysCache = Array.isArray(data) ? data : [];
    select.innerHTML = `<option value="">All Homestays</option>`;

    homestaysCache.forEach(h => {
      const opt = document.createElement("option");
      opt.value = h.id;
      opt.textContent = h.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading homestays:", err);
    select.innerHTML = `<option value="">Failed to load homestays</option>`;
  }
}

// -----------------------
// Fetch bookings using server-side filters
// (payStatus, custId, minGrandTotal)
// -----------------------
async function applyServerFilters() {
  const payStatus = String(document.getElementById("payStatus")?.value || "").trim().toUpperCase();
  const custIdRaw = String(document.getElementById("custId")?.value || "").trim().toUpperCase();
  const minGrandTotalRaw = String(document.getElementById("minGrandTotal")?.value || "").trim();

  const params = new URLSearchParams();

  if (payStatus) params.set("payStatus", payStatus);
  if (custIdRaw) params.set("custId", custIdRaw);

  const minGrandTotal = Number(minGrandTotalRaw || 0);
  if (!Number.isNaN(minGrandTotal) && minGrandTotal > 0) {
    params.set("minGrandTotal", String(minGrandTotal));
  }

  const url = `${API_BASE}/bookingALL${params.toString() ? `?${params}` : ""}`;

  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      showSuccessModal(data?.error || "Failed to load bookings.", false);
      bookingsCache = [];
      renderBookingTable();
      return;
    }

    bookingsCache = Array.isArray(data) ? data : [];
    renderBookingTable();
  } catch (err) {
    console.error("Error fetching booking:", err);
    showSuccessModal("Failed to load bookings: " + err.message, false);
  }
}

// -----------------------
// Render table (includes totals)
// -----------------------
function renderBookingTable() {
  const tbody = document.getElementById("bookingTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  bookingsCache.forEach(b => {
    const tr = document.createElement("tr");

    const payUpper = String(b.payStatus || "PENDING").trim().toUpperCase();
    tr.dataset.paystatus = payUpper;
    tr.dataset.homestayId = b.homestayId || "";

    // keep raw date strings for filtering
    tr.dataset.bookingDate = b.bookingDate || "";
    tr.dataset.checkinDate = b.checkinDate || "";
    tr.dataset.checkoutDate = b.checkoutDate || "";

    const isPaid = payUpper === "PAID";

    tr.innerHTML = `
      <td>${escapeHtml(b.bookingId || "-")}</td>
      <td>${escapeHtml(formatAnyDateToDdMmYyyy(b.bookingDate))}</td>
      <td>${escapeHtml(`${b.custName || "-"} (${b.custId || "-"})`)}</td>
      <td>${escapeHtml(b.homestayName || "-")}</td>
      <td>${escapeHtml(formatAnyDateToDdMmYyyy(b.checkinDate))}</td>
      <td>${escapeHtml(formatAnyDateToDdMmYyyy(b.checkoutDate))}</td>
      <td>${escapeHtml(String(b.totalNight ?? "-"))}</td>
      <td>${renderPayStatusBadge(payUpper)}</td>

      <td>${escapeHtml(formatMoney(b.homestayTotal))}</td>
      <td>${escapeHtml(formatMoney(b.itemsTotal))}</td>
      <td><strong>${escapeHtml(formatMoney(b.grandTotal))}</strong></td>

      <td class="action-button">
        <button class="btn-view" type="button"
          onclick="go('view_booking.html?id=${encodeURIComponent(b.bookingId)}')">
          <i class="fa-regular fa-eye"></i> View
        </button>

        <button class="btn-edit" type="button"
          onclick="go('edit_booking.html?id=${encodeURIComponent(b.bookingId)}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>

        <button class="btn-remove" type="button"
          ${isPaid ? "disabled title='Cannot delete: payment is PAID'" : ""}
          onclick="${isPaid ? "return false;" : `confirmDelete('${escapeAttr(b.bookingId)}', this)`}">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  filterTable();
}

// -----------------------
// Pay status badge
// -----------------------
function renderPayStatusBadge(statusUpper) {
  const s = String(statusUpper || "").trim().toUpperCase();
  if (s === "PAID") return `<span class="badge badge-pay-paid">PAID</span>`;
  if (s === "PENDING") return `<span class="badge badge-pay-pending">PENDING</span>`;
  return `<span class="badge badge-pay-none">${escapeHtml(s || "-")}</span>`;
}

// -----------------------
// Confirm delete
// -----------------------
function confirmDelete(id, btn) {
  deleteBookingId = { id, btn };
  document.getElementById("deleteModal").style.display = "block";
}

// -----------------------
// Execute delete
// -----------------------
document.getElementById("confirmDelete").onclick = async function () {
  if (!deleteBookingId) return;

  const id = deleteBookingId.id;
  const row = deleteBookingId.btn.closest("tr");

  try {
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    const result = await res.json().catch(() => ({}));
    document.getElementById("deleteModal").style.display = "none";

    if (res.ok && result.success) {
      if (row) row.remove();
      showSuccessModal("Booking deleted successfully!", true);
    } else {
      showSuccessModal(result.error || result.message || "Failed to delete booking.", false);
    }
  } catch (err) {
    console.error("Delete error:", err);
    document.getElementById("deleteModal").style.display = "none";
    showSuccessModal("Error deleting booking: " + err.message, false);
  } finally {
    deleteBookingId = null;
  }
};

// -----------------------
// Success modal
// -----------------------
function showSuccessModal(message, isSuccess = true) {
  const successModal = document.getElementById("successModal");
  const successMessage = document.getElementById("successMessage");

  successMessage.textContent = message;
  successMessage.style.color = isSuccess ? "#28a745" : "#dc3545";
  successModal.style.display = "block";
}

// -----------------------
// Local filters (search + homestay + date)
// -----------------------
function filterTable() {
  const searchFilter = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const homestayFilter = (document.getElementById("homestay")?.value || "").trim();
  const dateType = document.getElementById("dateFilterType")?.value || "booking";
  const startDate = (document.getElementById("startDate")?.value || "").trim();
  const endDate = (document.getElementById("endDate")?.value || "").trim();

  const tbody = document.getElementById("bookingTbody");
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr");

  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;

  rows.forEach(row => {
    const tds = row.querySelectorAll("td");

    const txtID = (tds[0]?.textContent || "").toLowerCase();
    const txtCust = (tds[2]?.textContent || "").toLowerCase();

    const matchesSearch = txtID.includes(searchFilter) || txtCust.includes(searchFilter);

    let matchesHomestay = true;
    if (homestayFilter) {
      matchesHomestay = (row.dataset.homestayId || "") === homestayFilter;
    }

    let matchesDate = true;
    if (start || end) {
      const bookingDateObj = parseAnyDate(row.dataset.bookingDate);
      const checkinObj = parseAnyDate(row.dataset.checkinDate);
      const checkoutObj = parseAnyDate(row.dataset.checkoutDate);

      if (dateType === "booking") {
        if (!bookingDateObj) matchesDate = false;
        else {
          if (start && bookingDateObj < start) matchesDate = false;
          if (end && bookingDateObj > end) matchesDate = false;
        }
      } else {
        if (!checkinObj || !checkoutObj) matchesDate = false;
        else {
          if (start && checkoutObj < start) matchesDate = false;
          if (end && checkinObj > end) matchesDate = false;
        }
      }
    }

    row.style.display = (matchesSearch && matchesHomestay && matchesDate) ? "" : "none";
  });
}

// -----------------------
// Clear filters
// -----------------------
function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("homestay").value = "";
  document.getElementById("dateFilterType").value = "booking";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";

  // server-side filters
  document.getElementById("payStatus").value = "";
  document.getElementById("custId").value = "";
  document.getElementById("minGrandTotal").value = "";

  applyServerFilters();
}

// -----------------------
// Helpers
// -----------------------
function formatMoney(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(2);
}

// Handles many Oracle formats: Date object, ISO string, or "2026-01-28T00:00:00.000Z", or "28-JAN-26"
function parseAnyDate(val) {
  if (!val) return null;

  // If already a Date-ish string
  const s = String(val).trim();
  if (!s) return null;

  // 1) Try JS Date parse (works for ISO / RFC)
  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime())) return d1;

  // 2) Try Oracle-like "DD-MON-YY" or "DD-MON-YYYY"
  // e.g. "28-JAN-26" or "28-JAN-2026"
  const m = s.match(/^(\d{1,2})-([A-Z]{3})-(\d{2}|\d{4})$/i);
  if (m) {
    const dd = Number(m[1]);
    const mon = String(m[2]).toUpperCase();
    const yy = String(m[3]);
    const months = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
    const mm = months[mon];
    if (mm == null) return null;
    const yyyy = yy.length === 2 ? (2000 + Number(yy)) : Number(yy);
    const d2 = new Date(yyyy, mm, dd);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }

  // 3) Try "DD/MM/YYYY"
  const p = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (p) {
    const d3 = new Date(`${p[3]}-${p[2]}-${p[1]}T00:00:00`);
    return Number.isNaN(d3.getTime()) ? null : d3;
  }

  return null;
}

function formatAnyDateToDdMmYyyy(val) {
  const d = parseAnyDate(val);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}

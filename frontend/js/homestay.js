const API_BASE = "http://localhost:3000/api";

let pendingDelete = { id: null, btn: null };
let homestaysCache = [];

let applyTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  wireDeleteModal();
  wireSuccessModal();

  // load years for revenue filter (uses your existing endpoint)
  await loadRevenueYears();

  // initial fetch
  await applyServerFilters();

  // client-side search only (fast)
  document.getElementById("searchInput")?.addEventListener("keyup", filterTable);

  // server-side filters (better for revenue/year ranges)
  document.getElementById("statusFilter")?.addEventListener("change", applyServerFilters);
  document.getElementById("hkStatusFilter")?.addEventListener("change", applyServerFilters);
  document.getElementById("revenueYear")?.addEventListener("change", applyServerFilters);

  document.getElementById("minRevenue")?.addEventListener("input", debouncedApplyServerFilters);
  document.getElementById("maxRevenue")?.addEventListener("input", debouncedApplyServerFilters);

  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    const s = document.getElementById("searchInput");
    const hs = document.getElementById("statusFilter");
    const hk = document.getElementById("hkStatusFilter");
    const y = document.getElementById("revenueYear");
    const minR = document.getElementById("minRevenue");
    const maxR = document.getElementById("maxRevenue");

    if (s) s.value = "";
    if (hs) hs.value = "";
    if (hk) hk.value = "";
    if (y) y.value = "";
    if (minR) minR.value = "";
    if (maxR) maxR.value = "";

    applyServerFilters();
  });
});

function debouncedApplyServerFilters() {
  clearTimeout(applyTimer);
  applyTimer = setTimeout(() => applyServerFilters(), 350);
}

// --------------------
// Load Revenue Years
// --------------------
async function loadRevenueYears() {
  const sel = document.getElementById("revenueYear");
  if (!sel) return;

  try {
    // You already have this endpoint in server.js
    const res = await fetch(`${API_BASE}/booking-years`);
    const years = await res.json().catch(() => []);

    // keep "All Years"
    sel.innerHTML = `<option value="">All Years</option>`;

    if (res.ok && Array.isArray(years)) {
      years.forEach(y => {
        const opt = document.createElement("option");
        opt.value = String(y);
        opt.textContent = String(y);
        sel.appendChild(opt);
      });
    }
  } catch (e) {
    // silently ignore; still usable
    sel.innerHTML = `<option value="">All Years</option>`;
  }
}

// --------------------
// Fetch with server-side filters
// --------------------
async function applyServerFilters() {
  const hsStatus = String(document.getElementById("statusFilter")?.value || "").trim().toUpperCase();
  const hkStatus = String(document.getElementById("hkStatusFilter")?.value || "").trim().toUpperCase();
  const year = String(document.getElementById("revenueYear")?.value || "").trim();

  const minRevenueRaw = String(document.getElementById("minRevenue")?.value || "").trim();
  const maxRevenueRaw = String(document.getElementById("maxRevenue")?.value || "").trim();

  const params = new URLSearchParams();
  params.set("includeHK", "true");

  if (hsStatus) params.set("status", hsStatus);
  if (hkStatus) params.set("hkStatus", hkStatus);
  if (year) params.set("year", year);

  const minRevenue = Number(minRevenueRaw || 0);
  if (!Number.isNaN(minRevenue) && minRevenue > 0) params.set("minRevenue", String(minRevenue));

  const maxRevenue = Number(maxRevenueRaw);
  if (maxRevenueRaw && !Number.isNaN(maxRevenue) && maxRevenue >= 0) {
    params.set("maxRevenue", String(maxRevenue));
  }

  try {
    const res = await fetch(`${API_BASE}/homestays?${params.toString()}`);
    const payload = await res.json().catch(() => []);

    if (!res.ok) {
      const msg = payload?.error || payload?.message || "Failed to load homestays.";
      showSuccessModal(msg, false);
      homestaysCache = [];
      renderHomestays();
      return;
    }

    homestaysCache = Array.isArray(payload) ? payload : [];
    renderHomestays();
    filterTable(); // apply client-side search
  } catch (err) {
    console.error("Error fetching homestays:", err);
    showSuccessModal("Failed to load homestays: " + err.message, false);
  }
}

// --------------------
// Render table
// --------------------
function renderHomestays() {
  const tbody = document.getElementById("homestayTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  homestaysCache.forEach(h => {
    const hsStatus = String(h.status || "").trim().toUpperCase();
    const hkStatus = String(h.hkStatus || "(NONE)").trim().toUpperCase();

    const row = document.createElement("tr");
    row.dataset.hsStatus = hsStatus;
    row.dataset.hkStatus = hkStatus;
    row.dataset.name = String(h.name || "").toLowerCase();

    row.classList.remove("row-homestay-available", "row-homestay-unavailable");
    row.classList.add(hsStatus === "AVAILABLE" ? "row-homestay-available" : "row-homestay-unavailable");

    row.innerHTML = `
      <td>${escapeHtml(h.id)}</td>
      <td>${escapeHtml(h.name)}</td>
      <td>RM${Number(h.price || 0).toFixed(2)}</td>
      <td>${escapeHtml(h.description || "")}</td>
      <td>${renderHomestayBadge(hsStatus)}</td>
      <td>${renderHousekeepingBadge(hkStatus)}</td>

      <td><strong>RM${formatMoney(h.totalRevenue)}</strong></td>

      <td class="action-group">
        <button class="btn-edit" type="button"
          onclick="go('edit_homestay.html?id=${encodeURIComponent(h.id)}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="btn-remove btn-remove-homestay" type="button" data-id="${escapeAttr(h.id)}">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  document.querySelectorAll(".btn-remove-homestay").forEach(btn => {
    btn.addEventListener("click", () => openDeleteModal(btn.dataset.id, btn));
  });
}

// --------------------
// Client-side search only (name)
// --------------------
function filterTable() {
  const searchInput = (document.getElementById("searchInput")?.value || "").toLowerCase();

  const tbody = document.getElementById("homestayTbody");
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr");

  rows.forEach(row => {
    const name = row.dataset.name || "";
    const matchesSearch = name.includes(searchInput);
    row.style.display = matchesSearch ? "" : "none";
  });
}

/* ===========================
   BADGES
=========================== */
function renderHomestayBadge(statusUpper) {
  const s = String(statusUpper || "").toUpperCase();
  if (s === "AVAILABLE") return `<span class="badge badge-hs-available">AVAILABLE</span>`;
  return `<span class="badge badge-hs-unavailable">UNAVAILABLE</span>`;
}

function renderHousekeepingBadge(statusUpper) {
  const s = String(statusUpper || "").trim().toUpperCase();
  if (s === "SCHEDULED") return `<span class="badge badge-hk-scheduled">SCHEDULED</span>`;
  if (s === "INCOMPLETE") return `<span class="badge badge-hk-incomplete">INCOMPLETE</span>`;
  if (s === "IN CLEANING") return `<span class="badge badge-hk-incleaning">IN CLEANING</span>`;
  if (s === "COMPLETED") return `<span class="badge badge-hk-completed">COMPLETED</span>`;
  return `<span class="badge badge-hk-none">(NONE)</span>`;
}

/* ===========================
   DELETE FLOW
=========================== */
function wireDeleteModal() {
  const deleteModal = document.getElementById("deleteModal");
  const confirmBtn = document.getElementById("confirmDelete");
  const cancelBtn = document.getElementById("cancelDelete");
  const closeBtn = deleteModal?.querySelector(".close-btn");

  confirmBtn?.addEventListener("click", async () => {
    if (!pendingDelete.id) return closeDeleteModal();
    await doDeleteHomestay(pendingDelete.id, pendingDelete.btn);
  });

  cancelBtn?.addEventListener("click", closeDeleteModal);
  closeBtn?.addEventListener("click", closeDeleteModal);

  window.addEventListener("click", (event) => {
    if (event.target === deleteModal) closeDeleteModal();
  });
}

function openDeleteModal(id, btn) {
  pendingDelete.id = id;
  pendingDelete.btn = btn;
  document.getElementById("deleteModal").style.display = "block";
}

function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  pendingDelete.id = null;
  pendingDelete.btn = null;
}

async function doDeleteHomestay(id, btn) {
  const confirmBtn = document.getElementById("confirmDelete");
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/homestays/${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await res.json().catch(() => ({}));

    closeDeleteModal();

    if (!res.ok || !result.success) {
      const msg = result.error || result.message || "Failed to delete homestay.";
      showSuccessModal(msg, false);
      return;
    }

    const tr = btn?.closest?.("tr");
    if (tr) tr.remove();

    showSuccessModal("Homestay removed successfully!", true);
  } catch (err) {
    console.error("Delete error:", err);
    closeDeleteModal();
    showSuccessModal("Error deleting homestay: " + err.message, false);
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

/* ===========================
   SUCCESS MODAL
=========================== */
function wireSuccessModal() {
  const successModal = document.getElementById("successModal");
  const okBtn = document.getElementById("okSuccessBtn");
  const closeBtn = successModal?.querySelector(".close-btn");

  okBtn?.addEventListener("click", () => (successModal.style.display = "none"));
  closeBtn?.addEventListener("click", () => (successModal.style.display = "none"));

  window.addEventListener("click", (event) => {
    if (event.target === successModal) successModal.style.display = "none";
  });
}

function showSuccessModal(message, isSuccess) {
  const successModal = document.getElementById("successModal");
  const msgEl = document.getElementById("successMessage");

  msgEl.textContent = message;
  msgEl.style.color = isSuccess ? "#28a745" : "#dc3545";
  successModal.style.display = "block";
}

/* ===========================
   HELPERS
=========================== */
function formatMoney(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
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

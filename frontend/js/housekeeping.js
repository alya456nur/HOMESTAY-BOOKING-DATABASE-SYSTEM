const API_BASE = "http://localhost:3000/api";

/* =========================
   Helpers
========================= */
function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function toYyyyMmDd(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function renderHousekeepingBadge(statusRaw) {
  const s = String(statusRaw || "").trim().toUpperCase();

  if (s === "SCHEDULED") return `<span class="badge badge-hk-scheduled">SCHEDULED</span>`;
  if (s === "INCOMPLETE") return `<span class="badge badge-hk-incomplete">INCOMPLETE</span>`;
  if (s === "IN CLEANING") return `<span class="badge badge-hk-incleaning">IN CLEANING</span>`;
  if (s === "COMPLETED") return `<span class="badge badge-hk-completed">COMPLETED</span>`;

  return `<span class="badge badge-hk-none">(NONE)</span>`;
}

/* =========================
   State
========================= */
let housekeepingData = [];
let deleteHousekeepingRef = null; // { id, btn }

/* =========================
   Modals
========================= */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "block";
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "none";
}

function showResultModal(message, isSuccess = true) {
  const successModal = document.getElementById("successModal");
  const successMessage = document.getElementById("successMessage");
  const okBtn = document.getElementById("okSuccessBtn");

  successMessage.textContent = message;
  successMessage.style.color = isSuccess ? "#28a745" : "#dc3545";
  successModal.style.display = "block";

  okBtn.onclick = () => {
    successModal.style.display = "none";
  };
}

/* =========================
   Load + Render
========================= */
async function loadHousekeeping() {
  try {
    const response = await fetch(`${API_BASE}/housekeeping`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      const msg = data?.error || data?.message || "Failed to load housekeeping.";
      showResultModal(msg, false);
      housekeepingData = [];
      renderTable([]);
      return;
    }

    housekeepingData = Array.isArray(data) ? data : [];
    renderTable(housekeepingData);

  } catch (error) {
    console.error("Failed to load housekeeping:", error);
    showResultModal("Server error while loading housekeeping: " + error.message, false);
    housekeepingData = [];
    renderTable([]);
  }
}

function renderTable(data) {
  const tbody = document.getElementById("housekeepingTbody");
  if (!tbody) {
    console.error("Missing <tbody id='housekeepingTbody'> in housekeeping.html");
    return;
  }

  const statusFilter = (document.getElementById("statusFilter")?.value || "").trim().toUpperCase();
  const fromDateStr = (document.getElementById("fromDate")?.value || "").trim(); // YYYY-MM-DD

  tbody.innerHTML = "";

  data.forEach((row) => {
    const rowStatusUpper = String(row.status || "").trim().toUpperCase();
    const rowDate = toYyyyMmDd(row.hk_date); // YYYY-MM-DD or ""

    // status match
    if (statusFilter) {
      const target = statusFilter === "(NONE)" ? "" : statusFilter;
      if (target && rowStatusUpper !== target) return;
      if (!target && rowStatusUpper) return; // want NONE but row has status
    }

    // from date match (rowDate must exist and >= fromDate)
    if (fromDateStr) {
      if (!rowDate) return;
      if (rowDate < fromDateStr) return;
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(row.homestay || "-")}</td>
      <td>${escapeHtml(row.employee || "-")}</td>
      <td>${escapeHtml(formatDate(row.hk_date))}</td>
      <td>${renderHousekeepingBadge(row.status)}</td>
      <td class="action-group">
        <button class="btn-edit" type="button"
          onclick="go('edit_housekeeping.html?id=${encodeURIComponent(row.id)}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="btn-remove" type="button"
          onclick="confirmDelete('${escapeAttr(row.id)}', this)">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   Filters
========================= */
function filterTable() {
  renderTable(housekeepingData);
}

/* =========================
   Delete Flow
========================= */
function confirmDelete(id, btn) {
  deleteHousekeepingRef = { id, btn };
  openModal("deleteModal");
}

async function doDelete() {
  if (!deleteHousekeepingRef) return;

  const id = deleteHousekeepingRef.id;
  const rowEl = deleteHousekeepingRef.btn?.closest("tr");

  const confirmBtn = document.getElementById("confirmDelete");
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/housekeeping/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    const result = await res.json().catch(() => ({}));

    closeModal("deleteModal");

    if (res.ok && result.success) {
      if (rowEl) rowEl.remove();
      showResultModal("Housekeeping record deleted successfully!", true);
      housekeepingData = housekeepingData.filter(r => String(r.id) !== String(id));
    } else {
      const msg = result.error || result.message || "Failed to delete housekeeping record.";
      showResultModal(msg, false);
    }

  } catch (err) {
    console.error("Delete error:", err);
    closeModal("deleteModal");
    showResultModal("Error deleting housekeeping record: " + err.message, false);
  } finally {
    deleteHousekeepingRef = null;
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

function cancelDelete() {
  closeModal("deleteModal");
  deleteHousekeepingRef = null;
}

/* =========================
   Modal wiring
========================= */
function wireModalButtons() {
  document.getElementById("confirmDelete")?.addEventListener("click", doDelete);
  document.getElementById("cancelDelete")?.addEventListener("click", cancelDelete);

  // X close on both modals
  document.querySelectorAll(".modal .close-btn").forEach(btn => {
    btn.onclick = function () {
      const modal = btn.closest(".modal");
      if (modal) modal.style.display = "none";
      deleteHousekeepingRef = null;
    };
  });

  // click outside closes
  window.addEventListener("click", (event) => {
    const del = document.getElementById("deleteModal");
    const suc = document.getElementById("successModal");

    if (event.target === del) {
      del.style.display = "none";
      deleteHousekeepingRef = null;
    }
    if (event.target === suc) {
      suc.style.display = "none";
    }
  });
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  wireModalButtons();

  document.getElementById("statusFilter")?.addEventListener("change", filterTable);
  document.getElementById("fromDate")?.addEventListener("change", filterTable);

  loadHousekeeping();
});

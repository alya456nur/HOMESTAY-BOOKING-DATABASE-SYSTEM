// item.js
const API_BASE = "http://localhost:3000";

let items = [];
let deleteItemNo = null;

/* =========================
   Modal helper (Success/Error)
========================= */
function showResultModal(message, isSuccess) {
  const modal = document.getElementById("successModal");
  const msgEl = document.getElementById("successMessage");

  msgEl.textContent = message;
  msgEl.style.color = isSuccess ? "#28a745" : "#dc3545";
  modal.style.display = "block";
}

function hideModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.style.display = "none";
}

/* =========================
   Navigation helper (fallback)
========================= */
function go(url) {
  window.location.href = url;
}

/* =========================
   Status badge renderer (ITEM_STATUS)
========================= */
function renderItemStatusBadge(statusRaw) {
  const s = String(statusRaw || "").trim().toUpperCase();

  if (s === "AVAILABLE") {
    return `<span class="badge badge-item-available">${escapeHtml(s)}</span>`;
  }
  if (s === "UNAVAILABLE") {
    return `<span class="badge badge-item-unavailable">${escapeHtml(s)}</span>`;
  }
  if (!s) return `<span class="badge badge-item-none">(NONE)</span>`;
  return `<span class="badge badge-item-none">${escapeHtml(s)}</span>`;
}

/* =========================
   Build query for /api/items
   Supports server.js params:
   - status
   - minUsed
========================= */
function buildItemsUrl() {
  const statusUI = String(document.getElementById("statusFilter")?.value || "").trim();
  const minBookingsUI = String(document.getElementById("minUsedFilter")?.value || "").trim(); // reuse same input id

  const params = new URLSearchParams();

  if (statusUI) params.set("status", statusUI.toUpperCase());

  const minBookings = Number(minBookingsUI);
  if (!Number.isNaN(minBookings) && minBookings > 0) {
    params.set("minBookings", String(minBookings)); // NEW param
  }

  // avoid trailing "?"
  const qs = params.toString();
  return qs ? `${API_BASE}/api/items?${qs}` : `${API_BASE}/api/items`;
}


/* =========================
   Load items (server-side filter for status/minUsed)
========================= */
async function loadItems() {
  try {
    const url = buildItemsUrl();
    const res = await fetch(url);
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      showResultModal(data?.error || "Failed to load items.", false);
      return;
    }

    items = Array.isArray(data) ? data : [];
    renderTable(items);

    // after server-side load, we can still do client-side search/type filter
    filterTable();
  } catch (err) {
    console.error("Failed to load items:", err);
    showResultModal("Server error while loading items.", false);
  }
}

/* =========================
   Render table (TBODY ONLY)
========================= */
function renderTable(data) {
  const tbody = document.getElementById("itemTbody");
  if (!tbody) {
    console.error("Missing <tbody id='itemTbody'> in items.html");
    return;
  }

  tbody.innerHTML = "";

  data.forEach((item) => {
    const tr = document.createElement("tr");

    const supplierName = item.supplier ? item.supplier : "-";
    const usedQty = Number(item.totalUsedQty || 0);
    const usedBookings = Number(item.usedInBookings || 0);
    const revenue = Number(item.totalItemRevenue || 0);

    tr.innerHTML = `
      <td>${escapeHtml(item.name || "-")}</td>
      <td>${escapeHtml(item.type || "-")}</td>
      <td>${escapeHtml(item.desc || "-")}</td>
      <td>${escapeHtml(item.rateType || "-")}</td>
      <td>RM ${Number(item.rate || 0).toFixed(2)}</td>
      <td>${renderItemStatusBadge(item.status)}</td>
      <td>${escapeHtml(supplierName)}</td>

      <!-- analytics columns -->
      <td>RM ${revenue.toFixed(2)}</td>
      <td>${usedBookings}</td>

      <td class="action-group">
        <button class="btn-edit" type="button"
          onclick="go('edit_item.html?itemNo=${encodeURIComponent(item.itemNo)}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>

        <button class="btn-remove" type="button"
          onclick="confirmDelete('${escapeAttr(item.itemNo)}')">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   Client-side filter:
   - Search by name/desc/supplier
   - Type filter (client-side because server doesn't support it)
========================= */
function filterTable() {
  const searchInput = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const typeFilter = (document.getElementById("typeFilter")?.value || "").trim().toLowerCase();

  const filtered = items.filter((item) => {
    const name = String(item.name || "").toLowerCase();
    const desc = String(item.desc || "").toLowerCase();
    const supplier = String(item.supplier || "").toLowerCase();
    const type = String(item.type || "").toLowerCase();

    const matchSearch =
      !searchInput ||
      name.includes(searchInput) ||
      desc.includes(searchInput) ||
      supplier.includes(searchInput);

    const matchType = !typeFilter || type === typeFilter;

    return matchSearch && matchType;
  });

  renderTable(filtered);
}

/* =========================
   Delete flow
========================= */
function confirmDelete(itemNo) {
  deleteItemNo = String(itemNo || "").trim().toUpperCase();
  document.getElementById("deleteModal").style.display = "block";
}

async function doDelete() {
  if (!deleteItemNo) return;

  try {
    const res = await fetch(`${API_BASE}/api/items/${encodeURIComponent(deleteItemNo)}`, {
      method: "DELETE"
    });

    const data = await res.json().catch(() => ({}));

    hideModal("deleteModal");

    if (!res.ok || !data.success) {
      showResultModal(data.error || "Failed to delete item.", false);
      return;
    }

    showResultModal(data.message || "Item removed successfully!", true);

    await loadItems();

  } catch (err) {
    console.error(err);
    hideModal("deleteModal");
    showResultModal("Server error while deleting item.", false);
  } finally {
    deleteItemNo = null;
  }
}

/* =========================
   Helpers
========================= */
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

/* =========================
   Wire up events after DOM ready
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // modal buttons
  document.getElementById("confirmDelete")?.addEventListener("click", doDelete);

  document.getElementById("cancelDelete")?.addEventListener("click", () => {
    hideModal("deleteModal");
    deleteItemNo = null;
  });

  document.getElementById("okSuccessBtn")?.addEventListener("click", () => {
    hideModal("successModal");
  });

  // close (X) buttons
  document.querySelectorAll(".modal .close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) modal.style.display = "none";
    });
  });

  // click outside to close
  window.addEventListener("click", (event) => {
    const deleteModal = document.getElementById("deleteModal");
    const successModal = document.getElementById("successModal");

    if (event.target === deleteModal) deleteModal.style.display = "none";
    if (event.target === successModal) successModal.style.display = "none";
  });

  // filters
  document.getElementById("searchInput")?.addEventListener("keyup", filterTable);
  document.getElementById("typeFilter")?.addEventListener("change", filterTable);

  // server-side filters -> reload from API
  document.getElementById("statusFilter")?.addEventListener("change", loadItems);
  document.getElementById("minUsedFilter")?.addEventListener("input", () => {
    // small debounce-ish: reload after user stops typing
    clearTimeout(window.__minUsedTimer);
    window.__minUsedTimer = setTimeout(loadItems, 250);
  });

  // init load
  loadItems();
});

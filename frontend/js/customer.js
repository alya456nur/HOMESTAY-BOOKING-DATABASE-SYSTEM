const API_BASE = "http://localhost:3000";

let customers = [];
let deleteRef = null; // { id, btn }

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchInput")?.addEventListener("keyup", filterTable);
  document.getElementById("minBookings")?.addEventListener("input", filterTable);

  document.getElementById("confirmDelete")?.addEventListener("click", doDeleteCustomer);
  document.getElementById("cancelDelete")?.addEventListener("click", cancelDelete);

  document.querySelectorAll(".modal .close-btn").forEach(btn => {
    btn.onclick = function () {
      const modal = btn.closest(".modal");
      if (modal) modal.style.display = "none";
      deleteRef = null;
    };
  });

  window.addEventListener("click", (event) => {
    const del = document.getElementById("deleteModal");
    const suc = document.getElementById("successModal");

    if (event.target === del) {
      del.style.display = "none";
      deleteRef = null;
    }
    if (event.target === suc) {
      suc.style.display = "none";
    }
  });

  loadCustomers();
});

/* =========================
   Load customers
========================= */
async function loadCustomers() {
  try {
    const res = await fetch(`${API_BASE}/api/customers`);
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      const msg = data?.error || data?.message || "Failed to load customers.";
      customers = [];
      renderTable([]);
      showResultModal(msg, false);
      return;
    }

    customers = Array.isArray(data) ? data : [];
    renderTable(customers);

  } catch (err) {
    console.error("Failed to load customers:", err);
    customers = [];
    renderTable([]);
    showResultModal("Failed to load customers: " + err.message, false);
  }
}

/* =========================
   Render table
========================= */
function renderTable(data) {
  const tbody = document.getElementById("customerTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="text-align:center;">No customers found.</td>`;
    tbody.appendChild(tr);
    return;
  }

  data.forEach(c => {
    const tr = document.createElement("tr");

    const totalBookings = Number(c.totalBookings ?? 0);

    tr.innerHTML = `
      <td>${escapeHtml(c.id || "-")}</td>
      <td>${escapeHtml(c.name || "-")}</td>
      <td>${escapeHtml(c.phone || "-")}</td>
      <td>${escapeHtml(String(totalBookings))}</td>
      <td class="action-group">
        <button class="btn-edit" type="button"
          onclick="go('edit_customer.html?id=${encodeURIComponent(c.id)}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="btn-remove" type="button"
          onclick="confirmDelete('${escapeAttr(c.id)}', this)">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   Filter (id/name + min bookings)
========================= */
function filterTable() {
  const input = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const minBookings = Number(document.getElementById("minBookings")?.value || 0);

  const filtered = customers.filter(c => {
    const id = String(c.id || "").toLowerCase();
    const name = String(c.name || "").toLowerCase();
    const total = Number(c.totalBookings ?? 0);

    const matchesText = id.includes(input) || name.includes(input);
    const matchesMin = total >= (Number.isNaN(minBookings) ? 0 : minBookings);

    return matchesText && matchesMin;
  });

  renderTable(filtered);
}

/* =========================
   Delete flow
========================= */
function confirmDelete(id, btn) {
  const safeId = String(id || "").trim();
  if (!safeId) return;

  deleteRef = { id: safeId, btn };
  openModal("deleteModal");
}

async function doDeleteCustomer() {
  if (!deleteRef?.id) return;

  const id = deleteRef.id;
  const confirmBtn = document.getElementById("confirmDelete");
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/customers/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    const data = await res.json().catch(() => ({}));
    closeModal("deleteModal");

    if (!res.ok || !data.success) {
      const msg = data?.error || data?.message || "Failed to delete customer.";
      showResultModal("Delete failed: " + msg, false);
      return;
    }

    showResultModal(data?.message || "Customer removed successfully!", true);
    await loadCustomers();

  } catch (err) {
    console.error("Delete customer error:", err);
    closeModal("deleteModal");
    showResultModal("Delete failed: " + err.message, false);
  } finally {
    deleteRef = null;
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

function cancelDelete() {
  closeModal("deleteModal");
  deleteRef = null;
}

/* =========================
   Modal helpers
========================= */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "block";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

function showResultModal(message, isSuccess = true) {
  const modal = document.getElementById("successModal");
  const msgEl = document.getElementById("successMessage");
  const okBtn = document.getElementById("okSuccessBtn");

  msgEl.textContent = message;
  msgEl.style.color = isSuccess ? "#28a745" : "#dc3545";

  modal.style.display = "block";
  okBtn.onclick = () => (modal.style.display = "none");
}

/* =========================
   Escape helpers
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

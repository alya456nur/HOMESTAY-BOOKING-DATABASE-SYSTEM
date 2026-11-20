const API_BASE = "http://localhost:3000";

let suppliers = [];
let deleteRef = null; // { id, btn }

/* =========================
   Modal helpers
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
  const modal = document.getElementById("successModal");
  const messageEl = document.getElementById("successMessage");
  const okBtn = document.getElementById("okSuccessBtn");

  messageEl.textContent = message;
  messageEl.style.color = isSuccess ? "#28a745" : "#dc3545";

  modal.style.display = "block";
  okBtn.onclick = () => (modal.style.display = "none");
}

/* =========================
   Load suppliers
========================= */
async function loadSuppliers() {
  try {
    const res = await fetch(`${API_BASE}/api/suppliers`);
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      showResultModal(data?.error || data?.message || "Failed to load suppliers.", false);
      suppliers = [];
      renderTable([]);
      return;
    }

    suppliers = Array.isArray(data) ? data : [];
    renderTable(suppliers);

  } catch (err) {
    console.error("Failed to load suppliers:", err);
    showResultModal("Server error while loading suppliers: " + err.message, false);
    suppliers = [];
    renderTable([]);
  }
}

/* =========================
   Render table
========================= */
function renderTable(data) {
  const tbody = document.getElementById("supplierTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="text-align:center;">No suppliers found.</td>`;
    tbody.appendChild(tr);
    return;
  }

  data.forEach((s) => {
    const tr = document.createElement("tr");
    const totalItems = Number(s.totalItems ?? 0);

    tr.innerHTML = `
      <td>${escapeHtml(s.id || "-")}</td>
      <td>${escapeHtml(s.name || "-")}</td>
      <td>${escapeHtml(String(totalItems))}</td>
      <td class="action-group">
        <button class="btn-edit" type="button"
          onclick="go('edit_supplier.html?id=${encodeURIComponent(s.id)}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="btn-remove" type="button"
          onclick="confirmDelete('${escapeAttr(s.id)}', this)">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   Filter (id/name + min items)
========================= */
function filterTable() {
  const input = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const minItems = Number(document.getElementById("minItems")?.value || 0);

  const filtered = suppliers.filter((s) => {
    const id = String(s.id || "").toLowerCase();
    const name = String(s.name || "").toLowerCase();
    const total = Number(s.totalItems ?? 0);

    const matchesText = id.includes(input) || name.includes(input);
    const matchesMin = total >= (Number.isNaN(minItems) ? 0 : minItems);

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

async function doDeleteSupplier() {
  if (!deleteRef?.id) return;

  const id = deleteRef.id;
  const confirmBtn = document.getElementById("confirmDelete");
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/suppliers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json().catch(() => ({}));
    closeModal("deleteModal");

    if (!res.ok || !data.success) {
      showResultModal(data?.error || data?.message || "Failed to delete supplier.", false);
      return;
    }

    showResultModal(data?.message || "Supplier removed successfully!", true);
    await loadSuppliers();

  } catch (err) {
    console.error(err);
    closeModal("deleteModal");
    showResultModal("Server error while deleting supplier: " + err.message, false);
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

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchInput")?.addEventListener("keyup", filterTable);
  document.getElementById("minItems")?.addEventListener("input", filterTable);

  document.getElementById("confirmDelete")?.addEventListener("click", doDeleteSupplier);
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

  loadSuppliers();

  // keep table updated while typing
  document.getElementById("searchInput")?.addEventListener("keyup", filterTable);
});

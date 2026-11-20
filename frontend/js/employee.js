// employee.js

document.addEventListener("DOMContentLoaded", () => {
  fetchEmployees();
  setupDeleteModal();
  setupSuccessModalClose();

  // ✅ wire filters (same style as other modules)
  document.getElementById("searchInput")?.addEventListener("keyup", filterTable);
  document.getElementById("typeFilter")?.addEventListener("change", filterTable);
});

let employeeToDelete = null; // { id, btn }

/* =========================
   FETCH + RENDER
========================= */
async function fetchEmployees() {
  const tbody = document.getElementById("employeesTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("http://localhost:3000/api/employees");
    const employees = await res.json().catch(() => []);

    // Clear tbody safely
    tbody.innerHTML = "";

    (Array.isArray(employees) ? employees : []).forEach((emp) => {
      const tr = document.createElement("tr");

      const typeUpper = String(emp.type || "").trim(); // keep original text for display
      tr.dataset.type = String(typeUpper || "").toLowerCase(); // for filtering

      tr.innerHTML = `
        <td>${escapeHtml(emp.id || "")}</td>
        <td>${escapeHtml(emp.name || "")}</td>
        <td>${escapeHtml(formatDate(emp.dob))}</td>
        <td>${escapeHtml(formatDate(emp.hireDate))}</td>
        <td>${escapeHtml(emp.phone || "")}</td>
        <td>${escapeHtml(emp.type || "")}</td>
        <td class="action-group">
          <button class="btn-view" type="button"
            onclick="go('view_employee.html?id=${encodeURIComponent(emp.id)}')">
            <i class="fa-regular fa-eye"></i> View
          </button>

          <button class="btn-edit" type="button"
            onclick="go('edit_employee.html?id=${encodeURIComponent(emp.id)}')">
            <i class="fa-solid fa-pen"></i> Edit
          </button>

          <button class="btn-remove" type="button"
            onclick="showDeleteModal('${escapeAttr(emp.id)}', this)">
            <i class="fa-solid fa-trash"></i> Remove
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // apply current filters after render
    filterTable();

  } catch (err) {
    console.error("Error fetching employees:", err);
    showSuccessModal("Failed to load employees: " + err.message, false);
  }
}

/* =========================
   DATE FORMAT
========================= */
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* =========================
   DELETE MODAL
========================= */
function setupDeleteModal() {
  const deleteModal = document.getElementById("deleteModal");
  const confirmDelete = document.getElementById("confirmDelete");
  const cancelDelete = document.getElementById("cancelDelete");
  const closeBtn = deleteModal?.querySelector(".close-btn");

  if (!deleteModal || !confirmDelete || !cancelDelete || !closeBtn) return;

  // Confirm delete
  confirmDelete.addEventListener("click", async () => {
    if (!employeeToDelete?.id) return;

    const { id, btn } = employeeToDelete;

    // prevent double click
    confirmDelete.disabled = true;

    try {
      const res = await fetch(`http://localhost:3000/api/employees/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" }
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.success) {
        const msg = result.error || result.message || `Failed to delete employee (${res.status})`;
        showSuccessModal(msg, false);
      } else {
        const row = btn?.closest?.("tr");
        if (row) row.remove();
        showSuccessModal("Employee removed successfully!", true);
      }
    } catch (err) {
      console.error(err);
      showSuccessModal("Error deleting employee: " + err.message, false);
    } finally {
      deleteModal.style.display = "none";
      employeeToDelete = null;
      confirmDelete.disabled = false;
    }
  });

  // Cancel
  cancelDelete.addEventListener("click", () => {
    deleteModal.style.display = "none";
    employeeToDelete = null;
  });

  // Close X
  closeBtn.addEventListener("click", () => {
    deleteModal.style.display = "none";
    employeeToDelete = null;
  });

  // Click outside close
  window.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
      deleteModal.style.display = "none";
      employeeToDelete = null;
    }
  });
}

function showDeleteModal(empId, btn) {
  employeeToDelete = { id: empId, btn };
  document.getElementById("deleteModal").style.display = "block";
}

/* =========================
   SUCCESS MODAL (used for errors too)
========================= */
function showSuccessModal(message, isSuccess = true) {
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

function setupSuccessModalClose() {
  const successModal = document.getElementById("successModal");
  const closeBtn = successModal?.querySelector(".close-btn");
  if (!successModal || !closeBtn) return;

  closeBtn.onclick = () => (successModal.style.display = "none");

  window.addEventListener("click", (e) => {
    if (e.target === successModal) successModal.style.display = "none";
  });
}

/* =========================
   FILTER (tbody rows only)
========================= */
function filterTable() {
  const searchInput = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const typeFilter = (document.getElementById("typeFilter")?.value || "").toLowerCase().trim();

  const tbody = document.getElementById("employeesTableBody");
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr");

  rows.forEach((row) => {
    const tds = row.querySelectorAll("td");
    const txtID = (tds[0]?.textContent || "").toLowerCase();
    const txtName = (tds[1]?.textContent || "").toLowerCase();

    const rowType = (row.dataset.type || "").toLowerCase();

    const matchesSearch = txtID.includes(searchInput) || txtName.includes(searchInput);
    const matchesType = !typeFilter || rowType === typeFilter;

    row.style.display = (matchesSearch && matchesType) ? "" : "none";
  });
}

/* =========================
   XSS SAFETY HELPERS
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

document.addEventListener("DOMContentLoaded", () => {
  fetchPayments();

  // wire filters if they exist
  document.getElementById("statusFilter")?.addEventListener("change", filterTable);
  document.getElementById("methodFilter")?.addEventListener("change", filterTable);
  document.getElementById("fromDate")?.addEventListener("change", filterTable);
  document.getElementById("toDate")?.addEventListener("change", filterTable);
});

// ========================
// Fetch all payments
// ========================
async function fetchPayments() {
  try {
    const res = await fetch("http://localhost:3000/api/paymentsALL");
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      console.error("Failed to fetch payments:", data);
      return;
    }

    const payments = Array.isArray(data) ? data : [];

    // ✅ Use tbody instead of table
    const tbody = document.getElementById("paymentTbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    payments.forEach(pay => {
      const row = document.createElement("tr");

      const statusUpper = String(pay.status || "").trim().toUpperCase();
      const methodUpper = String(pay.method || "").trim().toUpperCase();

      // Receipt view allowed only when PAID + receiptNo exists
      const hasReceipt = !!(pay.receiptNo && String(pay.receiptNo).trim());
      const canViewReceipt = statusUpper === "PAID" && hasReceipt;

      // store raw values for filtering (because Status cell is now a badge)
      row.dataset.status = statusUpper;                  // e.g. "PAID"
      row.dataset.method = methodUpper;                  // e.g. "CASH"
      row.dataset.paydate = toYyyyMmDd(pay.paymentDate); // e.g. "2025-12-13" or ""

      row.innerHTML = `
        <td>${escapeHtml(pay.id || "-")}</td>
        <td>${escapeHtml(pay.bookingId || "-")}</td>
        <td>${escapeHtml(formatRM(pay.totalPrice))}</td>
        <td>${renderPayStatusBadge(statusUpper)}</td>
        <td>${escapeHtml(formatDate(pay.paymentDate))}</td>
        <td>${escapeHtml(pay.method || "-")}</td>
        <td class="receipt-button">
          <button
            class="btn-view"
            ${canViewReceipt ? "" : "disabled"}
            ${canViewReceipt ? `onclick="go('receipt.html?id=${encodeURIComponent(pay.receiptNo)}')"` : ""}
            title="${canViewReceipt ? "View receipt" : "Receipt only available after payment is PAID"}"
            type="button"
          >
            <i class="fa-regular fa-eye"></i> View
          </button>
        </td>
        <td class="action-button">
          <button class="btn-edit" type="button"
            onclick="go('edit_payment.html?id=${encodeURIComponent(pay.id)}')">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    // after rendering, apply current filters (if user already selected)
    filterTable();

  } catch (err) {
    console.error("Error fetching payments:", err);
  }
}

// ========================
// Filter table
// ========================
function filterTable() {
  const statusFilter = (document.getElementById("statusFilter")?.value || "").trim().toUpperCase();
  const methodFilter = (document.getElementById("methodFilter")?.value || "").trim().toUpperCase();
  const fromDate = (document.getElementById("fromDate")?.value || "").trim(); // YYYY-MM-DD
  const toDate = (document.getElementById("toDate")?.value || "").trim();     // YYYY-MM-DD

  const tbody = document.getElementById("paymentTbody");
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr");

  rows.forEach(row => {
    const rowStatus = (row.dataset.status || "").trim().toUpperCase();
    const rowMethod = (row.dataset.method || "").trim().toUpperCase();
    const rowDate = (row.dataset.paydate || "").trim(); // YYYY-MM-DD or ""

    let show = true;

    if (statusFilter && rowStatus !== statusFilter) show = false;
    if (methodFilter && rowMethod !== methodFilter) show = false;

    // date filter: if from/to specified, row must have a valid date
    if ((fromDate || toDate) && !rowDate) show = false;

    if (show && fromDate && rowDate < fromDate) show = false;
    if (show && toDate && rowDate > toDate) show = false;

    row.style.display = show ? "" : "none";
  });
}

// ========================
// Pay status badge HTML
// ========================
function renderPayStatusBadge(statusUpper) {
  const s = String(statusUpper || "").trim().toUpperCase();

  if (s === "PAID") {
    return `<span class="badge badge-pay-paid">PAID</span>`;
  }
  if (s === "PENDING") {
    return `<span class="badge badge-pay-pending">PENDING</span>`;
  }
  if (s === "UNPAID") {
    return `<span class="badge badge-pay-unpaid">UNPAID</span>`;
  }
  return `<span class="badge badge-pay-none">${escapeHtml(s || "-")}</span>`;
}

// ========================
// Helpers
// ========================

// Format date dd/mm/yyyy or "-" if null/invalid
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Convert date to YYYY-MM-DD (for filtering). Returns "" if invalid/null.
function toYyyyMmDd(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatRM(value) {
  const num = Number(value);
  if (!isFinite(num)) return "RM0.00";
  return `RM ${num.toFixed(2)}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

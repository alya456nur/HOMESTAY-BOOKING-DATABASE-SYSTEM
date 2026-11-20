const API_BASE = "http://localhost:3000/api";
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get("id");

let customersCache = [];
let homestaysCache = [];
let itemsCache = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!bookingId) {
    alert("Missing booking id in URL.");
    window.location.href = "bookings.html";
    return;
  }

  document.getElementById("bookingIdDisplay").value = bookingId;

  document.getElementById("btnAddItem").addEventListener("click", addItemRow);
  document.getElementById("btnUpdate").addEventListener("click", updateBooking);

  document.getElementById("checkinDate").addEventListener("change", updateNights);
  document.getElementById("checkoutDate").addEventListener("change", updateNights);
  document.getElementById("homestaySelect").addEventListener("change", updateHomestayPrice);

  await Promise.all([loadCustomers(), loadHomestays(), loadItems()]);
  await loadBookingInfo();
  await loadBookingItems();

  updateTotals();
  updateGrandTotal();
});

// ---------- UI helpers ----------
function showError(msg) {
  const p = document.getElementById("formError");
  p.style.display = "block";
  p.textContent = msg;
}

function clearError() {
  const p = document.getElementById("formError");
  p.style.display = "none";
  p.textContent = "";
}

function markInvalid(el, isInvalid) {
  if (!el) return;
  el.style.border = isInvalid ? "2px solid #c0392b" : "";
}

function validateBookingInfo() {
  clearError();

  const customerEl = document.getElementById("customerSelect");
  const homestayEl = document.getElementById("homestaySelect");
  const checkinEl = document.getElementById("checkinDate");
  const checkoutEl = document.getElementById("checkoutDate");
  const nightsEl = document.getElementById("totalNights");

  [customerEl, homestayEl, checkinEl, checkoutEl].forEach(el => markInvalid(el, false));

  const missing = [];
  if (!customerEl.value.trim()) { missing.push("Customer"); markInvalid(customerEl, true); }
  if (!homestayEl.value.trim()) { missing.push("Homestay"); markInvalid(homestayEl, true); }
  if (!checkinEl.value) { missing.push("Check-in date"); markInvalid(checkinEl, true); }
  if (!checkoutEl.value) { missing.push("Check-out date"); markInvalid(checkoutEl, true); }

  if (missing.length > 0) {
    showError(`Please fill in: ${missing.join(", ")}.`);
    return false;
  }

  const inDate = new Date(checkinEl.value);
  const outDate = new Date(checkoutEl.value);
  const nights = Number(nightsEl.value || 0);

  if (!(outDate > inDate) || nights <= 0) {
    markInvalid(checkinEl, true);
    markInvalid(checkoutEl, true);
    showError("Check-out date must be after check-in date.");
    return false;
  }

  return true;
}

// ---------- Load dropdowns ----------
async function loadCustomers() {
  const select = document.getElementById("customerSelect");
  const res = await fetch(`${API_BASE}/customers`);
  customersCache = await res.json();
  select.innerHTML = `<option value="">Select Customer</option>`;
  customersCache.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.id})`;
    select.appendChild(opt);
  });
}

async function loadHomestays() {
  const select = document.getElementById("homestaySelect");
  const res = await fetch(`${API_BASE}/homestays`);
  homestaysCache = await res.json();
  select.innerHTML = `<option value="">Select Homestay</option>`;
  homestaysCache.forEach(h => {
    const opt = document.createElement("option");
    opt.value = h.id;
    opt.dataset.price = Number(h.price || 0);
    opt.textContent = `${h.name} (RM${Number(h.price || 0).toFixed(2)} / night)`;
    select.appendChild(opt);
  });
}

async function loadItems() {
  const res = await fetch(`${API_BASE}/items`);
  itemsCache = await res.json();
}

function buildItemsOptionsHtml() {
  let html = `<option value="">Select Item</option>`;
  itemsCache.forEach(it => {
    html += `
      <option value="${it.itemNo}"
              data-rate="${Number(it.rate || 0)}"
              data-type="${it.rateType || "-"}">
        ${it.name} (${it.itemNo})
      </option>`;
  });
  return html;
}

// ---------- Load booking data ----------
async function loadBookingInfo() {
  const res = await fetch(`${API_BASE}/bookingEdit/${bookingId}`);
  if (!res.ok) {
    alert("Booking not found.");
    window.location.href = "bookings.html";
    return;
  }
  const b = await res.json();

  document.getElementById("customerSelect").value = b.customerId;
  document.getElementById("homestaySelect").value = b.homestayId;

  document.getElementById("checkinDate").value = b.checkIn;
  document.getElementById("checkoutDate").value = b.checkOut;

  updateNights();
}

async function loadBookingItems() {
  const tbody = document.getElementById("itemsTableBody");
  tbody.innerHTML = "";

  const res = await fetch(`${API_BASE}/bookingItem/${bookingId}`);
  if (!res.ok) {
    addItemRow();
    return;
  }

  const items = await res.json();

  if (!Array.isArray(items) || items.length === 0) {
    addItemRow();
    return;
  }

  items.forEach(it => {
    const row = createItemRow();
    tbody.appendChild(row);

    const select = row.querySelector(".itemSelect");
    const qtyInput = row.querySelector(".qtyInput");

    // ✅ THIS is what makes existing booking items display correctly
    select.value = it.itemNo;
    qtyInput.value = Number(it.usageQty || 1);

    updateItemRow(row);
  });

  updateTotals();
}

// ---------- Item row ----------
function createItemRow() {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>
      <select class="typeFilter itemSelect">
        ${buildItemsOptionsHtml()}
      </select>
    </td>
    <td class="rateType">-</td>
    <td class="rate">0.00</td>
    <td><input type="number" class="qtyInput" min="1" value="1"></td>
    <td class="subtotal">0.00</td>
    <td>
      <button type="button" class="btn-remove">
        <i class="fa-solid fa-trash"></i>
      </button>
    </td>
  `;

  const select = row.querySelector(".itemSelect");
  const qty = row.querySelector(".qtyInput");
  const removeBtn = row.querySelector(".btn-remove");

  select.addEventListener("change", () => updateItemRow(row));
  qty.addEventListener("input", () => updateItemRow(row));
  removeBtn.addEventListener("click", () => { row.remove(); updateTotals(); });

  return row;
}

function addItemRow() {
  clearError();
  const tbody = document.getElementById("itemsTableBody");
  const row = createItemRow();
  tbody.appendChild(row);
  updateItemRow(row);
}

function updateItemRow(row) {
  const select = row.querySelector(".itemSelect");
  const qtyInput = row.querySelector(".qtyInput");
  const opt = select.selectedOptions[0];

  const rate = opt ? Number(opt.dataset.rate || 0) : 0;
  const type = opt ? (opt.dataset.type || "-") : "-";

  let qty = Number(qtyInput.value || 1);
  if (qty < 1) qty = 1;

  if (type === "During Stay") {
    qty = 1;
    qtyInput.value = 1;
    qtyInput.disabled = true;
  } else {
    qtyInput.disabled = false;
    qtyInput.value = qty;
  }

  row.querySelector(".rateType").innerText = type;
  row.querySelector(".rate").innerText = rate.toFixed(2);
  row.querySelector(".subtotal").innerText = (rate * qty).toFixed(2);

  updateTotals();
}

// ---------- Totals ----------
function updateNights() {
  const inVal = document.getElementById("checkinDate").value;
  const outVal = document.getElementById("checkoutDate").value;

  if (!inVal || !outVal) {
    document.getElementById("totalNights").value = "";
    updateHomestayPrice();
    return;
  }

  const inDate = new Date(inVal);
  const outDate = new Date(outVal);

  if (!(outDate > inDate)) {
    document.getElementById("totalNights").value = "";
    updateHomestayPrice();
    return;
  }

  const nights = Math.round((outDate - inDate) / 86400000);
  document.getElementById("totalNights").value = nights;
  updateHomestayPrice();
}

function updateHomestayPrice() {
  const homestaySelect = document.getElementById("homestaySelect");
  const nights = Number(document.getElementById("totalNights").value || 0);

  const selected = homestaySelect.selectedOptions[0];
  const rate = selected ? Number(selected.dataset.price || 0) : 0;

  document.getElementById("homestayTotal").innerText = (rate * nights).toFixed(2);
  updateGrandTotal();
}

function updateTotals() {
  let total = 0;
  document.querySelectorAll("#itemsTableBody .subtotal").forEach(s => {
    total += Number(s.textContent || 0);
  });
  document.getElementById("itemsTotal").innerText = total.toFixed(2);
  updateGrandTotal();
}

function updateGrandTotal() {
  const h = Number(document.getElementById("homestayTotal").innerText || 0);
  const i = Number(document.getElementById("itemsTotal").innerText || 0);
  document.getElementById("grandTotal").innerText = (h + i).toFixed(2);
}

// ---------- Collect items ----------
function collectBookingItems() {
  const items = [];

  document.querySelectorAll("#itemsTableBody tr").forEach(row => {
    const select = row.querySelector(".itemSelect");
    const qtyInput = row.querySelector(".qtyInput");
    const subtotal = row.querySelector(".subtotal");

    const itemNo = select.value;
    if (!itemNo) return;

    items.push({
      ITEM_NO: itemNo,
      USAGE_QUANTITY: Number(qtyInput.value || 1),
      SUBTOTAL: Number(subtotal.textContent || 0)
    });
  });

  return items;
}

// ---------- Update booking ----------
async function updateBooking() {
  updateNights();
  updateTotals();

  if (!validateBookingInfo()) return;
  if (!validateBookingInfo()) return;
  if (!validateItems()) return;


  const payload = {
    CUST_ID: document.getElementById("customerSelect").value.trim(),
    HOMESTAY_ID: document.getElementById("homestaySelect").value.trim(),
    CHECKIN: document.getElementById("checkinDate").value,
    CHECKOUT: document.getElementById("checkoutDate").value,
    TOTAL_NIGHT: Number(document.getElementById("totalNights").value || 0),
    TOTAL_PRICE: Number(document.getElementById("grandTotal").innerText || 0),
    ITEMS: collectBookingItems()
  };

  const btn = document.getElementById("btnUpdate");
  btn.classList.add("disabled");

  try {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to update booking.");

    showSuccessModal(`Booking updated!\nBooking ID: ${bookingId}`);
  } catch (err) {
    console.error(err);
    showError(err.message);
  } finally {
    btn.classList.remove("disabled");
  }
}

// ---------- Modal ----------
function showSuccessModal(text) {
  const modal = document.getElementById("alertModal");
  const message = document.getElementById("alertMessage");
  modal.style.display = "block";
  message.textContent = text;

  document.getElementById("okBtn").onclick = () => window.location.href = "bookings.html";
  document.querySelector(".close-btn").onclick = () => window.location.href = "bookings.html";

  window.onclick = function (event) {
    if (event.target === modal) modal.style.display = "none";
  };
}

function validateItems() {
  const rows = document.querySelectorAll("#itemsTableBody tr");
  const chosen = [];

  for (const row of rows) {
    const select = row.querySelector(".itemSelect");
    const qty = row.querySelector(".qtyInput");

    // if user added a row, it must not be blank
    if (!select.value) {
      markInvalid(select, true);
      showError("Please select an item for every item row, or remove the empty row.");
      return false;
    } else {
      markInvalid(select, false);
    }

    const q = Number(qty.value || 0);
    if (q <= 0) {
      markInvalid(qty, true);
      showError("Item quantity must be at least 1.");
      return false;
    } else {
      markInvalid(qty, false);
    }

    chosen.push(select.value);
  }

  // prevent duplicates (because BOOKINGITEM PK is (BOOKING_ID, ITEM_NO))
  const set = new Set(chosen);
  if (set.size !== chosen.length) {
    showError("Duplicate item detected. Please choose each item only once.");
    return false;
  }

  return true;
}

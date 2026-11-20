// =======================
// Config
// =======================
const API_BASE = "http://localhost:3000/api";

let customersCache = [];
let homestaysCache = [];
let itemsCache = [];

// =======================
// Init
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  // Wire events
  document.getElementById("btnAddItem").addEventListener("click", addItemRow);
  document.getElementById("btnCreate").addEventListener("click", addBooking);

  document.getElementById("checkin").addEventListener("change", updateNights);
  document.getElementById("checkout").addEventListener("change", updateNights);
  document.getElementById("homestay").addEventListener("change", () => {
    updateHomestayPrice();
  });

  // Load dropdown data
  await Promise.all([
    loadCustomers(),
    loadHomestays(),
    loadItems()
  ]);
  
  updateTotals();
  updateGrandTotal();
});

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

// =======================
// Load dropdowns from backend
// =======================
async function loadCustomers() {
  const select = document.getElementById("customer");
  try {
    const res = await fetch(`${API_BASE}/customers`);
    if (!res.ok) throw new Error(await res.text());
    customersCache = await res.json();

    select.innerHTML = `<option value="">Select Customer</option>`;
    customersCache.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;                // CUST_ID
      opt.textContent = `${c.name} (${c.id})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    select.innerHTML = `<option value="">Failed to load customers</option>`;
  }
}

async function loadHomestays() {
  const select = document.getElementById("homestay");
  try {
    const res = await fetch(`${API_BASE}/homestays`);
    if (!res.ok) throw new Error(await res.text());
    homestaysCache = await res.json();

    select.innerHTML = `<option value="">Select Homestay</option>`;
    homestaysCache.forEach(h => {
      // If you want only AVAILABLE homestays:
      // if (String(h.status).toUpperCase() !== "AVAILABLE") return;

      const opt = document.createElement("option");
      opt.value = h.id; // HOMESTAY_ID
      opt.dataset.price = Number(h.price || 0); // PRICE_RATE
      opt.textContent = `${h.name} (RM${Number(h.price || 0).toFixed(2)} / night)`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    select.innerHTML = `<option value="">Failed to load homestays</option>`;
  }
}

async function loadItems() {
  try {
    const res = await fetch(`${API_BASE}/items`);
    if (!res.ok) throw new Error(await res.text());
    itemsCache = await res.json();
  } catch (err) {
    console.error(err);
    itemsCache = [];
  }
}

// =======================
// Homestay calculation
// =======================
function updateNights() {
  clearError();

  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");

  const inVal = checkinEl.value;
  const outVal = checkoutEl.value;

  if (!inVal || !outVal) {
    document.getElementById("nights").value = "";
    updateHomestayPrice();
    return;
  }

  const inDate = new Date(inVal);
  const outDate = new Date(outVal);

  if (!(outDate > inDate)) {
    document.getElementById("nights").value = "";
    updateHomestayPrice();
    return;
  }

  const nights = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
  document.getElementById("nights").value = nights;
  updateHomestayPrice();
}

function updateHomestayPrice() {
  const homestaySelect = document.getElementById("homestay");
  const nights = Number(document.getElementById("nights").value || 0);

  const selected = homestaySelect.selectedOptions[0];
  const rate = selected ? Number(selected.dataset.price || 0) : 0;

  document.getElementById("homestayTotal").innerText = (rate * nights).toFixed(2);
  updateGrandTotal();
}

// =======================
// Item handling
// =======================
function buildItemsOptionsHtml() {
  if (!itemsCache || itemsCache.length === 0) {
    return `<option value="">No items found</option>`;
  }

  let html = `<option value="">Select Item</option>`;

  itemsCache.forEach(it => {
    // If you want only ACTIVE/AVAILABLE items:
    // if (String(it.status).toUpperCase() !== "AVAILABLE") return;

    const rate = Number(it.rate || 0);
    const type = it.rateType || "-";
    html += `
      <option value="${it.itemNo}"
              data-itemno="${it.itemNo}"
              data-rate="${rate}"
              data-type="${type}">
        ${it.name} (${it.itemNo})
      </option>`;
  });

  return html;
}

function addItemRow() {
  clearError();

  const tbody = document.querySelector("#itemsTable tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <select class="typeFilter itemSelect">
        ${buildItemsOptionsHtml()}
      </select>
    </td>
    <td class="rateType">-</td>
    <td class="rate">0.00</td>
    <td>
      <input type="number" class="qtyInput" min="1" value="1">
    </td>
    <td class="subtotal">0.00</td>
    <td>
      <button class="btn-remove" type="button">
        <i class="fa-solid fa-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(row);

  // Wire row events
  const select = row.querySelector(".itemSelect");
  const qty = row.querySelector(".qtyInput");
  const removeBtn = row.querySelector(".btn-remove");

  select.addEventListener("change", () => updateItemRow(row));
  qty.addEventListener("input", () => updateItemRow(row));
  removeBtn.addEventListener("click", () => {
    row.remove();
    updateTotals();
  });

  // Ensure totals updated
  updateItemRow(row);
}

function updateItemRow(row) {
  const select = row.querySelector(".itemSelect");
  const qtyInput = row.querySelector(".qtyInput");

  const selectedOption = select.selectedOptions[0];

  const rate = selectedOption ? Number(selectedOption.dataset.rate || 0) : 0;
  const type = selectedOption ? (selectedOption.dataset.type || "-") : "-";

  let qty = Number(qtyInput.value || 1);
  if (qty < 1) qty = 1;

  // 🔒 During Stay rule: force qty = 1 and disable
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

function updateTotals() {
  let itemsTotal = 0;

  document.querySelectorAll("#itemsTable tbody tr").forEach(tr => {
    const subtotalCell = tr.querySelector(".subtotal");
    itemsTotal += Number(subtotalCell ? subtotalCell.textContent : 0);
  });

  document.getElementById("itemsTotal").innerText = itemsTotal.toFixed(2);
  updateGrandTotal();
}

function updateGrandTotal() {
  const homestay = Number(document.getElementById("homestayTotal").innerText || 0);
  const items = Number(document.getElementById("itemsTotal").innerText || 0);
  document.getElementById("grandTotal").innerText = (homestay + items).toFixed(2);
}

// =======================
// Create booking (POST)
// =======================
function collectBookingItems() {
  const rows = document.querySelectorAll("#itemsTable tbody tr");
  const items = [];

  rows.forEach(tr => {
    const select = tr.querySelector(".itemSelect");
    const qtyInput = tr.querySelector(".qtyInput");
    const rateCell = tr.querySelector(".rate");
    const subtotalCell = tr.querySelector(".subtotal");

    const itemNo = select.value;
    if (!itemNo) return; // skip empty rows

    const qty = Number(qtyInput.value || 1);
    const rate = Number(rateCell.textContent || 0);
    const subtotal = Number(subtotalCell.textContent || 0);

    items.push({
      ITEM_NO: itemNo,
      USAGE_QUANTITY: qty,
      SUBTOTAL: subtotal,
      ITEM_RATE: rate
    });
  });

  return items;
}

async function addBooking() {
  // Force calculate nights and totals before validating
  updateNights();
  updateHomestayPrice();
  updateTotals();
  updateGrandTotal();

  // ✅ Validate Booking Information section
  if (!validateBookingInfo()) return;

  // Read values after validation
  const custId = document.getElementById("customer").value.trim();
  const homestayId = document.getElementById("homestay").value.trim();
  const checkin = document.getElementById("checkin").value;
  const checkout = document.getElementById("checkout").value;
  const totalNight = Number(document.getElementById("nights").value || 0);

  const items = collectBookingItems();

  const homestayTotal = Number(document.getElementById("homestayTotal").innerText || 0);
  const itemsTotal = Number(document.getElementById("itemsTotal").innerText || 0);
  const grandTotal = Number(document.getElementById("grandTotal").innerText || 0);

  const payload = {
    CUST_ID: custId,
    HOMESTAY_ID: homestayId,
    CHECKIN: checkin,
    CHECKOUT: checkout,
    TOTAL_NIGHT: totalNight,
    HOMESTAY_TOTAL: homestayTotal,
    ITEMS_TOTAL: itemsTotal,
    TOTAL_PRICE: grandTotal,
    PAY_STATUS: "PENDING",
    ITEMS: items
  };

  const btn = document.getElementById("btnCreate");
  btn.classList.add("disabled");

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to create booking.");
    }

    showSuccessModal(`Booking created!\nBooking ID: ${data.bookingId}\nPayment ID: ${data.payId}`);

  } catch (err) {
    console.error(err);
    showError(err.message);
  } finally {
    btn.classList.remove("disabled");
  }
}


// =======================
// Modal
// =======================
function showSuccessModal(text) {
  const modal = document.getElementById("alertModal");
  const message = document.getElementById("alertMessage");

  modal.style.display = "block";
  message.textContent = text;

  document.getElementById("okBtn").onclick = function () {
    window.location.href = "bookings.html";
  };

  document.querySelector(".close-btn").onclick = function () {
    window.location.href = "bookings.html";
  };

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}


function markInvalid(el, isInvalid) {
  if (!el) return;
  el.style.border = isInvalid ? "2px solid #c0392b" : "";
}

function validateBookingInfo() {
  clearError();

  const customerEl = document.getElementById("customer");
  const homestayEl = document.getElementById("homestay");
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");
  const nightsEl = document.getElementById("nights");

  const custId = customerEl.value.trim();
  const homestayId = homestayEl.value.trim();
  const checkin = checkinEl.value;
  const checkout = checkoutEl.value;
  const totalNight = Number(nightsEl.value || 0);

  // Reset borders first
  [customerEl, homestayEl, checkinEl, checkoutEl].forEach(el => markInvalid(el, false));

  const missing = [];

  if (!custId) {
    missing.push("Customer");
    markInvalid(customerEl, true);
  }
  if (!homestayId) {
    missing.push("Homestay");
    markInvalid(homestayEl, true);
  }
  if (!checkin) {
    missing.push("Check-in date");
    markInvalid(checkinEl, true);
  }
  if (!checkout) {
    missing.push("Check-out date");
    markInvalid(checkoutEl, true);
  }

  // Date logic
  if (checkin && checkout) {
    const inDate = new Date(checkin);
    const outDate = new Date(checkout);
    if (!(outDate > inDate) || totalNight <= 0) {
      markInvalid(checkinEl, true);
      markInvalid(checkoutEl, true);
      showError("Check-out date must be after check-in date.");
      return false;
    }
  }

  if (missing.length > 0) {
    showError(`Please fill in: ${missing.join(", ")}.`);
    return false;
  }

  return true;
}

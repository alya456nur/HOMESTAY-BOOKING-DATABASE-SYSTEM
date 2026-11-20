const API_BASE = "http://localhost:3000/api";
const urlParams = new URLSearchParams(window.location.search);
const payId = (urlParams.get("id") || "").trim().toUpperCase();

let loadedPayment = null;

window.onload = async function () {
  if (!payId) {
    alert("Missing payment id in URL.");
    window.location.href = "payments.html";
    return;
  }

  try {
    // load employees first
    await loadEmployees();

    // load payment
    const res = await fetch(`${API_BASE}/payment/${payId}`);
    if (!res.ok) throw new Error("Payment not found");
    const payment = await res.json();
    loadedPayment = payment;

    document.getElementById("payId").value = payment.id;
    document.getElementById("bookingId").value = payment.bookingId;
    document.getElementById("totalPrice").value = payment.totalPrice;

    document.getElementById("payStatus").value =
      String(payment.status || "PENDING").toUpperCase();

    document.getElementById("payDate").value =
      payment.paymentDate ? String(payment.paymentDate).split("T")[0] : "";

    document.getElementById("payMethod").value =
      payment.method ? payment.method : "E-WALLET";

    // select employee (if exists)
    if (payment.empId) {
      document.getElementById("employee").value = String(payment.empId).trim().toUpperCase();
    } else {
      document.getElementById("employee").value = "";
    }

  } catch (err) {
    alert("Failed to load payment: " + err.message);
    console.error(err);
  }
};

async function loadEmployees() {
  const select = document.getElementById("employee");
  select.innerHTML = `<option value="">Select an employee</option>`;

  const res = await fetch(`${API_BASE}/employees`);
  if (!res.ok) throw new Error("Failed to load employees");

  const employees = await res.json();

  employees.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.id;                 // EMP_ID
    opt.textContent = `${e.name} (${e.id})`;
    select.appendChild(opt);
  });
}

async function savePayment() {
  const empId = (document.getElementById("employee").value || "").trim().toUpperCase();
  const payStatus = (document.getElementById("payStatus").value || "").trim().toUpperCase();
  const payDate = (document.getElementById("payDate").value || "").trim();
  const payMethod = (document.getElementById("payMethod").value || "").trim().toUpperCase();

  if (!empId) return showModal("Please select an employee.");
  if (!payStatus) return showModal("Payment status is required.");
  if (!payMethod) return showModal("Payment method is required.");

  if (payStatus === "PAID" && !payDate) {
    return showModal("Payment date is required when status is PAID.");
  }

  try {
    const res = await fetch(`${API_BASE}/paymentUpdate/${payId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        EMP_ID: empId,
        PAY_STATUS: payStatus,
        PAYMENT_DATE: payDate,      // can be "" when pending (backend handles null)
        PAYMENT_METHOD: payMethod
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to update payment");

    showModal("Payment details saved successfully!", "payments.html");

  } catch (err) {
    console.error(err);
    showModal("Update failed: " + err.message);
  }
}

// Modal helper
function showModal(msg, redirectUrl) {
  const modal = document.getElementById("alertModal");
  const message = document.getElementById("alertMessage");

  modal.style.display = "block";
  message.textContent = msg;

  document.getElementById("okBtn").onclick = () => {
    modal.style.display = "none";
    if (redirectUrl) window.location.href = redirectUrl;
  };

  document.querySelector(".close-btn").onclick = () => {
    modal.style.display = "none";
    if (redirectUrl) window.location.href = redirectUrl;
  };

  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = "none";
  };
}

function resetForm() {
  document.getElementById("editPaymentForm").reset();
}

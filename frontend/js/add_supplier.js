const API_BASE = "http://localhost:3000/api";

/* =========================
   Helpers
========================= */
function openAlert(message) {
  const modal = document.getElementById("alertModal");
  const messageEl = document.getElementById("alertMessage");
  const okBtn = document.getElementById("okBtn");
  const closeBtn = modal.querySelector(".close-btn");

  messageEl.textContent = message;
  modal.style.display = "block";

  okBtn.onclick = () => (modal.style.display = "none");
  closeBtn.onclick = () => (modal.style.display = "none");

  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = "none";
  };
}

function openAlertAndRedirect(message, redirectTo) {
  const modal = document.getElementById("alertModal");
  const messageEl = document.getElementById("alertMessage");
  const okBtn = document.getElementById("okBtn");
  const closeBtn = modal.querySelector(".close-btn");

  messageEl.textContent = message;
  modal.style.display = "block";

  const goNext = () => (window.location.href = redirectTo);

  okBtn.onclick = goNext;
  closeBtn.onclick = goNext;

  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = "none";
  };
}

// Simple but solid email format check
function isValidEmail(email) {
  // accepts: name@domain.com, name.something@domain.co, etc.
  // rejects: missing @, missing domain, spaces, etc.
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(email);
}

/* =========================
   Main
========================= */
async function addSupplier() {
  const name = document.getElementById("suppName").value.trim();
  const phone = document.getElementById("suppPhone").value.trim();
  const email = document.getElementById("suppEmail").value.trim();
  const address = document.getElementById("suppAddress").value.trim();

  // basic required checks
  if (!name || !phone || !email || !address) {
    openAlert("All fields are required!");
    return;
  }

  // email format check
  if (!isValidEmail(email)) {
    openAlert("Invalid email format. Example: supplier@email.com");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SUPP_NAME: name,
        SUPP_PHONE: phone,
        SUPP_EMAIL: email,
        SUPP_ADDRESS: address
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      // server message preferred
      const msg = data.error || data.message || "Failed to add supplier.";
      openAlert(msg);
      return;
    }

    openAlertAndRedirect("Supplier added successfully!", "suppliers.html");

  } catch (err) {
    console.error(err);
    openAlert("Error adding supplier: " + err.message);
  }
}

function resetForm() {
  document.getElementById("addSupplierForm").reset();
}

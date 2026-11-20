// =======================
// Alert Modal
// =======================
function showAlert(message, isSuccess = true) {
  const modal = document.getElementById("alertModal");
  const messageEl = document.getElementById("alertMessage");
  const okBtn = document.getElementById("okBtn");
  const closeBtn = document.querySelector(".close-btn");

  messageEl.textContent = message;
  messageEl.style.color = isSuccess ? "#28a745" : "#dc3545";

  modal.style.display = "block";

  const closeAndMaybeRedirect = () => {
    modal.style.display = "none";
    if (isSuccess) window.location.href = "homestays.html";
  };

  closeBtn.onclick = closeAndMaybeRedirect;
  okBtn.onclick = closeAndMaybeRedirect;

  window.onclick = function (event) {
    if (event.target === modal) closeAndMaybeRedirect();
  };
}

// =======================
// Load Homestay
// =======================
async function loadHomestayData() {
  const urlParams = new URLSearchParams(window.location.search);
  const homestayId = (urlParams.get("id") || "").trim().toUpperCase();

  if (!homestayId) {
    showAlert("No homestay ID provided!", false);
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/homestays/${homestayId}`);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Homestay not found");
    }

    const homestay = await response.json();

    document.getElementById("homestayID").value = homestay.id;
    document.getElementById("homestayName").value = homestay.name || "";
    document.getElementById("homestayDesc").value = homestay.description || "";
    document.getElementById("homestayRate").value = Number(homestay.price || 0).toFixed(2);
    document.getElementById("homestayStatus").value = (homestay.status || "AVAILABLE").toUpperCase();

    document.querySelector(".top-header h1").textContent = `Edit Homestay - ${homestay.name}`;

  } catch (error) {
    console.error("Error loading homestay:", error);
    showAlert("Error loading homestay: " + error.message, false);
  }
}

// =======================
// Save Homestay
// =======================
async function saveHomestay() {
  const homestayId = (document.getElementById("homestayID").value || "").trim().toUpperCase();
  const homestayName = document.getElementById("homestayName").value.trim();
  const homestayDesc = document.getElementById("homestayDesc").value.trim(); // can be empty
  const homestayRateRaw = document.getElementById("homestayRate").value.trim();
  const homestayStatus = (document.getElementById("homestayStatus").value || "").trim().toUpperCase();

  if (!homestayId) return showAlert("Missing homestay ID.", false);
  if (!homestayName) return showAlert("Homestay name is required!", false);

  const rate = Number(homestayRateRaw);
  if (!homestayRateRaw || Number.isNaN(rate) || rate <= 0) {
    return showAlert("Please enter a valid price rate (must be > 0)!", false);
  }

  if (!homestayStatus) return showAlert("Status is required!", false);

  const homestayData = {
    HOMESTAY_NAME: homestayName,
    DESCRIPTIONS: homestayDesc,     // allow empty
    PRICE_RATE: rate,
    STATUS: homestayStatus
  };

  try {
    const response = await fetch(`http://localhost:3000/api/homestays/${homestayId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(homestayData)
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      showAlert("Homestay updated successfully!");
    } else {
      showAlert("Failed to update homestay: " + (result.error || "Unknown error"), false);
    }

  } catch (error) {
    console.error("Error updating homestay:", error);
    showAlert("Error updating homestay: " + error.message, false);
  }
}

// =======================
// Reset
// =======================
function resetForm() {
  if (confirm("Are you sure you want to reset all changes?")) {
    loadHomestayData();
  }
}

// =======================
// Init
// =======================
document.addEventListener("DOMContentLoaded", function () {
  loadHomestayData();

  document.getElementById("editHomestayForm").addEventListener("submit", function (e) {
    e.preventDefault();
    saveHomestay();
  });
});

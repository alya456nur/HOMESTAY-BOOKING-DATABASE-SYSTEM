// Get ID from URL query string
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get('id');

// Populate form on page load
window.onload = async function() {
    if (!bookingId) return;
    try {
        const res = await fetch(`http://localhost:3000/api/bookingView/${bookingId}`);
        if (!res.ok) throw new Error("Single booking not found");
        const booking = await res.json();

        document.getElementById('customerName').textContent = booking.customerName;
        document.getElementById('homestayName').textContent = booking.homestayName;
        document.getElementById('checkIn').value =
            booking.checkIn ? booking.checkIn.split('T')[0] : "";
        document.getElementById('checkOut').value =
            booking.checkOut ? booking.checkOut.split('T')[0] : "";
        document.getElementById('totalNight').value = booking.totalNight;

        document.getElementById('homestayTotal').textContent = `RM ${booking.homestayTotal}`;
        document.getElementById('itemsTotal').textContent = `RM ${booking.subTotal.toFixed(2)}`;
        document.getElementById('grandTotal').textContent = `RM ${booking.totalPrice.toFixed(2)}`;
        
    } catch (err) {
        alert("Failed to load booking: " + err.message);
        console.error(err);
    }

    // Populate the table
    const res = await fetch(`http://localhost:3000/api/bookingItem/${bookingId}`);
    if (!res.ok) throw new Error("Booking item not found");

    const items = await res.json();
    const tbody = document.getElementById('bookingItems');
    tbody.innerHTML = "";

    items.forEach((item, index) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${item.itemName}</td>
            <td>${item.rateType}</td>
            <td>RM ${Number(item.itemRate).toFixed(2)}</td>
            <td>${item.usageQty}</td>
            <td>RM ${Number(item.subTotal).toFixed(2)}</td>
        `;

        tbody.appendChild(tr);
    });

};

function savePayment() {
    const modal = document.getElementById("alertModal");
    const message = document.getElementById("alertMessage");

    message.textContent = "Payment details saved successfully!";
    modal.style.display = "block";

    document.getElementById("okBtn").onclick = closeModal;
    document.querySelector(".close-btn").onclick = closeModal;

    window.onclick = function (event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    function closeModal() {
        modal.style.display = "none";
    }
}

// Date format to DD/MM/YYYY
function formatDate(dateStr) {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function resetForm() {
    document.getElementById("editPaymentForm").reset();
}

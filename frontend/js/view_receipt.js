// Get ID from URL query string
const urlParams = new URLSearchParams(window.location.search);
const receiptNo = urlParams.get('id');

// Populate form on page load
window.onload = async function() {
    if (!receiptNo) return;
    try {
        const res = await fetch(`http://localhost:3000/api/receipt/${receiptNo}`);
        if (!res.ok) throw new Error("Receipt not found");
        const receipt = await res.json();

        document.getElementById('receiptNumber').textContent = receipt.id;
        document.getElementById('receiptDate').textContent = formatDate(receipt.rDate);
        document.getElementById('paymentStatus').textContent = receipt.rStatus;

        document.getElementById('customerName').textContent = receipt.rCustomerName;
        document.getElementById('customerPhone').textContent = receipt.rCustomerPhone;
        document.getElementById('bookingId').textContent = receipt.rBookingId;

        document.getElementById('checkinDate').textContent = formatDate(receipt.rCheckinDate);
        document.getElementById('checkoutDate').textContent = formatDate(receipt.rCheckoutDate);
        document.getElementById('nights').textContent = receipt.rNight;

        document.getElementById('paymentId').textContent = receipt.rPaymentId;
        document.getElementById('paymentMethod').textContent = receipt.rPaymentMethod;
        document.getElementById('paymentDate').textContent = formatDate(receipt.rPaymentDate);

        document.getElementById('totalAmount').textContent = `RM ${Number(receipt.rTotalAmount).toFixed(2)}`;
        
    } catch (err) {
        alert("Failed to load receipt: " + err.message);
        console.error(err);
    }

    // Populate the table
    const res = await fetch(`http://localhost:3000/api/receiptBooking/${receiptNo}`);
    if (!res.ok) throw new Error("Receipt booking item not found");

    const items = await res.json();
    const tbody = document.getElementById('itemizedCharges');
    tbody.innerHTML = "";

    items.forEach((item, index) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${index + 1}</td>
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

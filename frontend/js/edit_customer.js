// Get ID from URL query string
const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

// Populate form on page load
window.onload = async function() {
    if (!custId) return;
    try {
        const res = await fetch(`http://localhost:3000/api/customers/${custId}`);
        if (!res.ok) throw new Error("Customer not found");
        const customer = await res.json();

        document.getElementById("custFName").value = customer.fname;
        document.getElementById("custLName").value = customer.lname;
        document.getElementById("custPhone").value = customer.phone;

    } catch (err) {
        alert("Failed to load customer: " + err.message);
        console.error(err);
    }
};

// Save updated customer
async function saveCustomer() {
    const fName = document.getElementById("custFName").value.trim();
    const lName = document.getElementById("custLName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();

    if (!fName || !lName || !phone) {
        // Show modal
        const modal = document.getElementById("alertModal");
        const message = document.getElementById("alertMessage");
        modal.style.display = "block";
        message.textContent = "All fields are required!";

        document.getElementById("okBtn").onclick = function () {
            modal.style.display = "none";
        };

        document.querySelector(".close-btn").onclick = function () {
            modal.style.display = "none";
        };
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/customers/${custId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ CUST_FNAME: fName, CUST_LNAME: lName, CUST_PHONE: phone })
        });
        const data = await res.json();

        if (data.success) {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");

            modal.style.display = "block";
            message.textContent = "Customer updated successfully!";

            document.getElementById("okBtn").onclick = () => window.location.href = "customers.html";
            document.querySelector(".close-btn").onclick = () => window.location.href = "customers.html";

        } else {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");
            modal.style.display = "block";
            message.textContent = "Update failed: " + data.error;

            document.getElementById("okBtn").onclick = function () {
                modal.style.display = "none";
            };

            document.querySelector(".close-btn").onclick = function () {
                modal.style.display = "none";
            };
        }
    } catch (err) {
        // Show modal
        const modal = document.getElementById("alertModal");
        const message = document.getElementById("alertMessage");
        modal.style.display = "block";
        message.textContent = "Failed to update customer";

        document.getElementById("okBtn").onclick = function () {
            modal.style.display = "none";
        };

        document.querySelector(".close-btn").onclick = function () {
            modal.style.display = "none";
        };
        console.error(err);
    }
}

function resetForm() {
    document.getElementById("editCustomerForm").reset();
}

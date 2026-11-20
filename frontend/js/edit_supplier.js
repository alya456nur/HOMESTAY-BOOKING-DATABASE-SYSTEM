// Get supplier ID from URL
const urlParams = new URLSearchParams(window.location.search);
const supplierId = urlParams.get('id');

// Populate form on page load
window.onload = async function() {
    if (!supplierId) return;

    try {
        const res = await fetch(`http://localhost:3000/api/suppliers/${supplierId}`);
        if (!res.ok) throw new Error("Supplier not found");
        const supplier = await res.json();

        document.getElementById("suppId").value = supplier.id;
        document.getElementById("suppName").value = supplier.name;
        document.getElementById("suppPhone").value = supplier.phone;
        document.getElementById("suppEmail").value = supplier.email;
        document.getElementById("suppAddress").value = supplier.address;

    } catch (err) {
        alert("Failed to load supplier: " + err.message);
        console.error(err);
    }
};

// Save updated supplier
async function saveSupplier() {
    const name = document.getElementById("suppName").value.trim();
    const phone = document.getElementById("suppPhone").value.trim();
    const email = document.getElementById("suppEmail").value.trim();
    const address = document.getElementById("suppAddress").value.trim();

    if (!name || !phone || !email || !address) {
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
        const res = await fetch(`http://localhost:3000/api/suppliers/${supplierId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                SUPP_NAME: name,
                SUPP_PHONE: phone,
                SUPP_EMAIL: email,
                SUPP_ADDRESS: address
            })
        });

        const data = await res.json();
        if (data.success) {
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");
            modal.style.display = "block";
            message.textContent = "Supplier details saved successfully!";
            document.getElementById("okBtn").onclick = () => window.location.href = "suppliers.html";
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
        message.textContent = "Failed to update supplier";

        document.getElementById("okBtn").onclick = function () {
            modal.style.display = "none";
        };

        document.querySelector(".close-btn").onclick = function () {
            modal.style.display = "none";
        };
        console.error(err);
    }
}

// Reset form
function resetForm() {
    window.onload(); // reload data to reset form
}

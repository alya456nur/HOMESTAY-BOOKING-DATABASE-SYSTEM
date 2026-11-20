function addCustomer() {
    const fName = document.getElementById("custFName").value.trim();
    const lName = document.getElementById("custLName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();

    // Validation: check if any field is blank
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

    // Prepare data
    const customerData = {
        CUST_FNAME: fName,
        CUST_LNAME: lName,
        CUST_PHONE: phone
    };

    // Send POST request to backend
    fetch("http://localhost:3000/api/customers", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(customerData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");

            modal.style.display = "block";
            message.textContent = "Customer added successfully!";

            document.getElementById("okBtn").onclick = function () {
                window.location.href = "customers.html";
            };

            document.querySelector(".close-btn").onclick = function () {
                window.location.href = "customers.html";
            };

            window.onclick = function (event) {
                if (event.target === modal) {
                    modal.style.display = "none";
                }
            };

            resetForm();
        } else {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");
            modal.style.display = "block";
            message.textContent = "Error: " + data.error;

            document.getElementById("okBtn").onclick = function () {
                modal.style.display = "none";
            };

            document.querySelector(".close-btn").onclick = function () {
                modal.style.display = "none";
            };
        }
    })
    .catch(err => {
        console.error(err);
        // Show modal
        const modal = document.getElementById("alertModal");
        const message = document.getElementById("alertMessage");
        modal.style.display = "block";
        message.textContent = "Failed to add customer";

        document.getElementById("okBtn").onclick = function () {
            modal.style.display = "none";
        };

        document.querySelector(".close-btn").onclick = function () {
            modal.style.display = "none";
        };
    });
}

function resetForm() {
    document.getElementById("addCustomerForm").reset();
}

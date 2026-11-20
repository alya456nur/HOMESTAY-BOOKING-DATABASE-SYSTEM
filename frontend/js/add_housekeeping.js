document.addEventListener("DOMContentLoaded", () => {
    fetchHomestays();
    fetchEmployees();
});

// Fetch and display homestay on the dropdown
async function fetchHomestays() {
    try {
        const res = await fetch("http://localhost:3000/api/homestays");
        const homestays = await res.json();

        const select = document.querySelector("#homestayDropdown");

        homestays.forEach(h => {
            const option = document.createElement('option');
            option.value = h.id; // id as value
            option.textContent = h.name;  // display name in dropdown
            select.appendChild(option);
        });

    } catch (err) {
        console.error("Error fetching homestays:", err);
    }
}

// Fetch and display employee on the dropdown
async function fetchEmployees() {
    try {
        const res = await fetch("http://localhost:3000/api/employees");
        const employees = await res.json();

        const select = document.querySelector("#empDropdown");

        employees.forEach(e => {
            const option = document.createElement('option');
            option.value = e.id; // id as value
            option.textContent = e.name;  // display name in dropdown
            select.appendChild(option);
        });

    } catch (err) {
        console.error("Error fetching employees:", err);
    }
}

function addHousekeeping() {
    const hID = document.getElementById("homestayDropdown").value;
    const empID = document.getElementById("empDropdown").value;
    const hDate = formatDateToDDMMYYYY(document.getElementById("housekeepingDate").value);

    // Validation: check if any field is blank
    if (!hID || !empID || !hDate) {
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
    const housekeepingData = {
        HOMESTAY_ID: hID,
        EMP_ID: empID,
        HK_DATE: hDate
    };

    // Send POST request to backend
    fetch("http://localhost:3000/api/housekeeping", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(housekeepingData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");

            modal.style.display = "block";
            message.textContent = "Housekeeping scheduled successfully!";

            document.getElementById("okBtn").onclick = function () {
                window.location.href = "housekeeping.html";
            };

            document.querySelector(".close-btn").onclick = function () {
                window.location.href = "housekeeping.html";
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
        message.textContent = "Failed to schedule housekeeping";

        document.getElementById("okBtn").onclick = function () {
            modal.style.display = "none";
        };

        document.querySelector(".close-btn").onclick = function () {
            modal.style.display = "none";
        };
    });
}

// Date format to DD/MM/YYYY
function formatDateToDDMMYYYY(dateStr) {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function resetForm() {
    document.getElementById("addHousekeepingForm").reset();
}

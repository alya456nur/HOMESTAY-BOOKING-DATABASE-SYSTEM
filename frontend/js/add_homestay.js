function addHomestay() {
    const modal = document.getElementById("alertModal");
    const message = document.getElementById("alertMessage");

    message.textContent = "Homestay added successfully!";
    modal.style.display = "block";

    document.getElementById("okBtn").onclick = () => window.location.href = "homestays.html";
    document.querySelector(".close-btn").onclick = () => window.location.href = "homestays.html";

    window.onclick = function (event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    function closeModal() {
        modal.style.display = "none";
    }
}

function addHomestay() {
    const hName = document.getElementById("homestayName").value.trim();
    const hDesc = document.getElementById("homestayDesc").value.trim();
    const hRate = parseFloat(document.getElementById("homestayRate").value.trim());
    const hStatus = document.getElementById("homestayStatus").value.trim();

    // Validation: check if any field is blank
    if (!hName || !hDesc || !hRate || !hStatus) {
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
    const homestayData = {
        HOMESTAY_NAME: hName,
        PRICE_RATE: hRate,
        DESCRIPTIONS: hDesc,
        STATUS: hStatus
    };

    // Send POST request to backend
    fetch("http://localhost:3000/api/homestays", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(homestayData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");

            modal.style.display = "block";
            message.textContent = "Homestay added successfully!";

            document.getElementById("okBtn").onclick = function () {
                window.location.href = "homestays.html";
            };

            document.querySelector(".close-btn").onclick = function () {
                window.location.href = "homestays.html";
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
        message.textContent = "Failed to add homestay";

        document.getElementById("okBtn").onclick = function () {
            modal.style.display = "none";
        };

        document.querySelector(".close-btn").onclick = function () {
            modal.style.display = "none";
        };
    });
}

function resetForm() {
    document.getElementById("addHomestayForm").reset();
}

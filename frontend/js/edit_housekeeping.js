document.addEventListener("DOMContentLoaded", loadHousekeeping);

function loadHousekeeping() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        alert("No housekeeping ID in URL");
        return;
    }

    fetch(`http://localhost:3000/api/housekeeping/${id}`)
        .then(res => res.json())
        .then(data => {
            console.log("Loaded:", data);

            document.getElementById("homestay").value = data.homestay;
            document.getElementById("employee").value = data.employee;
            document.getElementById("hk_date").value =
                new Date(data.hk_date).toISOString().split("T")[0];
            document.getElementById("status").value = data.status;
        })
        .catch(err => {
            console.error(err);
            alert("Failed to load housekeeping data");
        });
}

function saveHousekeeping() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const payload = {
        HK_DATE: document.getElementById("hk_date").value,
        STATUS: document.getElementById("status").value
    };

    fetch(`http://localhost:3000/api/housekeeping/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById("alertModal").style.display = "block";
    })
    .catch(err => {
        console.error(err);
        alert("Failed to save housekeeping");
    });
}

function resetForm() {
    document.getElementById("editHousekeepingForm").reset();
}

function closeModal() {
    document.getElementById("alertModal").style.display = "none";
}

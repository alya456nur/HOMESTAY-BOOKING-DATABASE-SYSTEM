window.onload = async function() {
    // Fetch suppliers
    const supRes = await fetch("http://localhost:3000/api/suppliers");
    const suppliers = await supRes.json();

    const suppSelect = document.getElementById("itemSupplier");
    suppSelect.innerHTML = `<option value="">Select supplier</option>`;
    suppliers.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        suppSelect.appendChild(opt);
    });
};

async function addItem() {
    const itemName = document.getElementById("itemName").value.trim();
    const itemType = document.getElementById("itemType").value;
    const itemDesc = document.getElementById("itemDesc").value.trim();
    const rateType = document.getElementById("rateType").value;
    const itemRate = document.getElementById("itemRate").value;
    const itemStatus = document.getElementById("itemStatus").value;
    const suppId = document.getElementById("itemSupplier").value;

    if (!itemName || !itemType || !itemDesc || !rateType || !itemRate || !itemStatus || !suppId) {
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
        const res = await fetch("http://localhost:3000/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ITEM_NAME: itemName,
                ITEM_TYPE: itemType,
                ITEM_DESC: itemDesc,
                RATE_TYPE: rateType,
                ITEM_RATE: itemRate,
                ITEM_STATUS: itemStatus,
                SUPP_ID: suppId
            })
        });

        const result = await res.json();
        if (result.success) {
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");
            message.textContent = "Item added successfully!";
            modal.style.display = "block";

            document.getElementById("okBtn").onclick = () => window.location.href = "items.html";
            document.querySelector(".close-btn").onclick = () => window.location.href = "items.html";
        } else {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");
            modal.style.display = "block";
            message.textContent = "Error adding item: " + result.error;

            document.getElementById("okBtn").onclick = function () {
                modal.style.display = "none";
            };

            document.querySelector(".close-btn").onclick = function () {
                modal.style.display = "none";
            };
        }
    } catch (err) {
        console.error(err);
        // Show modal
        const modal = document.getElementById("alertModal");
        const message = document.getElementById("alertMessage");
        modal.style.display = "block";
        message.textContent = "Error adding item";

        document.getElementById("okBtn").onclick = function () {
            modal.style.display = "none";
        };

        document.querySelector(".close-btn").onclick = function () {
            modal.style.display = "none";
        };
        alert("Error adding item");
    }
}

function resetForm() {
    document.getElementById("addItemForm").reset();
}

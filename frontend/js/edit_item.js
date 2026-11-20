window.onload = async function() {
    const params = new URLSearchParams(window.location.search);
    const itemNo = params.get("itemNo");
    if (!itemNo) return alert("No item specified");

    try {
        // Fetch item details
        const itemRes = await fetch(`http://localhost:3000/api/items/${itemNo}`);
        const item = await itemRes.json();

        // Fetch suppliers
        const supRes = await fetch("http://localhost:3000/api/suppliers");
        const suppliers = await supRes.json();

        // Fill form fields
        document.getElementById("itemNo").value = item.itemNo;
        document.getElementById("itemName").value = item.name;
        document.getElementById("itemType").value = item.type;
        document.getElementById("itemDesc").value = item.desc;
        document.getElementById("rateType").value = item.rateType;
        document.getElementById("itemRate").value = item.rate;
        document.getElementById("itemStatus").value = item.status;

        // Fill supplier dropdown
        const suppSelect = document.getElementById("itemSupplier");
        suppSelect.innerHTML = "";
        suppliers.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            if (s.id === item.suppId) opt.selected = true;
            suppSelect.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
        alert("Failed to load item or suppliers.");
    }
};

// Save changes with validation
async function saveItem() {
    const itemNo = document.getElementById("itemNo").value;
    const itemName = document.getElementById("itemName").value.trim();
    const itemType = document.getElementById("itemType").value;
    const itemDesc = document.getElementById("itemDesc").value.trim();
    const rateType = document.getElementById("rateType").value;
    const itemRate = document.getElementById("itemRate").value;
    const itemStatus = document.getElementById("itemStatus").value;
    const suppId = document.getElementById("itemSupplier").value;

    // Validate fields
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

    const data = { ITEM_NAME: itemName, ITEM_TYPE: itemType, ITEM_DESC: itemDesc, RATE_TYPE: rateType, ITEM_RATE: itemRate, ITEM_STATUS: itemStatus, SUPP_ID: suppId };

    try {
        const res = await fetch(`http://localhost:3000/api/items/${itemNo}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        const modal = document.getElementById("alertModal");
        const message = document.getElementById("alertMessage");

        if (result.success) {
            message.textContent = "Item details updated successfully!";
            modal.style.display = "block";
            document.getElementById("okBtn").onclick = () => window.location.href = "items.html";
            document.querySelector(".close-btn").onclick = () => window.location.href = "items.html";
        } else {
            message.textContent = "Failed to save item: " + result.error;
            modal.style.display = "block";
            document.getElementById("okBtn").onclick = closeModal;
            document.querySelector(".close-btn").onclick = closeModal;
        }

        function closeModal() {
            modal.style.display = "none";
        }

    } catch (err) {
        console.error(err);
        const modal = document.getElementById("alertModal");
        const message = document.getElementById("alertMessage");
        message.textContent = "Error saving item";
        modal.style.display = "block";
        document.getElementById("okBtn").onclick = closeModal;
        document.querySelector(".close-btn").onclick = closeModal;

        function closeModal() {
            modal.style.display = "none";
        }
    }
}

// Reset form
function resetForm() {
    document.getElementById("editItemForm").reset();
}

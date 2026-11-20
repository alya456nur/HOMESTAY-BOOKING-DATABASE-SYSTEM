function go(page) {
  window.location.href = page;
}


// Get modals
const deleteModal = document.getElementById("deleteModal");
const successModal = document.getElementById("successModal");

// Get buttons
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const okSuccessBtn = document.getElementById("okSuccessBtn");

// Function to open delete modal
function openDeleteModal() {
    deleteModal.style.display = "block";
}

// Close delete modal
cancelDeleteBtn.onclick = function() {
    deleteModal.style.display = "none";
};

// Confirm delete
confirmDeleteBtn.onclick = function() {
    deleteModal.style.display = "none"; // Close confirmation
    successModal.style.display = "block"; // Show success modal
};

// Close success modal
okSuccessBtn.onclick = function() {
    successModal.style.display = "none";
};

// Close modals when clicking X
document.querySelectorAll(".close-btn").forEach(btn => {
    btn.onclick = function() {
        btn.closest(".modal").style.display = "none";
    };
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
    }
};

// Attach delete modal to all remove buttons
document.querySelectorAll(".btn-remove").forEach(btn => {
    btn.addEventListener("click", function(event) {
        // Make sure it's not the confirm/cancel button inside modal
        if (!btn.id) {
            openDeleteModal();
        }
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const empId = urlParams.get("id");  // get employee ID from URL

    const empType = document.getElementById("empType");
    const wageInput = document.getElementById("wage");
    const wageSuffix = document.querySelector('.input-prefix span:last-child');

    // Update salary suffix when type changes
    empType.addEventListener('change', () => {
        updateSalarySuffix(empType.value);
        // Optionally clear salary if type changed
        wageInput.value = 0;
    });

    // Fetch employee data if ID exists
    if(empId) fetchEmployee(empId);

    function updateSalarySuffix(type) {
        if (type === "Full-Time") {
            wageSuffix.textContent = "/month";
        } else if (type === "Part-Time") {
            wageSuffix.textContent = "/hour";
        } else {
            wageSuffix.textContent = "";
        }
    }
});

function fetchEmployee(empId) {
    fetch(`http://localhost:3000/api/employees/${empId}`)
        .then(res => res.json())
        .then(employee => {
            document.getElementById("empId").value = employee.EMP_ID;
            document.getElementById("firstName").value = employee.EMP_FNAME;
            document.getElementById("lastName").value = employee.EMP_LNAME;
            document.getElementById("dob").value = formatForDateInput(employee.EMP_DOB);
            document.getElementById("hireDate").value = formatForDateInput(employee.EMP_HIRE_DATE);
            document.getElementById("phone").value = employee.EMP_PHONE;

            // Set employment type and salary
            document.getElementById("empType").value = employee.EMP_TYPE;
            const wageInput = document.getElementById("wage");
            const wageSuffix = document.querySelector('.input-prefix span:last-child');

            if(employee.salary) {
                wageInput.value = employee.salary.amount;
                wageSuffix.textContent = employee.salary.frequency === "month" ? "/month" : "/hour";
            } else {
                wageInput.value = 0;
                wageSuffix.textContent = employee.EMP_TYPE === "Full-Time" ? "/month" : "/hour";
            }
        })
        .catch(err => console.error("Error fetching employee:", err));
}

// Helper to format date for input[type=date]
function formatForDateInput(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// Save changes
function saveEmployee() {
    const modal = document.getElementById("alertModal");
    const message = document.getElementById("alertMessage");

    message.textContent = "Employee details saved successfully!";
    modal.style.display = "block";

    document.getElementById("okBtn").onclick = closeModal;
    document.querySelector(".close-btn").onclick = closeModal;

    window.onclick = function (event) {
        if (event.target === modal) closeModal();
    };

    function closeModal() {
        modal.style.display = "none";
    }
}

// Reset form
function resetForm() {
    const form = document.getElementById("editEmployeeForm");
    form.reset();

    // Reset salary suffix to default based on type
    const empType = document.getElementById("empType").value;
    const wageSuffix = document.querySelector('.input-prefix span:last-child');
    wageSuffix.textContent = empType === "Full-Time" ? "/month" : "/hour";
}

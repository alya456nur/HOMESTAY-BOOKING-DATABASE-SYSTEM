document.addEventListener("DOMContentLoaded", () => {
    const typeSelect = document.querySelector('#addEmployeeForm select');
    const wageInputWrapper = document.querySelector('.input-prefix');
    const wageSuffix = wageInputWrapper.querySelectorAll('span')[1]; // the "/hour" span

    // Update salary suffix based on type
    typeSelect.addEventListener('change', (e) => {
        if (e.target.value === "Full-Time") {
            wageSuffix.textContent = "/month";
        } else if (e.target.value === "Part-Time") {
            wageSuffix.textContent = "/hour";
        } else {
            wageSuffix.textContent = ""; // if no type selected
        }
    });
});

function addEmployee() {
    // Declare
    const fName = document.getElementById("firstName").value.trim();
    const lName = document.getElementById("lastName").value.trim();
    const dateBirth = formatDateToDDMMYYYY(document.getElementById("dob").value);
    const dateHire = formatDateToDDMMYYYY(document.getElementById("hireDate").value);
    const phoNum = document.getElementById("phone").value.trim();
    const empType = document.getElementById("empType").value.trim();
    const empSalary = document.getElementById("wage").value.trim();


    // Validation: check if any field is blank
    if (!fName || !lName || !dateBirth || !dateHire || !phoNum || !empType || !empSalary){
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

    // NANTI BUANG
    console.log("This is the date:" + dateBirth, dateHire)

    // Prepare data
    const employeeData = {
        EMP_FNAME: fName,
        EMP_LNAME: lName,
        EMP_DOB: dateBirth,
        EMP_HIRE_DATE: dateHire,
        EMP_PHONE: phoNum,
        EMP_TYPE: empType,
        WAGE: empSalary
    };

    // Send POST request to backend
    fetch("http://localhost:3000/api/employees", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(employeeData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Show modal
            const modal = document.getElementById("alertModal");
            const message = document.getElementById("alertMessage");

            modal.style.display = "block";
            message.textContent = "Employee added successfully!";

            document.getElementById("okBtn").onclick = function () {
                window.location.href = "employees.html";
            };

            document.querySelector(".close-btn").onclick = function () {
                window.location.href = "employees.html";
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
        message.textContent = "Failed to add employee";

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
    document.getElementById("addEmployeeForm").reset();
}

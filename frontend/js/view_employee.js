// Get employee ID from URL parameters
function getEmployeeId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Format date to dd/mm/yyyy
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

// Format currency
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return "N/A";
    return `RM ${parseFloat(amount).toFixed(2)}`;
}

// Load and display employee details
async function loadEmployeeDetails() {
    const empId = getEmployeeId();
    
    if (!empId) {
        alert("No employee ID provided in URL");
        window.location.href = "employees.html";
        return;
    }
    
    try {
        // Show loading state
        document.getElementById('emp_id').value = "Loading...";
        
        // Fetch employee details from backend
        const response = await fetch(`http://localhost:3000/api/employees/${empId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Employee not found");
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const employee = await response.json();
        
        // Populate form fields
        document.getElementById('emp_id').value = employee.EMP_ID || "";
        document.getElementById('emp_type').value = employee.EMP_TYPE || "";
        document.getElementById('fname').value = employee.EMP_FNAME || "";
        document.getElementById('lname').value = employee.EMP_LNAME || "";
        document.getElementById('dob').value = formatDate(employee.EMP_DOB);
        document.getElementById('hire_date').value = formatDate(employee.EMP_HIRE_DATE);
        document.getElementById('phone').value = employee.EMP_PHONE || "";
        
        // Display salary
        const salaryElement = document.getElementById('salary');
        if (employee.salary && employee.salary.amount !== null && employee.salary.amount !== undefined) {
            const salary = parseFloat(employee.salary.amount).toFixed(2);
            
            // Check if part-time or full-time
            if (employee.EMP_TYPE && employee.EMP_TYPE.toLowerCase().includes('part')) {
                salaryElement.textContent = `RM ${salary} / hour`;
            } else if (employee.EMP_TYPE && employee.EMP_TYPE.toLowerCase().includes('full')) {
                salaryElement.textContent = `RM ${salary} / month`;
            } else {
                salaryElement.textContent = `RM ${salary}`;
            }
        } else {
            salaryElement.textContent = "Salary information not available";
            salaryElement.style.color = "#999";
        }
        
    } catch (error) {
        console.error("Error loading employee details:", error);
        alert(`Failed to load employee details: ${error.message}`);
        
        // Clear form fields
        document.getElementById('emp_id').value = "Error";
        document.getElementById('salary').textContent = "Error loading data";
        document.getElementById('salary').style.color = "#e74c3c";
    }
}

// Back button function
function goBack() {
    window.history.back();
}

// Load employee details when page loads
document.addEventListener('DOMContentLoaded', loadEmployeeDetails);

// Add back button functionality if needed
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
});
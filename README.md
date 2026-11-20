# Homestay Booking Management System

A web-based homestay booking management system designed to manage homestay reservations and daily operational activities through a centralized admin dashboard.

## About the Project

The Homestay Booking Management System provides an administrative interface for managing customers, homestays, bookings, payments, employees, housekeeping activities, items, and suppliers.

The system connects a frontend web application with a Node.js backend and an Oracle Database to retrieve, create, update, and manage records.

## Features

### Dashboard
- Overview of total revenue
- Total bookings
- Customer statistics
- Housekeeping job summary
- Monthly revenue chart
- Year-based report filtering

### Customer Management
- View customer records
- Add new customers
- Edit customer information
- Delete customer records
- View customer booking information

### Booking Management
- Create new bookings
- View booking records
- Edit booking details
- Manage check-in and check-out information

### Homestay Management
- View homestay information
- Add new homestays
- Edit homestay details
- Manage homestay availability
- Manage pricing and descriptions

### Payment Management
- View payment records
- Update payment information
- Manage payment status
- View receipts

### Employee Management
- View employee records
- Add new employees
- Edit employee information
- Manage full-time and part-time employee details

### Housekeeping Management
- Schedule housekeeping activities
- Assign employees to housekeeping tasks
- Update housekeeping status
- Track housekeeping records

### Item and Supplier Management
- Manage additional items and facilities
- Manage item availability and pricing
- Add and edit suppliers
- Maintain supplier information

## Technologies Used

**Frontend**
- HTML5
- CSS3
- JavaScript
- Font Awesome
- Chart.js

**Backend**
- Node.js
- Express.js
- CORS
- OracleDB Node.js Driver

**Database**
- Oracle Database
- SQL

**Development Tools**
- Visual Studio Code
- Oracle SQL Developer

## Project Structure

```text
HOMESTAY BOOKING DATABASE SYSTEM/
│
├── backend/
│   ├── db.js                # Oracle database connection
│   ├── server.js            # Express server and API routes
│   ├── package.json         # Backend dependencies
│   └── package-lock.json
│
├── frontend/
│   ├── css/
│   │   └── style.css        # Application styles
│   │
│   ├── js/                  # Frontend JavaScript files
│   │
│   ├── index.html           # Admin dashboard
│   ├── bookings.html
│   ├── customers.html
│   ├── employees.html
│   ├── homestays.html
│   ├── housekeeping.html
│   ├── items.html
│   ├── payments.html
│   └── suppliers.html
│
├── HOMESTAY_MS CREATE.sql   # Database table creation scripts
├── HOMESTAY_MS INSERT.sql   # Sample database records
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js and npm
- Oracle Database
- Oracle SQL Developer (recommended)
- Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/alya456nur/HOMESTAY-BOOKING-DATABASE-SYSTEM.git
```

Navigate into the project directory:

```bash
cd homestay-booking-database-system
```

### 2. Set Up the Database

1. Start your Oracle Database.
2. Open Oracle SQL Developer.
3. Connect to your Oracle database.
4. Execute `HOMESTAY_MS CREATE.sql` to create the database tables and sequences.
5. Execute `HOMESTAY_MS INSERT.sql` to insert the sample records.
6. Make sure the database connection details match the backend configuration.

### 3. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Install the required dependencies:

```bash
npm install
```

### 4. Configure Database Connection

Open:

```text
backend/db.js
```

Update the Oracle database connection settings to match your local environment.

The current configuration uses:

```text
Host: localhost
Port: 1521
Service Name: FREEPDB1
```

### 5. Start the Backend Server

Run:

```bash
node server.js
```

The backend API can be accessed at:

```text
http://localhost:3000
```

### 6. Launch the Frontend

1. Open the `frontend` folder in Visual Studio Code.
2. Open `index.html`.
3. Use the Live Server extension to launch the dashboard.
4. Make sure the backend server and Oracle Database are running.

## Database Management

The system uses Oracle Database to store and manage information related to:

- Customers
- Employees
- Full-time and part-time employees
- Homestays
- Bookings
- Payments
- Receipts
- Items
- Suppliers
- Booking items
- Housekeeping activities

## Developer

Developed as an academic database management project.

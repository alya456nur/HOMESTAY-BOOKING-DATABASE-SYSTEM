let revenueChart;

// Initialize Chart.js
function initChart() {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets: [{
        label: 'Revenue (RM)',
        data: Array(12).fill(0),
        borderColor: '#4f6ef7',
        backgroundColor: 'rgba(79,110,247,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#4f6ef7'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2a44',
          titleColor: '#fff',
          bodyColor: '#fff'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => 'RM ' + value },
          grid: { color: '#f1f4fa' }
        },
        x: { grid: { color: '#f1f4fa' } }
      }
    }
  });
}

// Fetch and calculate report data for selected year
async function loadReports(year) {
  try {
    // 1) Monthly revenue (PAID only, already aggregated by SQL)
    const monthlyRes = await fetch(`http://localhost:3000/api/revenue/monthly?year=${year}`);
    const monthlyData = await monthlyRes.json();

    const monthlyRevenue = Array.isArray(monthlyData.monthlyRevenue)
      ? monthlyData.monthlyRevenue
      : Array(12).fill(0);

    revenueChart.data.datasets[0].data = monthlyRevenue;
    revenueChart.update();

    // 2) Total revenue (PAID only, aggregated by SQL)
    const totalRes = await fetch(`http://localhost:3000/api/revenue/total?year=${year}`);
    const totalData = await totalRes.json();
    const totalRevenue = Number(totalData.totalRevenue || 0);

    document.getElementById('totalRevenue').textContent = `RM ${totalRevenue.toFixed(2)}`;

    // 3) Total bookings (raw count)
    const bookingRes = await fetch(`http://localhost:3000/api/bookings?year=${year}`);
    const bookings = await bookingRes.json();
    document.getElementById('totalBookings').textContent = Array.isArray(bookings) ? bookings.length : 0;

    // 4) Total customers (fixed endpoint returns { totalCustomers })
    const custRes = await fetch(`http://localhost:3000/api/customersY?year=${year}`);
    const custData = await custRes.json();
    document.getElementById('totalCustomers').textContent = Number(custData.totalCustomers || 0);

    // 5) Total housekeeping completed
    const hkRes = await fetch(`http://localhost:3000/api/housekeepingrp?year=${year}`);
    const housekeeping = await hkRes.json();
    document.getElementById('totalHousekeeping').textContent = Array.isArray(housekeeping) ? housekeeping.length : 0;

  } catch (err) {
    console.error("Error loading reports:", err);
    
  }
}

async function loadYearDropdown() {
  const yearFilter = document.getElementById('yearFilter');
  try {
    const res = await fetch('http://localhost:3000/api/booking-years');
    const years = await res.json();

    yearFilter.innerHTML = '';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearFilter.appendChild(opt);
    });

    if (years.length > 0) loadReports(years[0]);

  } catch (err) {
    console.error("Error loading years:", err);
  }
}

// On year change
document.getElementById('yearFilter').addEventListener('change', e => {
  loadReports(e.target.value);
});

// Initialize reports
window.onload = () => {
  initChart();
  loadYearDropdown();
};

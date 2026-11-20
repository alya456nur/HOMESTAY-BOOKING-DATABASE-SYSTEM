fetch('http://localhost:3000/api/employee')
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById('list');
    data.forEach(row => {
      const li = document.createElement('li');
      li.textContent = row.join(' - ');
      list.appendChild(li);
    });
  });

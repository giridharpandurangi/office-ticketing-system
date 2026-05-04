const fetch = require('node-fetch');
(async () => {
  try {
    const res = await fetch('http://localhost:5200/api/categories');
    const data = await res.json();
    console.log('Categories:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
})();

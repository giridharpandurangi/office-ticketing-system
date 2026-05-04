const http = require('http');
const req = http.request('http://localhost:5200/api/health', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (d) => console.log('Data:', d.toString()));
});
req.on('error', (e) => console.error('Error:', e.message));
req.end();

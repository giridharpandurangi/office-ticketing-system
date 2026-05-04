const fetch = global.fetch || require('node-fetch');
(async () => {
  try {
    const login = await fetch('http://localhost:5200/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@ticketing.local', password: 'admin123' })
    });
    console.log('LOGIN_STATUS', login.status);
    const loginBody = await login.text();
    console.log('LOGIN_BODY', loginBody);
    if (login.status !== 200) return;
    const token = JSON.parse(loginBody).token;
    const ticket = await fetch('http://localhost:5200/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ title: 'Test issue', description: 'API test issue', priority: 'medium' })
    });
    console.log('CREATE_STATUS', ticket.status);
    console.log('CREATE_BODY', await ticket.text());
  } catch (err) {
    console.error('ERR', err);
  }
})();

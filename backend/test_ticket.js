const fetch = global.fetch;
(async () => {
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email:'hr@ticketing.local', password:'admin123'})
    });
    const loginBody = await login.text();
    console.log('LOGIN_STATUS', login.status);
    console.log('LOGIN_BODY', loginBody);
    if (login.status !== 200) return;
    const token = JSON.parse(loginBody).token;
    const ticket = await fetch('http://localhost:5000/api/tickets', {
      method: 'POST',
      headers: {'Content-Type':'application/json', Authorization: `Bearer ${token}`},
      body: JSON.stringify({title:'Test issue', description:'This is a test', priority:'medium'})
    });
    const ticketBody = await ticket.text();
    console.log('CREATE_STATUS', ticket.status);
    console.log('CREATE_BODY', ticketBody);
  } catch (e) {
    console.error('ERR', e.message);
  }
})();

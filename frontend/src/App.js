import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TicketDetail from './pages/TicketDetail';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <Router>
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
        <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/tickets/:id" element={user ? <TicketDetail user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user && user.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">🎫 Ticketing System</div>
      <div className="navbar-menu">
        <span>{user.name} ({user.role})</span>
        {user.role === 'admin' && (
          <a href="/admin" className="nav-link">Admin</a>
        )}
        <a href="/profile" className="nav-link">Settings</a>
        <button onClick={onLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}

export default App;

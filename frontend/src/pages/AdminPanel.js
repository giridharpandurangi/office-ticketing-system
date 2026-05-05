import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Fix #13
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user'
  });
  // Fix #16: Confirmation state before role change
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { userId, userName, newRole }
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post('/api/users', newUser);
      setNewUser({ email: '', password: '', name: '', role: 'user' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // Fix #16: Show confirmation dialog before applying role change
  const requestRoleChange = (userId, userName, currentRole, newRole) => {
    if (newRole === currentRole) return;
    setPendingRoleChange({ userId, userName, newRole });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { userId, newRole } = pendingRoleChange;
    try {
      await api.patch(`/api/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      setError('Failed to update user role');
    } finally {
      setPendingRoleChange(null);
    }
  };

  const ROLE_LABELS = { user: 'User', engineer: 'Engineer', admin: 'Admin' };

  return (
    <div className="container">
      <h1>Admin Panel — User Management</h1>

      {error && <div className="error">{error}</div>}

      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          + Create New User
        </button>
      )}

      {showForm && (
        <div className="card mb-2">
          <h2>Create New User</h2>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="engineer">Engineer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#95a5a6' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="hide-mobile">Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {/* Fix #16: onChange triggers confirmation dialog, not immediate API call */}
                    <select
                      value={u.role}
                      onChange={(e) => requestRoleChange(u.id, u.name, u.role, e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="engineer">Engineer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="hide-mobile">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {/* Fix #6: "View Tickets" button now navigates with filter */}
                    <button
                      style={{ background: '#3498db', fontSize: '12px', padding: '0.4rem 0.75rem' }}
                      onClick={() => navigate(`/?user=${u.id}`)}
                    >
                      View Tickets
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fix #16: Role change confirmation dialog */}
      {pendingRoleChange && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Role Change</h3>
            <p>
              Change <strong>{pendingRoleChange.userName}</strong>'s role to{' '}
              <strong>{ROLE_LABELS[pendingRoleChange.newRole]}</strong>?
            </p>
            <div className="confirm-actions">
              <button
                onClick={() => setPendingRoleChange(null)}
                style={{ background: '#6c757d' }}
              >
                Cancel
              </button>
              <button onClick={confirmRoleChange}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;

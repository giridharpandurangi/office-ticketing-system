import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'user' });

  // Confirmation dialogs
  const [pendingRoleChange, setPendingRoleChange] = useState(null);   // { userId, userName, newRole }
  const [pendingDelete, setPendingDelete] = useState(null);           // { userId, userName }
  const [pendingReset, setPendingReset] = useState(null);             // { userId, userName }
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();
  const ROLE_LABELS = { user: 'User', engineer: 'Engineer', admin: 'Admin' };

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

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/users', newUser);
      setNewUser({ email: '', password: '', name: '', role: 'user' });
      setShowForm(false);
      showSuccess(`User "${newUser.name}" created successfully.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // Role change
  const requestRoleChange = (userId, userName, currentRole, newRole) => {
    if (newRole === currentRole) return;
    setPendingRoleChange({ userId, userName, newRole });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/users/${pendingRoleChange.userId}/role`, { role: pendingRoleChange.newRole });
      showSuccess(`${pendingRoleChange.userName}'s role updated to ${ROLE_LABELS[pendingRoleChange.newRole]}.`);
      fetchUsers();
    } catch (err) {
      setError('Failed to update user role');
    } finally {
      setPendingRoleChange(null);
      setActionLoading(false);
    }
  };

  // Reset password
  const confirmResetPassword = async () => {
    if (!pendingReset) return;
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const res = await api.patch(`/api/users/${pendingReset.userId}/reset-password`, { password: newPassword });
      showSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setPendingReset(null);
      setNewPassword('');
      setActionLoading(false);
    }
  };

  // Delete user
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/api/users/${pendingDelete.userId}`);
      showSuccess(res.data.message);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setPendingDelete(null);
      setActionLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Admin Panel — User Management</h1>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

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
              <label>Email / Login ID</label>
              <input
                type="text"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                required
                placeholder="e.g. john@ticketing.local"
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
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn-action btn-blue"
                        onClick={() => navigate(`/?user=${u.id}`)}
                      >
                        Tickets
                      </button>
                      <button
                        className="btn-action btn-orange"
                        onClick={() => { setPendingReset({ userId: u.id, userName: u.name }); setNewPassword(''); setError(''); }}
                      >
                        Reset PW
                      </button>
                      <button
                        className="btn-action btn-red"
                        onClick={() => setPendingDelete({ userId: u.id, userName: u.name })}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role change confirmation */}
      {pendingRoleChange && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Role Change</h3>
            <p>
              Change <strong>{pendingRoleChange.userName}</strong>'s role to{' '}
              <strong>{ROLE_LABELS[pendingRoleChange.newRole]}</strong>?
            </p>
            <div className="confirm-actions">
              <button onClick={() => setPendingRoleChange(null)} style={{ background: '#6c757d' }}>
                Cancel
              </button>
              <button onClick={confirmRoleChange} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password dialog */}
      {pendingReset && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Reset Password</h3>
            <p>Set a new password for <strong>{pendingReset.userName}</strong>.</p>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                autoFocus
              />
            </div>
            <div className="confirm-actions">
              <button onClick={() => { setPendingReset(null); setError(''); }} style={{ background: '#6c757d' }}>
                Cancel
              </button>
              <button onClick={confirmResetPassword} disabled={actionLoading || newPassword.length < 6}>
                {actionLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Delete User</h3>
            <p>
              Are you sure you want to delete <strong>{pendingDelete.userName}</strong>?
              <br />
              <span style={{ color: '#e74c3c', fontSize: '14px' }}>
                This cannot be undone. Their tickets will remain but become unassigned.
              </span>
            </p>
            {error && <div className="error" style={{ margin: '1rem 0' }}>{error}</div>}
            <div className="confirm-actions">
              <button onClick={() => { setPendingDelete(null); setError(''); }} style={{ background: '#6c757d' }}>
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                style={{ background: 'linear-gradient(45deg, #e74c3c, #c0392b)' }}
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;

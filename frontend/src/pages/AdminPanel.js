import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { downloadUserImportTemplate } from '../utils/exportCsv';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'workload' | 'import'

  // ── Users tab state ──────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'user' });
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingReset, setPendingReset] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Import tab state ────────────────────────────────────────────────────
  const [importFile, setImportFile] = useState(null);
  const [autoPassword, setAutoPassword] = useState(true);
  const [defaultRole, setDefaultRole] = useState('user');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [workload, setWorkload] = useState([]);
  const [workloadLoading, setWorkloadLoading] = useState(false);

  const navigate = useNavigate();
  const ROLE_LABELS = { user: 'User', engineer: 'Engineer', admin: 'Admin' };

  useEffect(() => { fetchUsers(); }, []);

  const fetchWorkload = useCallback(async () => {
    setWorkloadLoading(true);
    try {
      const res = await api.get('/api/users/workload');
      setWorkload(res.data);
    } catch (err) {
      console.error('Failed to load workload');
    } finally {
      setWorkloadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'workload') fetchWorkload();
  }, [activeTab, fetchWorkload]);

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

  const confirmResetPassword = async () => {
    if (!pendingReset) return;
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
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

  const confirmToggleActive = async () => {
    if (!pendingToggle) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/api/users/${pendingToggle.userId}/toggle-active`);
      showSuccess(res.data.message);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update account status');
    } finally {
      setPendingToggle(null);
      setActionLoading(false);
    }
  };

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

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile || importing) return;
    setImporting(true);
    setImportResult(null);
    setImportError('');
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('auto_password', autoPassword ? 'true' : 'false');
      formData.append('default_role', defaultRole);
      const res = await api.post('/api/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      if (res.data.created.length > 0) fetchUsers();
    } catch (err) {
      setImportError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Workload bar — max is the highest total_active across all engineers
  const maxActive = workload.length > 0
    ? Math.max(...workload.map(e => parseInt(e.total_active) || 0), 1)
    : 1;

  return (
    <div className="container">
      <h1>Admin Panel</h1>

      {/* Tab bar */}
      <div className="tab-bar">
        <button className={`tab-btn${activeTab === 'users' ? ' active' : ''}`} onClick={() => setActiveTab('users')}>
          👥 User Management
        </button>
        <button className={`tab-btn${activeTab === 'workload' ? ' active' : ''}`} onClick={() => setActiveTab('workload')}>
          📊 Engineer Workload
        </button>
        <button className={`tab-btn${activeTab === 'import' ? ' active' : ''}`} onClick={() => setActiveTab('import')}>
          📥 Import Users
        </button>
      </div>

      {/* ── Users tab ── */}
      {activeTab === 'users' && (
        <>
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
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Email / Login ID</label>
                  <input type="text" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} required placeholder="e.g. john@ticketing.local" />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))} required minLength={6} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="engineer">Engineer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</button>
                  <button type="button" onClick={() => setShowForm(false)} style={{ background: '#95a5a6' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {loading ? <p>Loading users...</p> : (
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="hide-mobile">Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isActive = u.is_active !== false;
                    return (
                      <tr key={u.id} style={{ opacity: isActive ? 1 : 0.5 }}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <select value={u.role} onChange={(e) => requestRoleChange(u.id, u.name, u.role, e.target.value)} disabled={!isActive}>
                            <option value="user">User</option>
                            <option value="engineer">Engineer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px',
                            fontSize: '11px', fontWeight: 600,
                            background: isActive ? 'rgba(107,207,127,0.15)' : 'rgba(149,165,166,0.2)',
                            color: isActive ? '#27ae60' : '#7f8c8d',
                            border: isActive ? '1px solid rgba(107,207,127,0.4)' : '1px solid rgba(149,165,166,0.4)'
                          }}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="hide-mobile">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className="btn-action btn-blue" onClick={() => navigate(`/?user=${u.id}`)}>Tickets</button>
                            <button className="btn-action btn-orange" onClick={() => { setPendingReset({ userId: u.id, userName: u.name }); setNewPassword(''); setError(''); }} disabled={!isActive}>Reset PW</button>
                            <button className={`btn-action ${isActive ? 'btn-grey' : 'btn-green'}`} onClick={() => setPendingToggle({ userId: u.id, userName: u.name, isActive })}>
                              {isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                            <button className="btn-action btn-red" onClick={() => setPendingDelete({ userId: u.id, userName: u.name })}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Workload tab ── */}
      {activeTab === 'workload' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Engineer Workload</h2>
              <p className="text-muted" style={{ marginTop: '0.25rem' }}>Active (non-resolved) tickets currently assigned to each engineer.</p>
            </div>
            <button onClick={fetchWorkload} style={{ padding: '0.5rem 1rem', fontSize: '13px' }}>
              ↻ Refresh
            </button>
          </div>

          {workloadLoading ? (
            <p>Loading workload...</p>
          ) : workload.length === 0 ? (
            <p className="text-muted">No engineers found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {workload.map((eng) => {
                const total = parseInt(eng.total_active) || 0;
                const open = parseInt(eng.open_count) || 0;
                const inProgress = parseInt(eng.in_progress_count) || 0;
                const waiting = parseInt(eng.waiting_count) || 0;
                const overdue = parseInt(eng.overdue_count) || 0;
                const barPct = maxActive > 0 ? (total / maxActive) * 100 : 0;

                return (
                  <div key={eng.id} style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong>{eng.name}</strong>
                        <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '12px' }}>({eng.role})</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {open > 0 && <span className="badge badge-open">{open} open</span>}
                        {inProgress > 0 && <span className="badge badge-in_progress">{inProgress} in progress</span>}
                        {waiting > 0 && <span className="badge badge-waiting_for_approval">{waiting} waiting</span>}
                        {overdue > 0 && (
                          <span style={{ background: 'rgba(231,76,60,0.12)', color: '#c0392b', border: '1px solid rgba(231,76,60,0.3)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                            🔴 {overdue} overdue
                          </span>
                        )}
                        <strong style={{ fontSize: '15px', color: total === 0 ? '#27ae60' : '#333' }}>
                          {total} total
                        </strong>
                      </div>
                    </div>
                    {/* Workload bar */}
                    <div style={{ background: '#e1e8ed', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: barPct + '%',
                        borderRadius: '6px',
                        background: overdue > 0
                          ? 'linear-gradient(45deg, #e74c3c, #c0392b)'
                          : total === 0
                          ? '#27ae60'
                          : 'linear-gradient(45deg, #667eea, #764ba2)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Import tab ── */}
      {activeTab === 'import' && (
        <div className="card">
          <h2 style={{ marginBottom: '0.5rem' }}>Import Users from CSV or Excel</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. Required columns: <code>name</code>, <code>email</code>.
            Optional: <code>password</code>, <code>role</code> (user / engineer / admin).
          </p>

          {/* Template download */}
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '0.875rem 1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '13px', color: '#555' }}>
              <strong>Column format:</strong> name, email, password, role
              <br />
              <span style={{ color: '#888' }}>Example: John Smith, john@ticketing.local, changeme123, user</span>
            </div>
            <button
              type="button"
              onClick={downloadUserImportTemplate}
              style={{ background: 'linear-gradient(45deg, #27ae60, #2ecc71)', fontSize: '13px', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
            >
              ↓ Download Template
            </button>
          </div>

          <form onSubmit={handleImport}>
            <div className="form-group">
              <label>File (CSV or Excel)</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => { setImportFile(e.target.files[0] || null); setImportResult(null); setImportError(''); }}
                required
              />
            </div>

            <div className="form-group">
              <label>Default Role (used when role column is blank)</label>
              <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value)}>
                <option value="user">User</option>
                <option value="engineer">Engineer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1rem',
                border: '2px solid ' + (autoPassword ? '#667eea' : '#e1e8ed'),
                borderRadius: 10, cursor: 'pointer', fontWeight: 'normal',
                background: autoPassword ? 'rgba(102,126,234,0.05)' : 'white'
              }}>
                <input
                  type="checkbox"
                  checked={autoPassword}
                  onChange={(e) => setAutoPassword(e.target.checked)}
                  style={{ width: 'auto', accentColor: '#667eea' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Auto-generate passwords</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                    If a row has no password, a random one is generated. The generated password is shown in the results below — save it before leaving this page.
                  </div>
                </div>
              </label>
            </div>

            {importError && <div className="error" style={{ marginBottom: '1rem' }}>{importError}</div>}

            <button type="submit" disabled={importing || !importFile}>
              {importing ? 'Importing...' : 'Import Users'}
            </button>
          </form>

          {/* Results */}
          {importResult && (
            <div style={{ marginTop: '2rem' }}>
              <div className="success" style={{ marginBottom: '1rem' }}>{importResult.message}</div>

              {importResult.created.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '0.75rem', color: '#27ae60' }}>
                    ✅ Created ({importResult.created.length})
                  </h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Generated Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.created.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                          <td>
                            {u.generated_password
                              ? <code style={{ background: '#fff3cd', padding: '0.2rem 0.4rem', borderRadius: 4 }}>{u.generated_password}</code>
                              : <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importResult.created.some(u => u.generated_password) && (
                    <p style={{ fontSize: '12px', color: '#e67e22', marginTop: '0.5rem' }}>
                      ⚠️ Save the generated passwords above — they will not be shown again.
                    </p>
                  )}
                </div>
              )}

              {importResult.skipped.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '0.75rem', color: '#f39c12' }}>
                    ⏭ Skipped ({importResult.skipped.length})
                  </h3>
                  <table className="table">
                    <thead><tr><th>Row</th><th>Email</th><th>Reason</th></tr></thead>
                    <tbody>
                      {importResult.skipped.map((s, i) => (
                        <tr key={i}><td>{s.row}</td><td>{s.email}</td><td>{s.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '0.75rem', color: '#e74c3c' }}>
                    ❌ Errors ({importResult.errors.length})
                  </h3>
                  <table className="table">
                    <thead><tr><th>Row</th><th>Email</th><th>Reason</th></tr></thead>
                    <tbody>
                      {importResult.errors.map((e, i) => (
                        <tr key={i}><td>{e.row}</td><td>{e.email || '—'}</td><td>{e.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ── */}

      {pendingRoleChange && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Role Change</h3>
            <p>Change <strong>{pendingRoleChange.userName}</strong>'s role to <strong>{ROLE_LABELS[pendingRoleChange.newRole]}</strong>?</p>
            <div className="confirm-actions">
              <button onClick={() => setPendingRoleChange(null)} style={{ background: '#6c757d' }}>Cancel</button>
              <button onClick={confirmRoleChange} disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {pendingReset && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Reset Password</h3>
            <p>Set a new password for <strong>{pendingReset.userName}</strong>.</p>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" minLength={6} autoFocus />
            </div>
            <div className="confirm-actions">
              <button onClick={() => { setPendingReset(null); setError(''); }} style={{ background: '#6c757d' }}>Cancel</button>
              <button onClick={confirmResetPassword} disabled={actionLoading || newPassword.length < 6}>{actionLoading ? 'Resetting...' : 'Reset Password'}</button>
            </div>
          </div>
        </div>
      )}

      {pendingToggle && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>{pendingToggle.isActive ? 'Deactivate User' : 'Reactivate User'}</h3>
            <p>
              {pendingToggle.isActive ? (
                <>Deactivate <strong>{pendingToggle.userName}</strong>?<br /><span style={{ fontSize: '13px', color: '#888' }}>They will be immediately logged out and unable to log back in. Their tickets and history are preserved.</span></>
              ) : (
                <>Reactivate <strong>{pendingToggle.userName}</strong>?<br /><span style={{ fontSize: '13px', color: '#888' }}>They will be able to log in again with their existing credentials.</span></>
              )}
            </p>
            <div className="confirm-actions">
              <button onClick={() => setPendingToggle(null)} style={{ background: '#6c757d' }}>Cancel</button>
              <button onClick={confirmToggleActive} disabled={actionLoading} style={pendingToggle.isActive ? { background: 'linear-gradient(45deg, #e67e22, #d35400)' } : undefined}>
                {actionLoading ? 'Saving...' : pendingToggle.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Delete User</h3>
            <p>
              Are you sure you want to delete <strong>{pendingDelete.userName}</strong>?<br />
              <span style={{ color: '#e74c3c', fontSize: '14px' }}>This cannot be undone. Their tickets will remain but become unassigned.</span>
            </p>
            {error && <div className="error" style={{ margin: '1rem 0' }}>{error}</div>}
            <div className="confirm-actions">
              <button onClick={() => { setPendingDelete(null); setError(''); }} style={{ background: '#6c757d' }}>Cancel</button>
              <button onClick={confirmDelete} disabled={actionLoading} style={{ background: 'linear-gradient(45deg, #e74c3c, #c0392b)' }}>
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

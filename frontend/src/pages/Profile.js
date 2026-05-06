import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const PREFERENCE_OPTIONS = [
  {
    value: 'all',
    label: 'All updates',
    description: 'Get notified on every status change (open → in progress → resolved)'
  },
  {
    value: 'resolved_only',
    label: 'Resolved only',
    description: 'Only get notified when your ticket is marked as resolved'
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'No email notifications'
  }
];

function Profile({ user }) {
  const [notificationEmail, setNotificationEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [preference, setPreference] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);
  const [pwError, setPwError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/users/me');
        setNotificationEmail(res.data.notification_email || '');
        setSavedEmail(res.data.notification_email || '');
        setPreference(res.data.notification_preference || 'all');
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      await api.patch('/api/users/me/profile', {
        notification_email: notificationEmail,
        notification_preference: preference
      });
      setSavedEmail(notificationEmail);
      setMessage('Notification settings saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setMessage(null);
    setError(null);
    setSending(true);
    try {
      const res = await api.post('/api/users/me/test-email', {});
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);
    setPwError(null);

    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }

    setPwSaving(true);
    try {
      const res = await api.patch('/api/users/me/password', {
        current_password: pwForm.current,
        new_password: pwForm.next
      });
      setPwMessage(res.data.message);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 600, margin: '2rem auto' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Profile Settings</h2>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '14px' }}>
          Configure your email notification preferences.
        </p>

        {/* Login info */}
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '0.25rem' }}>
            <strong>Login ID:</strong> {user.email}
          </p>
          <p style={{ fontSize: '12px', color: '#888' }}>
            This is your login credential and cannot be changed here.
          </p>
        </div>

        <form onSubmit={handleSave}>
          {/* Notification email */}
          <div className="form-group">
            <label htmlFor="notification_email">Notification Email</label>
            <input
              id="notification_email"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="e.g. yourname@company.com"
              required
            />
            <p style={{ fontSize: '12px', color: '#888', marginTop: '0.4rem' }}>
              Ticket updates will be sent to this address.
            </p>
          </div>

          {/* Notification preference */}
          <div className="form-group">
            <label>When to notify me</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
              {PREFERENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    border: `2px solid ${preference === opt.value ? '#667eea' : '#e1e8ed'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: preference === opt.value ? 'rgba(102,126,234,0.05)' : 'white',
                    transition: 'all 0.2s ease',
                    fontWeight: 'normal'
                  }}
                >
                  <input
                    type="radio"
                    name="notification_preference"
                    value={opt.value}
                    checked={preference === opt.value}
                    onChange={() => setPreference(opt.value)}
                    style={{ marginTop: '2px', width: 'auto', accentColor: '#667eea' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {message && <div className="success" style={{ marginBottom: '1rem' }}>{message}</div>}
          {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sending || !savedEmail || preference === 'disabled'}
              title={
                preference === 'disabled'
                  ? 'Notifications are disabled'
                  : !savedEmail
                  ? 'Save a notification email first'
                  : `Send test to ${savedEmail}`
              }
              style={{
                flex: 1,
                background: savedEmail && preference !== 'disabled'
                  ? 'linear-gradient(45deg, #6bcf7f, #4ecdc4)'
                  : undefined
              }}
            >
              {sending ? 'Sending...' : `Send Test Email${savedEmail ? ` → ${savedEmail}` : ''}`}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change Password ── */}
      <div className="card" style={{ maxWidth: 600, margin: '0 auto 2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Change Password</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '14px' }}>
          You must enter your current password to set a new one.
        </p>

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="current_password">Current Password</label>
            <input
              id="current_password"
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm(prev => ({ ...prev, current: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="new_password">New Password</label>
            <input
              id="new_password"
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm(prev => ({ ...prev, next: e.target.value }))}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p style={{ fontSize: '12px', color: '#888', marginTop: '0.4rem' }}>
              Minimum 6 characters.
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm(prev => ({ ...prev, confirm: e.target.value }))}
              required
              autoComplete="new-password"
              style={{
                borderColor: pwForm.confirm && pwForm.next !== pwForm.confirm ? '#e74c3c' : undefined
              }}
            />
            {pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p style={{ fontSize: '12px', color: '#e74c3c', marginTop: '0.4rem' }}>
                Passwords do not match.
              </p>
            )}
          </div>

          {pwMessage && <div className="success" style={{ marginBottom: '1rem' }}>{pwMessage}</div>}
          {pwError && <div className="error" style={{ marginBottom: '1rem' }}>{pwError}</div>}

          <button
            type="submit"
            disabled={pwSaving || !pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm}
          >
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;

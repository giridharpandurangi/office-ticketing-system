import React, { useState, useEffect } from 'react';
import api from '../api/axios';

function Profile({ user }) {
  const [notificationEmail, setNotificationEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/users/me');
        const email = res.data.notification_email || '';
        setNotificationEmail(email);
        setSavedEmail(email);
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
      await api.patch('/api/users/me/profile', { notification_email: notificationEmail });
      setSavedEmail(notificationEmail);
      setMessage('Notification email saved successfully.');
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

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 600, margin: '2rem auto' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Profile Settings</h2>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '14px' }}>
          Configure where email notifications are sent for your account.
        </p>

        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '0.25rem' }}>
            <strong>Login email:</strong> {user.email}
          </p>
          <p style={{ fontSize: '12px', color: '#888' }}>
            This is your login credential and cannot be changed here.
          </p>
        </div>

        <form onSubmit={handleSave}>
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
              Ticket updates and alerts will be sent to this address.
            </p>
          </div>

          {message && <div className="success" style={{ marginBottom: '1rem' }}>{message}</div>}
          {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save Notification Email'}
            </button>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={sending || !savedEmail}
              title={!savedEmail ? 'Save a notification email first' : `Send test to ${savedEmail}`}
              style={{
                flex: 1,
                background: savedEmail
                  ? 'linear-gradient(45deg, #6bcf7f, #4ecdc4)'
                  : undefined,
              }}
            >
              {sending ? 'Sending...' : `Send Test Email${savedEmail ? ` → ${savedEmail}` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;

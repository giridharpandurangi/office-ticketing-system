import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getSLAStatus, SLA_HOURS } from '../utils/sla';

function TicketDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [engineers, setEngineers] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', comment: '' });
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [submittingVoid, setSubmittingVoid] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const response = await api.get(`/api/tickets/${id}`);
      setTicket(response.data);
    } catch (err) {
      setError('Ticket not found or access denied');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchEngineers = useCallback(async () => {
    try {
      const response = await api.get('/api/users/engineers/list');
      setEngineers(response.data);
    } catch (err) {
      console.error('Failed to load engineers');
    }
  }, []);

  useEffect(() => {
    fetchTicket();
    if (user.role === 'engineer' || user.role === 'admin') {
      fetchEngineers();
    }
  }, [id, user.role, fetchTicket, fetchEngineers]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (submittingComment) return;
    setSubmittingComment(true);
    try {
      await api.post(`/api/tickets/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchTicket();
    } catch (err) {
      setError('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAssignTicket = async (assignedTo) => {
    try {
      await api.patch(`/api/tickets/${id}`, {
        assigned_to: assignedTo === '' ? null : parseInt(assignedTo, 10)
      });
      fetchTicket();
    } catch (err) {
      setError('Failed to assign ticket');
    }
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus !== ticket.status) {
      setStatusUpdate({ status: newStatus, comment: '' });
      setShowStatusModal(true);
    }
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (submittingStatus) return;
    setSubmittingStatus(true);
    try {
      await api.patch(`/api/tickets/${id}`, {
        status: statusUpdate.status,
        comment: statusUpdate.comment
      });
      setShowStatusModal(false);
      setStatusUpdate({ status: '', comment: '' });
      fetchTicket();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update ticket status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleVoidSubmit = async (e) => {
    e.preventDefault();
    if (submittingVoid) return;
    setSubmittingVoid(true);
    try {
      await api.patch(`/api/tickets/${id}/void`, { reason: voidReason });
      setShowVoidModal(false);
      setVoidReason('');
      fetchTicket();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to void ticket');
    } finally {
      setSubmittingVoid(false);
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (error && !ticket) return <div className="container"><div className="error">{error}</div></div>;
  if (!ticket) return <div className="container"><p>Ticket not found</p></div>;

  const canManage = user.role === 'engineer' || user.role === 'admin';
  const isVoided = ticket.status === 'voided';

  return (
    <div className="container">
      <button onClick={() => navigate('/')} style={{ marginBottom: '1rem' }}>← Back to Tickets</button>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>#{ticket.id} — {ticket.title}</h1>
            <p className="text-muted">Created by {ticket.created_by_name || 'Deleted user'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${ticket.status}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
          </div>
        </div>

        {/* Voided reason banner */}
        {isVoided && ticket.voided_reason && (
          <div style={{
            marginTop: '1rem',
            padding: '0.875rem 1rem',
            background: 'rgba(231, 76, 60, 0.08)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '8px',
            color: '#c0392b'
          }}>
            <strong>Void reason:</strong> {ticket.voided_reason}
          </div>
        )}

        <h3 style={{ marginTop: '1.5rem' }}>Description</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</p>

        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div><strong>Category:</strong> {ticket.category_name || 'N/A'}</div>
          <div><strong>Assigned to:</strong> {ticket.assigned_to_name || 'Unassigned'}</div>
          <div><strong>Created:</strong> {new Date(ticket.created_at).toLocaleDateString()}</div>
          {ticket.resolved_at && (
            <div><strong>Resolved:</strong> {new Date(ticket.resolved_at).toLocaleDateString()}</div>
          )}
          {/* SLA info */}
          {ticket.due_at && (
            <div>
              <strong>SLA deadline:</strong>{' '}
              {new Date(ticket.due_at).toLocaleString()}
              {' '}
              <span style={{ fontSize: '12px', color: '#888' }}>
                ({SLA_HOURS[ticket.priority]}h target)
              </span>
            </div>
          )}
          {(() => {
            const sla = getSLAStatus(ticket);
            if (!sla) return null;
            const icon = sla.status === 'overdue' ? '🔴' : sla.status === 'warning' ? '🟡' : '🟢';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>SLA status:</strong>
                <span className={`sla-badge sla-${sla.status}`}>{icon} {sla.label}</span>
              </div>
            );
          })()}
        </div>

        {/* Attachments */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Attachments</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem' }}>
              {ticket.attachments.map((attachment) => (
                <div key={attachment.id} style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: '8px', background: '#f8f9fa' }}>
                  <a
                    href={`/uploads/${attachment.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: '#667eea', fontWeight: 500 }}
                  >
                    📎 {attachment.original_name}
                  </a>
                  <p className="text-muted" style={{ fontSize: '12px', margin: '0.25rem 0 0' }}>
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engineer / Admin actions — hidden for voided tickets */}
        {canManage && !isVoided && (
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Actions</h3>
              {/* Void button — admin only */}
              {user.role === 'admin' && (
                <button
                  onClick={() => { setShowVoidModal(true); setVoidReason(''); }}
                  style={{ background: 'linear-gradient(45deg, #e74c3c, #c0392b)', fontSize: '13px', padding: '0.5rem 1rem' }}
                >
                  Void Ticket
                </button>
              )}
            </div>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Update Status</label>
                <select value={ticket.status} onChange={(e) => handleStatusChange(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Assign to</label>
                <select
                  value={ticket.assigned_to || ''}
                  onChange={(e) => handleAssignTicket(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} {eng.role === 'admin' ? '(admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        <div style={{ marginTop: '2rem' }}>
          <h3>Comments ({ticket.comments?.length || 0})</h3>

          {ticket.comments && ticket.comments.length > 0 ? (
            <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
              {ticket.comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    background: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    borderLeft: '3px solid #667eea'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{comment.user_name || 'Deleted user'}</strong>
                    <span className="text-muted">{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ margin: '1rem 0' }}>No comments yet</p>
          )}

          {/* Hide comment form on voided tickets */}
          {!isVoided && (
            <form onSubmit={handleAddComment}>
              <div className="form-group">
                <label>Add Comment</label>
                <textarea
                  rows="3"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  required
                />
              </div>
              <button type="submit" disabled={submittingComment}>
                {submittingComment ? 'Posting...' : 'Add Comment'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="confirm-overlay">
          <div className="confirm-box" style={{ maxWidth: '500px' }}>
            <h3>Update Ticket Status</h3>
            <p>Changing status to: <strong>{statusUpdate.status.replace('_', ' ').toUpperCase()}</strong></p>
            <form onSubmit={handleStatusUpdateSubmit}>
              <div className="form-group">
                <label>Comment (Required)</label>
                <textarea
                  rows="4"
                  value={statusUpdate.comment}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Please provide a comment explaining the status change..."
                  required
                />
              </div>
              <div className="confirm-actions">
                <button type="button" onClick={() => setShowStatusModal(false)} style={{ background: '#6c757d' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingStatus}>
                  {submittingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Ticket Modal */}
      {showVoidModal && (
        <div className="confirm-overlay">
          <div className="confirm-box" style={{ maxWidth: '500px' }}>
            <h3>Void Ticket</h3>
            <p>
              This will cancel ticket <strong>#{ticket.id}</strong> and mark it as voided.
              <br />
              <span style={{ fontSize: '13px', color: '#888' }}>
                The ticket will be locked — no further updates or comments will be allowed.
              </span>
            </p>
            <form onSubmit={handleVoidSubmit}>
              <div className="form-group">
                <label>Reason (Required)</label>
                <textarea
                  rows="3"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Why is this ticket being voided?"
                  required
                  autoFocus
                />
              </div>
              <div className="confirm-actions">
                <button type="button" onClick={() => setShowVoidModal(false)} style={{ background: '#6c757d' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVoid || !voidReason.trim()}
                  style={{ background: 'linear-gradient(45deg, #e74c3c, #c0392b)' }}
                >
                  {submittingVoid ? 'Voiding...' : 'Void Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketDetail;

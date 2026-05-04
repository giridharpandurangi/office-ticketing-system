import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function TicketDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [engineers, setEngineers] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTicket();
    if (user.role === 'engineer') {
      fetchEngineers();
    }
  }, [id]);

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`/api/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicket(response.data);
    } catch (err) {
      setError('Ticket not found or access denied');
    } finally {
      setLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const response = await axios.get('/api/users/engineers/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEngineers(response.data);
    } catch (err) {
      console.error('Failed to load engineers');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/tickets/${id}/comments`, { content: newComment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewComment('');
      fetchTicket();
    } catch (err) {
      setError('Failed to add comment');
    }
  };

  const handleUpdateTicket = async (status, assignedTo) => {
    try {
      const updateData = {};
      if (status) updateData.status = status;
      if (assignedTo) updateData.assigned_to = assignedTo;

      await axios.patch(`/api/tickets/${id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTicket();
    } catch (err) {
      setError('Failed to update ticket');
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!ticket) return <div className="container"><p>Ticket not found</p></div>;

  return (
    <div className="container">
      <button onClick={() => navigate('/')} style={{ marginBottom: '1rem' }}>← Back to Tickets</button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1>#{ticket.id} - {ticket.title}</h1>
            <p className="text-muted">Created by {ticket.created_by_name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
            <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Description</h3>
        <p>{ticket.description}</p>

        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <strong>Category:</strong> {ticket.category_name || 'N/A'}
          </div>
          <div>
            <strong>Assigned to:</strong> {ticket.assigned_to_name || 'Unassigned'}
          </div>
          <div>
            <strong>Created:</strong> {new Date(ticket.created_at).toLocaleDateString()}
          </div>
          {ticket.resolved_at && (
            <div>
              <strong>Resolved:</strong> {new Date(ticket.resolved_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {ticket.attachments && ticket.attachments.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Attachments</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {ticket.attachments.map((attachment) => (
                <div key={attachment.id} style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px' }}>
                  <a
                    href={`http://localhost:5200/uploads/${attachment.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: '#3498db' }}
                  >
                    {attachment.original_name}
                  </a>
                  <p className="text-muted" style={{ fontSize: '12px', margin: '0.25rem 0' }}>
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {user.role === 'engineer' && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <h3>Engineer Actions</h3>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Update Status</label>
                <select
                  defaultValue={ticket.status}
                  onChange={(e) => handleUpdateTicket(e.target.value, null)}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="form-group">
                <label>Assign to</label>
                <select
                  defaultValue={ticket.assigned_to || ''}
                  onChange={(e) => handleUpdateTicket(null, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <h3>Comments ({ticket.comments?.length || 0})</h3>

          {ticket.comments && ticket.comments.length > 0 ? (
            <div style={{ marginBottom: '1.5rem' }}>
              {ticket.comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    background: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}
                >
                  <strong>{comment.user_name}</strong>
                  <p className="text-muted">{new Date(comment.created_at).toLocaleString()}</p>
                  <p>{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No comments yet</p>
          )}

          <form onSubmit={handleAddComment}>
            <div className="form-group">
              <label>Add Comment</label>
              <textarea
                rows="3"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
              />
            </div>
            <button type="submit">Add Comment</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TicketDetail;

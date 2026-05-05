import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// Fix #20: Pagination constant
const PAGE_SIZE = 10;

function Dashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Fix #13: prevent double-submit
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1); // Fix #20: pagination
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category_id: '',
    attachments: []
  });
  const navigate = useNavigate();

  // Fix #5: wrap in useCallback so useEffect deps are stable
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);

      const response = await api.get(`/api/tickets?${params}`);
      setTickets(response.data);
      setError('');
      setPage(1); // reset to first page when filters change
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
    fetchCategories();
  }, [fetchTickets, fetchCategories]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewTicket(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeAttachment = (index) => {
    setNewTicket(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); // Fix #13: disable button during submit
    setError('');
    try {
      const payload = {
        title: newTicket.title,
        description: newTicket.description,
        priority: newTicket.priority
      };

      if (newTicket.category_id) {
        payload.category_id = newTicket.category_id;
      }

      // Create ticket first
      const ticketResponse = await api.post('/api/tickets', payload);
      const ticketId = ticketResponse.data.id;

      // Upload attachments sequentially if any
      for (const file of newTicket.attachments) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/api/tickets/${ticketId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setNewTicket({ title: '', description: '', priority: 'medium', category_id: '', attachments: [] });
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Fix #20: Pagination logic
  const totalPages = Math.ceil(tickets.length / PAGE_SIZE);
  const paginatedTickets = tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Fix #15: Context-aware heading
  const heading = user.role === 'user' ? 'My Tickets' : 'All Tickets';

  return (
    <div className="container">
      <h1>{heading}</h1>

      {error && <div className="error">{error}</div>}

      {user.role === 'user' && !showForm && (
        <button onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          + Create New Ticket
        </button>
      )}

      {showForm && (
        <div className="card mb-2">
          <h2>Create New Ticket</h2>
          <form onSubmit={handleCreateTicket}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newTicket.title}
                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows="4"
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={newTicket.category_id}
                onChange={(e) => setNewTicket(prev => ({ ...prev, category_id: e.target.value }))}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Attachments (optional)</label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
              {newTicket.attachments.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Selected files:</strong>
                  <ul>
                    {newTicket.attachments.map((file, index) => (
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Fix #13: Disable submit button while submitting */}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#95a5a6' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fix #14: Added category filter to the UI */}
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found{filters.status || filters.category ? ' for the selected filters' : ''}.</p>
        </div>
      ) : (
        <>
          <div>
            {paginatedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`ticket-item ${ticket.priority}-priority`}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>#{ticket.id} — {ticket.title}</h3>
                    {/* Fix #12: Only append ellipsis if description is actually truncated */}
                    <p className="text-muted">
                      {ticket.description.length > 100
                        ? ticket.description.substring(0, 100) + '…'
                        : ticket.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <div>
                      <span className={`badge badge-${ticket.status}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                    </div>
                    <p className="text-muted" style={{ marginTop: '0.25rem' }}>
                      {ticket.category_name || 'Uncategorized'} · {ticket.created_by_name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fix #20: Pagination controls */}
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={p === page ? 'active' : ''}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;

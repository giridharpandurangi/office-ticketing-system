import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getSLAStatus } from '../utils/sla';

const PAGE_SIZE = 10;

function Dashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [searchInput, setSearchInput] = useState('');   // what the user is typing
  const [searchTerm, setSearchTerm] = useState('');     // debounced value sent to API
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category_id: '',
    attachments: []
  });
  const navigate = useNavigate();
  const debounceTimer = useRef(null);

  // Debounce search input — wait 400ms after user stops typing before fetching
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(1);
    }, 400);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
  };

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
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const response = await api.get(`/api/tickets?${params}`);
      setTickets(response.data);
      setError('');
      setPage(1);
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

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
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title: newTicket.title,
        description: newTicket.description,
        priority: newTicket.priority
      };
      if (newTicket.category_id) payload.category_id = newTicket.category_id;

      const ticketResponse = await api.post('/api/tickets', payload);
      const ticketId = ticketResponse.data.id;

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

  const totalPages = Math.ceil(tickets.length / PAGE_SIZE);
  const paginatedTickets = tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const heading = user.role === 'user' ? 'My Tickets' : 'All Tickets';
  const hasActiveSearch = searchTerm.trim().length > 0;

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
                  <option key={category.id} value={category.id}>{category.name}</option>
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

      {/* Search bar */}
      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by ticket ID, title or description…"
            value={searchInput}
            onChange={handleSearchChange}
          />
          {searchInput && (
            <button className="search-clear" onClick={clearSearch} title="Clear search">✕</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_for_approval">Waiting for Approval</option>
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
          {hasActiveSearch
            ? <p>No tickets found for "<strong>{searchTerm}</strong>".</p>
            : <p>No tickets found{filters.status || filters.category ? ' for the selected filters' : ''}.</p>
          }
        </div>
      ) : (
        <>
          {/* Result count when searching */}
          {hasActiveSearch && (
            <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
              {tickets.length} result{tickets.length !== 1 ? 's' : ''} for "<strong>{searchTerm}</strong>"
            </p>
          )}

          <div>
            {paginatedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`ticket-item ${ticket.priority}-priority${ticket.status === 'voided' ? ' voided' : ''}${getSLAStatus(ticket)?.status === 'overdue' ? ' overdue' : ''}`}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>#{ticket.id} — {ticket.title}</h3>
                    <p className="text-muted">
                      {ticket.description.length > 100
                        ? ticket.description.substring(0, 100) + '…'
                        : ticket.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge badge-${ticket.status}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                      {/* SLA badge — only for active tickets */}
                      {(() => {
                        const sla = getSLAStatus(ticket);
                        if (!sla) return null;
                        const icon = sla.status === 'overdue' ? '🔴' : sla.status === 'warning' ? '🟡' : '🟢';
                        return (
                          <span className={`sla-badge sla-${sla.status}`}>
                            {icon} {sla.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-muted" style={{ marginTop: '0.25rem' }}>
                      {ticket.category_name || 'Uncategorized'} · {ticket.created_by_name || 'Deleted user'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

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

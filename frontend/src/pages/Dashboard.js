import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [categories, setCategories] = useState([]);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category_id: '',
    attachments: []
  });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);

      const response = await axios.get(`/api/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchCategories();
  }, [filters]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewTicket({ ...newTicket, attachments: [...newTicket.attachments, ...files] });
  };

  const removeAttachment = (index) => {
    const newAttachments = newTicket.attachments.filter((_, i) => i !== index);
    setNewTicket({ ...newTicket, attachments: newAttachments });
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
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
      const ticketResponse = await axios.post('/api/tickets', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const ticketId = ticketResponse.data.id;

      // Upload attachments if any
      if (newTicket.attachments.length > 0) {
        for (const file of newTicket.attachments) {
          const formData = new FormData();
          formData.append('file', file);

          await axios.post(`/api/tickets/${ticketId}/attachments`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      setNewTicket({ title: '', description: '', priority: 'medium', category_id: '', attachments: [] });
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create ticket');
    }
  };

  return (
    <div className="container">
      <h1>My Tickets</h1>
      
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
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows="4"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
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
                onChange={(e) => setNewTicket({ ...newTicket, category_id: e.target.value })}
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
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
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
              <button type="submit">Create Ticket</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#95a5a6' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p>No tickets found</p>
      ) : (
        <div>
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`ticket-item ${ticket.priority}-priority`}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>#{ticket.id} - {ticket.title}</h3>
                  <p className="text-muted">{ticket.description.substring(0, 100)}...</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>
                    <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                    <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                  </div>
                  <p className="text-muted">By {ticket.created_by_name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;

const cron = require('node-cron');
const { pool } = require('../db/pool');
const { sendEmail } = require('./email');

/**
 * Sends each engineer a morning digest of their open/active tickets.
 * Runs every day at 8:00 AM server time.
 * Only sends if the engineer has a notification_email set.
 */
function startDailyDigest() {
  // Cron: minute hour day month weekday
  // '0 8 * * *' = 8:00 AM every day
  cron.schedule('0 8 * * *', async () => {
    console.log('[Digest] Running daily engineer digest...');
    try {
      await sendDigest();
    } catch (err) {
      console.error('[Digest] Failed:', err.message);
    }
  });

  console.log('[Digest] Daily digest scheduled for 8:00 AM');
}

async function sendDigest() {
  // Get all active engineers/admins who have a notification_email
  const engineersResult = await pool.query(
    "SELECT id, name, notification_email FROM users WHERE role IN ('engineer', 'admin') AND notification_email IS NOT NULL AND COALESCE(is_active, TRUE) = TRUE"
  );

  if (engineersResult.rows.length === 0) return;

  for (const engineer of engineersResult.rows) {
    try {
      // Get their active assigned tickets
      const ticketsResult = await pool.query(
        "SELECT t.id, t.title, t.priority, t.status, t.due_at, u.name as created_by_name " +
        "FROM tickets t LEFT JOIN users u ON t.created_by = u.id " +
        "WHERE t.assigned_to = $1 AND t.status NOT IN ('resolved', 'voided') " +
        "ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at ASC",
        [engineer.id]
      );

      if (ticketsResult.rows.length === 0) continue; // no active tickets, skip

      const tickets = ticketsResult.rows;
      const overdue = tickets.filter(t => t.due_at && new Date(t.due_at) < new Date());
      const total = tickets.length;

      // Build email
      const subject = '[Ticketing] Your daily digest — ' + total + ' active ticket' + (total !== 1 ? 's' : '');

      // Plain text
      let text = 'Good morning ' + engineer.name + ',\n\n';
      text += 'You have ' + total + ' active ticket' + (total !== 1 ? 's' : '') + ' assigned to you';
      if (overdue.length > 0) text += ' (' + overdue.length + ' overdue)';
      text += '.\n\n';

      tickets.forEach(t => {
        const isOverdue = t.due_at && new Date(t.due_at) < new Date();
        text += (isOverdue ? '🔴 ' : '  ') + '#' + t.id + ' [' + t.priority.toUpperCase() + '] ' + t.title + '\n';
        text += '     Status: ' + t.status.replace(/_/g, ' ') + ' | Created by: ' + (t.created_by_name || 'Unknown') + '\n';
        if (t.due_at) {
          text += '     Due: ' + new Date(t.due_at).toLocaleString() + (isOverdue ? ' ⚠️ OVERDUE' : '') + '\n';
        }
        text += '\n';
      });

      text += 'Log in to the ticketing system to action these tickets.\n\nThank you.';

      // HTML
      const priorityColor = { high: '#e74c3c', medium: '#f39c12', low: '#27ae60' };

      let ticketRows = tickets.map(t => {
        const isOverdue = t.due_at && new Date(t.due_at) < new Date();
        const dueStr = t.due_at ? new Date(t.due_at).toLocaleString() : '—';
        return '<tr style="background:' + (isOverdue ? '#fff5f5' : 'white') + '">' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #eee"><strong>#' + t.id + '</strong></td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #eee">' + t.title + '</td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #eee"><span style="color:' + (priorityColor[t.priority] || '#333') + ';font-weight:600">' + t.priority + '</span></td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #eee">' + t.status.replace(/_/g, ' ') + '</td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #eee">' + dueStr + (isOverdue ? ' <strong style="color:#e74c3c">OVERDUE</strong>' : '') + '</td>' +
          '</tr>';
      }).join('');

      const html = '<p>Good morning <strong>' + engineer.name + '</strong>,</p>' +
        '<p>You have <strong>' + total + '</strong> active ticket' + (total !== 1 ? 's' : '') + ' assigned to you' +
        (overdue.length > 0 ? ' (<strong style="color:#e74c3c">' + overdue.length + ' overdue</strong>)' : '') + '.</p>' +
        '<table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:14px">' +
        '<thead><tr style="background:#667eea;color:white">' +
        '<th style="padding:0.6rem 0.75rem;text-align:left">ID</th>' +
        '<th style="padding:0.6rem 0.75rem;text-align:left">Title</th>' +
        '<th style="padding:0.6rem 0.75rem;text-align:left">Priority</th>' +
        '<th style="padding:0.6rem 0.75rem;text-align:left">Status</th>' +
        '<th style="padding:0.6rem 0.75rem;text-align:left">Due</th>' +
        '</tr></thead><tbody>' + ticketRows + '</tbody></table>' +
        '<p>Log in to the ticketing system to action these tickets.</p>' +
        '<p>Thank you.</p>';

      await sendEmail({ to: engineer.notification_email, subject, text, html });
      console.log('[Digest] Sent to ' + engineer.name + ' (' + engineer.notification_email + ') — ' + total + ' tickets');
    } catch (err) {
      console.error('[Digest] Failed for ' + engineer.name + ':', err.message);
    }
  }
}

// Export sendDigest so it can be triggered manually for testing
module.exports = { startDailyDigest, sendDigest };

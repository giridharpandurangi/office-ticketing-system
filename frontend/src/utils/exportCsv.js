/**
 * Converts an array of ticket objects to a CSV string and triggers a download.
 * Exports whatever tickets are currently visible (respects active filters/search).
 */
export function exportTicketsToCSV(tickets, filename) {
  if (!tickets || tickets.length === 0) return;

  const columns = [
    { header: 'ID',           key: 'id' },
    { header: 'Title',        key: 'title' },
    { header: 'Status',       key: 'status' },
    { header: 'Priority',     key: 'priority' },
    { header: 'Category',     key: 'category_name' },
    { header: 'Created By',   key: 'created_by_name' },
    { header: 'Assigned To',  key: 'assigned_to_name' },
    { header: 'Created At',   key: 'created_at' },
    { header: 'Updated At',   key: 'updated_at' },
    { header: 'Resolved At',  key: 'resolved_at' },
    { header: 'Due At (SLA)', key: 'due_at' },
    { header: 'Description',  key: 'description' },
    { header: 'Void Reason',  key: 'voided_reason' },
  ];

  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value)
      .replace(/\r?\n/g, ' ') // flatten newlines
      .replace(/"/g, '""');   // escape double quotes
    // Wrap in quotes if contains comma, quote, or whitespace
    return /[,"\s]/.test(str) ? '"' + str + '"' : str;
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  };

  const dateKeys = new Set(['created_at', 'updated_at', 'resolved_at', 'due_at']);

  const header = columns.map(c => escapeCell(c.header)).join(',');

  const rows = tickets.map(ticket =>
    columns.map(col => {
      const val = ticket[col.key];
      return escapeCell(dateKeys.has(col.key) ? formatDate(val) : val);
    }).join(',')
  );

  const csv = [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'tickets.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// SLA utility — shared across Dashboard and TicketDetail

export const SLA_HOURS = { high: 4, medium: 24, low: 72 };

/**
 * Returns SLA status for a ticket.
 * Only applies to open/in_progress tickets — resolved/voided tickets don't show SLA.
 *
 * Returns: { label, status }
 *   status: 'ok' | 'warning' | 'overdue'
 *   label:  human-readable string like "2h 30m left" or "Overdue by 1d 4h"
 */
export function getSLAStatus(ticket) {
  const activeStatuses = ['open', 'in_progress'];
  if (!activeStatuses.includes(ticket.status) || !ticket.due_at) {
    return null;
  }

  const now = new Date();
  const due = new Date(ticket.due_at);
  const diffMs = due - now;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) {
    // Overdue
    return {
      status: 'overdue',
      label: `Overdue by ${formatDuration(-diffMins)}`
    };
  }

  // Warning threshold: less than 25% of SLA time remaining
  const totalMins = (SLA_HOURS[ticket.priority] || 24) * 60;
  const isWarning = diffMins < totalMins * 0.25;

  return {
    status: isWarning ? 'warning' : 'ok',
    label: `${formatDuration(diffMins)} left`
  };
}

function formatDuration(totalMins) {
  if (totalMins < 60) return `${totalMins}m`;
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

# Feature Roadmap

Track all planned features here. Check off each one after it's implemented and tested.

---

## Your List

- [ ] Email to engineer when a ticket is assigned to them
- [x] User notification preferences — resolve only / any ticket change / disabled
- [x] Admin can void (cancel) tickets
- [x] Admin can assign tickets (currently engineers only)
- [ ] Import users from CSV or Excel (with auto-generated password option)

---

## Additional Features for 100-Person Office

### Ticket Management
- [x] Search — search tickets by title, description, or ticket ID
- [x] SLA / due dates — expected resolution time per priority (e.g. high = 4hrs, medium = 1 day, low = 3 days), overdue tickets flagged visually
- [x] "Waiting for Approval" status — for tickets blocked on external approvals (vendor payment, procurement, etc.) without exposing internal reasons to users
- [x] Ticket re-open — users can re-open a resolved ticket instead of creating a duplicate
- [ ] Bulk actions — select multiple tickets and assign, close, or change status in one go

### User & Access
- [x] Admin can reset user passwords
- [x] Admin can delete users (tickets remain, assignments cleared)
- [ ] Deactivate users — admin can disable accounts without deleting them (e.g. when someone leaves)

### Visibility & Reporting
- [ ] Dashboard stats — summary cards showing open / in-progress / resolved counts and average resolution time
- [ ] Engineer workload view — how many open tickets each engineer currently has
- [ ] Export tickets to CSV — for reporting and management review

### Operational
- [ ] Audit log — record of who changed what and when on every ticket
- [ ] Daily email digest — engineers receive a morning summary of their open tickets

---

## Completed Features (already in codebase)

- [x] User authentication (login / register)
- [x] Role-based access — user, engineer, admin
- [x] Ticket creation with priority and category
- [x] Ticket assignment and status tracking (open / in progress / resolved)
- [x] Comments on tickets
- [x] File attachments on tickets
- [x] Admin panel — user management, create users, change roles
- [x] Email notifications on ticket status change (if notification email is set)
- [x] Profile settings — configure notification email, send test email
- [x] Category filter on dashboard
- [x] Pagination on ticket list
- [x] Role change confirmation dialog
- [x] Double-submit prevention on all forms
- [x] Mobile responsive layout
- [x] Rate limiting on auth endpoints (brute force protection)
- [x] Shared Axios instance with auto auth headers


Search — immediate pain point at scale
Password reset — you'll get support requests for this constantly
Notification preferences (your list)
SLA / due dates — gives the system real operational value
Admin assign + void tickets (your list)
Dashboard stats
CSV import (your list)
Ticket re-open
Deactivate users + change password
Audit log
Bulk actions + export
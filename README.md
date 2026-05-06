# Office Ticketing System

A full-stack web-based support ticketing system built for office environments. Users raise tickets, engineers action them, and admins manage the whole system. Designed for up to 100 users on a local network.

---

## Features

### Ticket Management
- Create tickets with title, description, priority, and category
- File attachments (images, PDF, Word, text — up to 10MB)
- Status workflow: **Open → In Progress → Waiting for Approval → Resolved**
- Void (cancel) tickets with a required reason
- Re-open resolved tickets with a reason
- Search by ticket ID, title, or description
- Filter by status and category
- Pagination (10 per page)
- Export visible tickets to CSV

### SLA & Overdue Tracking
- Automatic due dates set on ticket creation:
  - High priority → 4 hours
  - Medium priority → 24 hours
  - Low priority → 72 hours
- Overdue tickets flagged visually with a pulsing red badge
- SLA deadline and status shown on ticket detail page

### Comments & Audit Log
- Comments on every ticket (all roles)
- Full audit log on every ticket — who changed what and when (engineers/admins only)

### Notifications & Email
- Email to ticket owner on status change (respects notification preferences)
- Email to engineer when a ticket is assigned to them
- User notification preferences: all updates / resolved only / disabled
- Daily digest email to engineers at 8:00 AM with their active tickets
- Test email button in profile settings

### Admin Panel
- **User Management tab**: create, edit roles, reset passwords, deactivate/reactivate, delete users
- **Engineer Workload tab**: visual workload bar per engineer with overdue counts
- **Import Users tab**: bulk import from CSV or Excel with auto-generated password option
- Download CSV import template with example row

### Reporting
- Dashboard stats cards: open, in progress, resolved, overdue, average resolution time
- Stats are scoped — users see their own, engineers/admins see all
- Export to CSV respects active filters and search

### Security
- JWT authentication (7-day tokens)
- Passwords hashed with bcryptjs (10 salt rounds)
- Rate limiting: 20 attempts / 15 min on auth, 300 requests / 15 min on API
- HTTP security headers via Helmet
- Account deactivation — immediate effect on all active sessions
- Users can change their own password (requires current password)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 12+ |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Email | Nodemailer (SMTP) |
| Scheduler | node-cron |
| File upload | Multer |
| Validation | express-validator |
| Security | Helmet, express-rate-limit |

---

## System Requirements

- **Node.js**: 14+
- **PostgreSQL**: 12+
- **OS**: Windows, macOS, or Linux
- **Network**: Local network (users on same WiFi/LAN)

---

## Installation & Setup

### 1. Install PostgreSQL

**Windows:** Download from https://www.postgresql.org/download/windows/

**macOS:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
```

### 2. Create the Database

```bash
createdb ticketing_db
```

Or via psql:
```sql
psql -U postgres
CREATE DATABASE ticketing_db;
\q
```

### 3. Configure the Backend

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ticketing_db
JWT_SECRET=your_secure_random_key_here_minimum_32_chars
PORT=5200
NODE_ENV=development

# Email (required for notifications and digest)
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_USER=your-email@company.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@company.com
```

> ⚠️ **JWT_SECRET must be set** — the server will refuse to start if it is missing or left as the default placeholder.

Install dependencies:
```bash
npm install
```

### 4. Configure the Frontend

```bash
cd frontend
npm install
```

The frontend proxies API calls to `http://localhost:5200` automatically (configured in `package.json`).

---

## Running the Application

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```

Open your browser at **http://localhost:3000**

---

## First-Time Setup

### Create the Admin Account

Run this in psql to create the default admin:

```bash
psql -U postgres ticketing_db
```

```sql
INSERT INTO users (email, password, name, role)
VALUES (
  'admin@ticketing.local',
  '$2a$10$Jpc.o9iXSGRfVYc/hxCqVefE6.5gWK5hx4/A/P.Fxl5vY.0KHK3ha',
  'Admin User',
  'admin'
);
```

**Default credentials:**
- Email: `admin@ticketing.local`
- Password: `admin123`

> ⚠️ Change this password immediately after first login via **Settings → Change Password**.

### Create Users

1. Log in as admin
2. Click **Admin** in the top navigation
3. Use **+ Create New User** or the **Import Users** tab to bulk-create from CSV/Excel

---

## User Roles

### 👤 User
- Create tickets and view their own
- Add comments
- Re-open their own resolved tickets
- Set notification email and preferences
- Change their own password

### 👷 Engineer
- View all tickets
- Assign tickets, update status, add comments
- View audit log on tickets
- Receive assignment emails and daily digest

### 👨‍💼 Admin
- All engineer permissions
- Void tickets
- Manage users (create, edit, reset password, deactivate, delete)
- Import users from CSV/Excel
- View engineer workload
- Send daily digest manually

---

## Ticket Status Workflow

```
Open → In Progress → Waiting for Approval → Resolved
                                          ↑
                              (Re-open returns here)
```

- **Waiting for Approval** — use when a ticket is blocked on external factors (vendor payment, procurement) without exposing internal details to the user
- **Voided** — admin-only, permanently locks the ticket with a reason

---

## Email Notifications

All email features require SMTP settings in `.env`.

| Event | Recipient | Condition |
|-------|-----------|-----------|
| Status change | Ticket owner | Based on notification preference |
| Ticket assigned | Engineer | If notification email is set |
| Daily digest (8 AM) | All engineers | If notification email is set and has active tickets |

**Notification preferences** (set in Profile → Settings):
- **All updates** — notified on every status change
- **Resolved only** — only when ticket is marked resolved
- **Disabled** — no emails

---

## Bulk User Import

Go to **Admin Panel → Import Users tab**.

**Supported formats:** `.csv`, `.xlsx`, `.xls` (max 5MB)

**Column format:**

| Column | Required | Notes |
|--------|----------|-------|
| `name` | ✅ | |
| `email` | ✅ | Used as login ID |
| `password` | optional | Min 6 chars |
| `role` | optional | user / engineer / admin |

- Download the template with **↓ Download Template**
- Enable **Auto-generate passwords** to create random passwords for rows with no password
- Results show created users, skipped duplicates, and per-row errors
- Generated passwords are shown once — save them before leaving the page

---

## Network Access (LAN)

To share with other office computers:

1. Find your IP address:
   - Windows: `ipconfig` → IPv4 Address
   - macOS/Linux: `ifconfig`

2. Share: `http://YOUR_IP:3000`

---

## Database Schema

```
users          — id, email, password, name, role, is_active, notification_email,
                 notification_preference, created_at, updated_at

tickets        — id, title, description, category_id, priority, status,
                 created_by, assigned_to, voided_reason, due_at,
                 created_at, updated_at, resolved_at

comments       — id, ticket_id, user_id, content, created_at

categories     — id, name, description, created_at

attachments    — id, ticket_id, filename, original_name, mime_type, size,
                 path, uploaded_by, created_at

audit_logs     — id, ticket_id, changed_by, action, field,
                 old_value, new_value, created_at
```

**Default categories:** Hardware, Software, Network, Security, Other

---

## API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets (filtered, searched) |
| GET | `/api/tickets/stats` | Dashboard stats |
| GET | `/api/tickets/:id` | Ticket detail with comments |
| GET | `/api/tickets/:id/audit` | Audit log (engineer/admin) |
| POST | `/api/tickets` | Create ticket |
| POST | `/api/tickets/:id/attachments` | Upload attachment |
| POST | `/api/tickets/:id/comments` | Add comment |
| PATCH | `/api/tickets/:id` | Update status/assignment |
| PATCH | `/api/tickets/:id/void` | Void ticket (admin) |
| PATCH | `/api/tickets/:id/reopen` | Re-open resolved ticket |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | All users (admin) |
| GET | `/api/users/me` | Current user profile |
| GET | `/api/users/engineers/list` | Engineers for assignment |
| GET | `/api/users/workload` | Engineer workload (admin) |
| POST | `/api/users` | Create user (admin) |
| POST | `/api/users/import` | Bulk import (admin) |
| POST | `/api/users/me/test-email` | Send test email |
| PATCH | `/api/users/me/profile` | Update notification settings |
| PATCH | `/api/users/me/password` | Change own password |
| PATCH | `/api/users/:id/role` | Change role (admin) |
| PATCH | `/api/users/:id/reset-password` | Reset password (admin) |
| PATCH | `/api/users/:id/toggle-active` | Deactivate/reactivate (admin) |
| DELETE | `/api/users/:id` | Delete user (admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/send-digest` | Trigger digest email (admin) |

---

## Troubleshooting

**Backend won't start — "JWT_SECRET is not set"**
→ Edit `backend/.env` and set a real value for `JWT_SECRET`

**"Failed to load tickets" then logged out**
→ Usually means the backend isn't running. Start it with `npm run dev` in the backend folder.

**Can't access from other computers**
→ Check your IP with `ipconfig`, ensure firewall allows ports 3000 and 5200

**Database connection error**
→ Verify PostgreSQL is running and `DATABASE_URL` in `.env` is correct

**Email not sending**
→ Check `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` in `.env`. Use the **Send Test Email** button in Profile settings to verify.

**Port already in use**
→ Backend: port 5200 | Frontend: port 3000. Change `PORT` in `.env` if needed.

---

## Backup & Restore

```bash
# Backup
pg_dump -U postgres ticketing_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres ticketing_db < backup_2026-05-06.sql
```

---

## Stopping the Application

Press `Ctrl+C` in each terminal.

---

**Version**: 2.0  
**Last Updated**: May 2026  
**License**: Internal Use Only

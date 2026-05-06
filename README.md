# Office Ticketing System

A full-stack web-based support ticketing system built for office environments. Users raise tickets, engineers action them, and admins manage the whole system. Designed for up to 100 users on a local network.

---

## Features

### Ticket Management
- Create tickets with title, description, priority, and category
- File attachments (images, PDF, Word, text — up to 10 MB)
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
- Test-email button in profile settings

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
- JWT authentication (7-day tokens) — server refuses to start if `JWT_SECRET` is missing or left as the default placeholder
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
| Spreadsheet import | csv-parse, exceljs |
| Validation | express-validator |
| Security | Helmet, express-rate-limit |

---

## System Requirements

| Tool | Version |
|------|---------|
| Node.js | 14 or higher |
| npm | 6 or higher (comes with Node.js) |
| PostgreSQL | 12 or higher |
| OS | Windows, macOS, or Linux |
| Network | Local network for shared access (users on same WiFi/LAN) |

---

## Installation & Setup

Follow these steps in order. **Do not skip any step** — each one is required for the app to work.

> **Estimated time:** 15–20 minutes (most of it is downloading installers).

---

### Step 1 — Install Node.js

Node.js runs the backend and the frontend build tools. You need **version 14 or higher** (latest LTS is recommended).

**Windows**
1. Go to https://nodejs.org/en/download/
2. Download the **LTS Windows Installer (.msi)** for your architecture (most likely 64-bit).
3. Run the installer. **Keep all default options** — the "Add to PATH" checkbox must stay ticked.
4. **Close any open Command Prompt / PowerShell windows.**

**macOS**
```bash
# Option A — official installer:
#   download from https://nodejs.org/en/download/ and run the .pkg file

# Option B — using Homebrew (recommended if you already have brew):
brew install node
```

**Linux (Debian/Ubuntu)**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify** — open a **new** terminal and run:
```bash
node --version    # should print v14.x.x or higher (e.g. v20.10.0)
npm --version     # should print 6.x.x or higher
```
If either command says "not recognized" / "command not found", reinstall Node.js and make sure the "Add to PATH" option was selected.

---

### Step 2 — Install PostgreSQL

PostgreSQL stores all the tickets, users, comments, and audit logs. You need **version 12 or higher**.

**Windows**
1. Go to https://www.postgresql.org/download/windows/ and click **Download the installer**.
2. Run the installer and accept the defaults, **except** for these screens:
   - **Components** — keep "PostgreSQL Server", "pgAdmin 4", and **"Command Line Tools"** all ticked. The Command Line Tools include `psql`, which the setup script needs.
   - **Password** — set a password for the `postgres` superuser. **Write it down — you will need it in Step 4.**
   - **Port** — leave at `5432`.
3. After install, finish the wizard (you can untick "Stack Builder" at the end).
4. **Add `psql` to PATH** (the installer often skips this):
   - Open **Start → Edit the system environment variables → Environment Variables**
   - Under **System variables**, select `Path` → **Edit** → **New** → add:
     `C:\Program Files\PostgreSQL\17\bin` (replace `17` with your installed version)
   - Click OK on all dialogs.
5. **Close any open Command Prompt windows** so the new PATH takes effect.

**macOS**
```bash
brew install postgresql@15
brew services start postgresql@15

# On macOS, the 'postgres' superuser has no password by default.
# Set one so the setup script can authenticate:
psql postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
# (substitute 'postgres' with any password you prefer, and remember it)
```

**Linux (Debian/Ubuntu)**
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Ubuntu uses peer authentication by default — set a password for 'postgres':
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
# (substitute 'postgres' with any password you prefer, and remember it)
```

**Verify** — open a **new** terminal and run:
```bash
psql --version    # should print psql (PostgreSQL) 12.x or higher
```
If "not recognized" / "command not found":
- **Windows:** PATH wasn't updated — redo step 2.4 above.
- **macOS/Linux:** ensure the install completed and the service is running.

---

### Step 3 — Get the project

If you haven't already, get the project onto your machine:
```bash
git clone <your-repo-url>
cd ticketing-system
```
Or download it as a ZIP and extract it. From here on, **all commands assume you are in the project root** (the folder containing `setup.sh`, `setup.bat`, `backend/`, and `frontend/`).

---

### Step 4 — Run the setup script

The setup script handles **everything else automatically**: creates the database, configures `.env` (including a securely generated `JWT_SECRET`), installs all dependencies, initialises the schema, and creates the admin user.

**Windows**
1. Open **Command Prompt** in the project root.
   - Easy way: in File Explorer, hold **Shift** and right-click the project folder → "Open in Terminal" / "Open command window here".
2. Run:
   ```bat
   setup.bat
   ```
   Or just **double-click `setup.bat`** in File Explorer.
3. When prompted, type the PostgreSQL password you set in Step 2, then press **Enter**.
4. Wait — the script prints `[1/6]` through `[6/6]` and finishes with `Setup Complete!`. This typically takes 2–5 minutes (most of it is `npm install`).

**macOS / Linux**
```bash
chmod +x setup.sh
./setup.sh
```
When prompted, type your PostgreSQL password and press **Enter**.

**Non-interactive (CI / scripted):**
```bash
PGPASSWORD=yourpassword ./setup.sh        # macOS/Linux
set PGPASSWORD=yourpassword && setup.bat  # Windows cmd
```

**What the script does:**
1. Verifies Node.js, npm, and PostgreSQL are installed
2. Creates the `ticketing_db` database
3. Generates `backend/.env` with the correct `DATABASE_URL` and a secure random `JWT_SECRET`
4. Runs `npm install` for both backend and frontend
5. Creates database tables (users, tickets, comments, categories, attachments, audit_logs)
6. Creates the default admin account

If the script fails, jump to [Troubleshooting](#troubleshooting) — the error message will tell you what went wrong (most often a wrong PostgreSQL password or `psql` not in PATH). A [Manual Setup](#manual-setup-fallback-only) section is also available below.

---

### Step 5 — Configure email (required for notifications & daily digest)

Email is **optional** — the app will still work without it — but **all notification features depend on it**: status-change emails, assignment emails, the 8 AM digest, and the test-email button.

Open `backend/.env` in any text editor and fill in these five lines:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=noreply@ticketing-system.local
```

**For Gmail:**
1. Enable 2-Step Verification on your Google account: https://myaccount.google.com/security
2. Create an **App Password**: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)" → name it "Ticketing System"
   - Google will give you a 16-character password — paste it as `EMAIL_PASS`.
3. Set `EMAIL_USER` to your Gmail address.

**Do not use your normal Gmail password** — it will not work. You must use an App Password.

For other SMTP providers (Outlook, Office 365, your company server), set `EMAIL_HOST`, `EMAIL_PORT`, and credentials accordingly.

After starting the app, verify your settings via **Profile → Send Test Email**.

---

### Step 6 — Start the application

You need **two terminals open at the same time** — one for the backend, one for the frontend.

**Terminal 1 — Backend** (port 5200):
```bash
cd backend
npm start          # or 'npm run dev' for auto-reload during development
```
Wait until you see:
```
Database tables initialized successfully
Server running on port 5200
```

**Terminal 2 — Frontend** (port 3000):
```bash
cd frontend
npm start
```
Your browser should open automatically at **http://localhost:3000**. If not, open it manually.

> Leave **both** terminals open while using the app. Closing either one stops that service.

---

### Step 7 — Log in and change the admin password

1. Browser is at http://localhost:3000 → you'll see the login page.
2. Log in with:
   - **Email:** `admin@ticketing.local`
   - **Password:** `admin123`
3. Click **Profile** in the top navigation.
4. **Change the password immediately.** This is the most important step — the default password is publicly documented.

You're done! Create user accounts via **Admin → + Create New User** (or the **Import Users** tab for bulk CSV/Excel import — see [Bulk User Import](#bulk-user-import)), share the URL with your team (see [Network Access](#network-access-lan)), and start tracking tickets.

---

### Manual Setup (fallback only)

Use this **only** if `setup.sh` / `setup.bat` failed and you want to install by hand.

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE ticketing_db;"

# 2. Configure backend env
cd backend
cp .env.example .env       # Windows: copy .env.example .env
# Edit .env and set:
#   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ticketing_db
#   JWT_SECRET=any_long_random_string_minimum_32_chars
#   (server refuses to start if JWT_SECRET is missing or left as the default)

# 3. Install dependencies
npm install
cd ../frontend && npm install && cd ..

# 4. Create the admin user (also initialises DB schema)
cd backend && node create_admin.js && cd ..
```

Then continue from **Step 5** above.

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
- Receive assignment emails and the daily digest

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

All email features require SMTP settings in `.env` (see [Step 5](#step-5--configure-email-required-for-notifications--daily-digest)).

| Event | Recipient | Condition |
|-------|-----------|-----------|
| Status change | Ticket owner | Based on notification preference |
| Ticket assigned | Engineer | If notification email is set |
| Daily digest (8 AM) | All engineers | If notification email is set and engineer has active tickets |

**Notification preferences** (set in Profile → Settings):
- **All updates** — notified on every status change
- **Resolved only** — only when ticket is marked resolved
- **Disabled** — no emails

---

## Bulk User Import

Go to **Admin Panel → Import Users tab**.

**Supported formats:** `.csv`, `.xlsx`, `.xls` (max 5 MB)

**Column format:**

| Column | Required | Notes |
|--------|----------|-------|
| `name` | ✅ | |
| `email` | ✅ | Used as login ID |
| `password` | optional | Min 6 chars |
| `role` | optional | `user` / `engineer` / `admin` |

- Download the template with **↓ Download Template**
- Enable **Auto-generate passwords** to create random passwords for rows with no password
- Results show created users, skipped duplicates, and per-row errors
- Generated passwords are shown once — save them before leaving the page

---

## Network Access (LAN)

To share with other office computers on the same WiFi/LAN:

1. Find your machine's IP address:
   - **Windows:** run `ipconfig` → look for **IPv4 Address** (e.g. `192.168.1.100`)
   - **macOS/Linux:** run `ifconfig | grep 'inet ' | grep -v 127.0.0.1`

2. Share this URL with your colleagues: `http://192.168.1.100:3000`

3. Make sure your firewall allows inbound connections on port **3000** (frontend) and **5200** (backend API).

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

### `psql` not found on Windows after installing PostgreSQL
The PostgreSQL Windows installer doesn't always add `psql` to PATH.
- Default install path: `C:\Program Files\PostgreSQL\17\bin` (the version number varies)
- Add that folder to your **System PATH**, then **close and re-open** Command Prompt before re-running `setup.bat`.

### `psql` "peer authentication failed" on fresh Ubuntu/Debian
Default Ubuntu PostgreSQL uses peer auth, so the `postgres` user has no password yet. Set one before running setup:
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'yourpassword';"
```
Then run `PGPASSWORD=yourpassword ./setup.sh`.

### Backend won't start — "JWT_SECRET is not set"
Edit `backend/.env` and set a real value for `JWT_SECRET` (any long random string, 32+ chars). The setup script auto-generates one — if you see this error, your `.env` was probably created manually.

### "Failed to load tickets" then logged out
Usually means the backend isn't running. Start it with `npm start` (or `npm run dev`) in the `backend` folder.

### Cannot connect from another computer
- Verify your IP: `ipconfig` (Windows) / `ifconfig` (macOS/Linux)
- Ensure firewall allows ports **3000** and **5200**
- Use the machine's IP, not `localhost`

### Database connection error
- Check PostgreSQL is running (`pg_isready -U postgres`)
- Verify the password in `backend/.env` matches your PostgreSQL `postgres` user password
- Re-run: `psql -U postgres -c "CREATE DATABASE ticketing_db;"` if the DB was dropped

### Email not sending
Check `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` in `backend/.env`. Use **Profile → Send Test Email** to verify. For Gmail, make sure you're using an **App Password**, not your normal account password.

### Port already in use
- Backend: port **5200** — change `PORT=` in `backend/.env`
- Frontend: port **3000** — set `PORT=3001 npm start` or accept React's prompt to use the next free port

### Admin user already exists
If you re-run the setup script, the admin-creation step is safely skipped.
To reset:
```bash
psql -U postgres ticketing_db -c "DELETE FROM users WHERE email='admin@ticketing.local';"
cd backend && node create_admin.js
```

---

## Backup & Restore

```bash
# Backup
pg_dump -U postgres ticketing_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres ticketing_db < backup_20260506.sql
```

---

## Stopping the Application

Press `Ctrl+C` in each terminal.

---

**Version:** 2.0  
**Last Updated:** May 2026  
**License:** Internal Use Only

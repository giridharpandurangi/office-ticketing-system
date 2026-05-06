# Office Ticketing System

A full-stack web-based ticketing system for managing support tickets within your office. Users can create tickets, engineers can assign and resolve them, and admins manage the whole team.

## Features

- User authentication (email / password with JWT)
- User registration and account creation
- Ticket creation with priority levels and categories
- File attachments on tickets
- Ticket assignment and status tracking
- Comments on tickets
- Email notifications on ticket updates
- Admin panel for user management
- Role-based access (User, Engineer, Admin)
- Responsive web interface

## System Requirements

| Tool | Version |
|------|---------|
| Node.js | 14 or higher |
| npm | 6 or higher (comes with Node.js) |
| PostgreSQL | 12 or higher |
| OS | Windows, macOS, or Linux |

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
# Option A — using the official installer:
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

PostgreSQL stores all the tickets, users, and comments. You need **version 12 or higher**.

**Windows**
1. Go to https://www.postgresql.org/download/windows/ and click **Download the installer**.
2. Run the installer and accept the defaults, **except** for these screens:
   - **Components** — keep "PostgreSQL Server", "pgAdmin 4", and **"Command Line Tools"** all ticked. The Command Line Tools include `psql`, which the setup script needs.
   - **Password** — set a password for the `postgres` superuser. **Write it down — you will need it in Step 4.**
   - **Port** — leave at `5432`.
3. After install, finish the wizard (you can untick "Stack Builder" at the end).
4. **Add psql to PATH** (the installer often skips this):
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

### Step 3 — Download the project

If you haven't already, get the project onto your machine:
```bash
git clone <your-repo-url>
cd ticketing-system
```
Or download it as a ZIP and extract it. From here on, **all commands assume you are in the project root** (the folder containing `setup.sh`, `setup.bat`, `backend/`, and `frontend/`).

---

### Step 4 — Run the setup script

The setup script handles **everything else automatically**: creates the database, configures `.env`, installs all dependencies, initialises the schema, and creates the admin user.

**Windows**
1. Open **Command Prompt** (or PowerShell) in the project root.
   - Easy way: in File Explorer, hold **Shift** and right-click the project folder → "Open in Terminal" / "Open command window here".
2. Run:
   ```bat
   setup.bat
   ```
   Or just **double-click `setup.bat`** in File Explorer.
3. When prompted, type the PostgreSQL password you set in Step 2, then press **Enter**.
4. Wait — the script will print `[1/6]` through `[6/6]` and finish with `Setup Complete!`. This typically takes 2–5 minutes (most of it is `npm install`).

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
5. Creates database tables (users, tickets, comments, categories, attachments)
6. Creates the default admin account

**If the script fails**, jump to the [Troubleshooting](#troubleshooting) section below — the error message will tell you what went wrong (usually wrong PostgreSQL password or `psql` not in PATH).

---

### Step 5 — Configure email notifications (optional)

Skip this if you don't want email alerts. The app will still work, but no notifications will be sent.

Open `backend/.env` in any text editor and update these five lines:

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

---

### Step 6 — Start the application

You need **two terminals open at the same time** — one for the backend, one for the frontend.

**Terminal 1 — Backend** (port 5200):
```bash
cd backend
npm start
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

You're done! Create user accounts via **Admin → + Create New User**, share the URL with your team (see [Network Access](#network-access-sharing-with-office)), and start tracking tickets.

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
#   JWT_SECRET=any_long_random_string

# 3. Install dependencies
npm install
cd ../frontend && npm install && cd ..

# 4. Create the admin user (also initialises DB schema)
cd backend && node create_admin.js && cd ..
```

Then continue from **Step 5** above.

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **User** | Create tickets, view own tickets, add comments |
| **Engineer** | View all tickets, assign & resolve tickets, add comments |
| **Admin** | Everything an Engineer can do, plus create/manage user accounts and change roles |

## Creating Users

1. Login as admin
2. Click **Admin** in the top navigation
3. Click **+ Create New User**
4. Fill in the details and select a role

---

## Network Access (sharing with office)

1. Find your machine's IP address:
   - **Windows:** run `ipconfig` → look for **IPv4 Address** (e.g. `192.168.1.100`)
   - **macOS/Linux:** run `ifconfig | grep 'inet ' | grep -v 127.0.0.1`

2. Share this URL with your colleagues: `http://192.168.1.100:3000`

3. Make sure your firewall allows inbound connections on port **3000** (frontend) and **5200** (backend API).

---

## Ticket Reference

**Priorities:** High · Medium · Low

**Statuses:** Open → In Progress → Resolved

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

### Backend won't start
- Confirm PostgreSQL is running (`pg_isready -U postgres`)
- Check `backend/.env` — `DATABASE_URL` must match your PostgreSQL password
- Run `cd backend && npm install` again

### Cannot connect from another computer
- Verify your IP: `ipconfig` (Windows) / `ifconfig` (macOS/Linux)
- Ensure firewall allows port **3000** and **5200**
- Use the machine's IP, not `localhost`

### Database connection error
- Check PostgreSQL is running
- Confirm the password in `backend/.env` is correct
- Re-run: `psql -U postgres -c "CREATE DATABASE ticketing_db;"` if the DB was dropped

### Port already in use
- Backend: port **5200** — change `PORT=` in `backend/.env`
- Frontend: port **3000** — set `PORT=3001 npm start` or accept React's prompt to use the next free port

### Admin user already exists
If you re-run the setup script the admin-creation step is safely skipped.
To reset: `psql -U postgres ticketing_db -c "DELETE FROM users WHERE email='admin@ticketing.local';"` then re-run `node create_admin.js` from the `backend` folder.

---

## Stopping the Application

Press `Ctrl+C` in each terminal.

---

## Backup & Restore

```bash
# Backup
pg_dump -U postgres ticketing_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres ticketing_db < backup_20260506.sql
```

---

**Created:** May 2026  
**License:** Internal Use Only

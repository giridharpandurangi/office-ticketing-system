# Getting Started Checklist

## Pre-Setup (5 minutes)
- [ ] Download and install PostgreSQL from https://www.postgresql.org/download/windows/
- [ ] Write down your PostgreSQL password (you chose during install)
- [ ] Verify Node.js is installed: `node --version` (should be v14+)
- [ ] Verify npm is installed: `npm --version`

## Initial Setup (10 minutes)

### Option A: Automated (Windows)
- [ ] Run `d:\projects\ticketing-system\setup.bat`
- [ ] Edit `backend\.env` with PostgreSQL password
- [ ] Go to "Running the System"

### Option B: Manual Setup
- [ ] Create database: `createdb ticketing_db`
- [ ] Copy `backend\.env.example` to `backend\.env`
- [ ] Edit `backend\.env`:
  ```
  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ticketing_db
  JWT_SECRET=your_secret_key_here
  ```
- [ ] Run `backend`: `cd backend && npm install`
- [ ] Run `frontend`: `cd frontend && npm install`

## Running the System (3 terminals)

### Terminal 1: PostgreSQL Check
```bash
psql -U postgres -c "SELECT 1"
```
Should return: `1`

### Terminal 2: Backend
```bash
cd d:\projects\ticketing-system\backend
npm start
```
You should see: `Server running on port 5000`

### Terminal 3: Frontend
```bash
cd d:\projects\ticketing-system\frontend
npm start
```
Browser opens automatically to: `http://localhost:3000`

## First Login
- [ ] Email: `admin@ticketing.local`
- [ ] Password: `admin123`
- [ ] Login successfully
- [ ] **IMPORTANT: Change password immediately!**

## Create Your First User (Optional - Test)
- [ ] Click "Admin" in top navigation
- [ ] Click "+ Create New User"
- [ ] Create a test user (role: User)
- [ ] Test login with that user

## Setup Network Access
- [ ] Get your laptop IP: `ipconfig` → Look for "IPv4 Address"
- [ ] Test URL: `http://YOUR_IP:3000` on another computer
- [ ] Create engineer accounts for your 2 service engineers:
  - [ ] Engineer 1: Name, Email, Password, Role = "engineer"
  - [ ] Engineer 2: Name, Email, Password, Role = "engineer"
- [ ] Give them the URL and credentials

## Regular Use
- [ ] Terminal 1: Verify PostgreSQL is running
- [ ] Terminal 2: Run backend
- [ ] Terminal 3: Run frontend
- [ ] Share URL with team: `http://YOUR_IP:3000`
- [ ] Users login and start creating tickets!

## Daily Operations

### Your Checklist (Admin/You)
- [ ] Backend running
- [ ] Frontend running
- [ ] Shared URL with team
- [ ] Monitor for any issues
- [ ] Create new user accounts as needed (Admin panel)

### Engineer Checklist (Service Engineers)
- [ ] Access ticketing system
- [ ] Check new/open tickets
- [ ] Assign tickets
- [ ] Update status when working on tickets
- [ ] Add comments with progress

### User Checklist (Office Staff)
- [ ] Access ticketing system
- [ ] Create ticket when need support
- [ ] Add details: title, description, priority
- [ ] Check ticket status
- [ ] Reply with comments

## Backup

### Weekly Backup (5 minutes)
```bash
pg_dump -U postgres ticketing_db > backup-$(date +%Y%m%d).sql
```
Store in cloud or external drive

## Troubleshooting Quick Guide

| Problem | Solution |
|---------|----------|
| Can't connect to DB | Check PostgreSQL running & .env password |
| Port 3000 already in use | Kill process or use different port |
| Port 5000 already in use | Check backend isn't running twice |
| Can't access from other PC | Check IP with `ipconfig`, firewall settings |
| Backend crashes immediately | Check .env file, PostgreSQL running |
| Users can't login | Verify user was created in admin panel |
| "Invalid token" errors | Try clearing browser cache & login again |

## Security Checklist

- [ ] Changed default admin password
- [ ] Only gave out correct credentials
- [ ] PostgreSQL password is secure
- [ ] System not accessible from internet
- [ ] Only trusted users have access
- [ ] Backups stored safely
- [ ] No passwords in .env file shared

## Performance Checklist

- [ ] Backend doesn't use high CPU
- [ ] Frontend is responsive
- [ ] Pages load quickly
- [ ] No error messages in console
- [ ] Database isn't growing too large
- [ ] Tickets load in <2 seconds

## Optimization (Optional - If Needed)

- [ ] Add database indexes
- [ ] Implement pagination (for 1000+ tickets)
- [ ] Add caching
- [ ] Load balance multiple backend instances

## Monthly Maintenance

- [ ] Review ticket statistics
- [ ] Archive old tickets
- [ ] Update backups
- [ ] Check for errors in logs

## Planned Features

- [x] When engineer changes state of ticket, comment is mandatory
- [ ] Add submit button for engineer and user (nice to have, not mandatory)
- [ ] Implement SMTP tool for email reminders:
  - [ ] Email to user when ticket state changes or ticket closes
  - [ ] Email to engineer when ticket is created by user
- [ ] Admin access enhancements:
  - [ ] Admin can void tickets
  - [ ] Admin can assign tickets
- [ ] Import users from Excel or CSV (important, auto-generate password option not mandatory)
- [ ] Plan for upgrades/improvements

## Escalation Path (When Issues)

1. Check troubleshooting guide (see above)
2. Check NETWORK.md for network issues
3. Check README.md for detailed help
4. Check ARCHITECTURE.md for technical details
5. Review error messages in terminals/browser console

## Going Live Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] Backend installed and tested
- [ ] Frontend installed and tested
- [ ] Admin password changed
- [ ] Engineer accounts created (2)
- [ ] Network accessible from other computers
- [ ] Backups working
- [ ] Firewall configured
- [ ] All documentation saved
- [ ] Team trained on system
- [ ] Ready for first users!

---

**Expected Timeline:**
- Setup: 15-30 minutes (first time)
- Daily operation: 2 minutes to start
- Maintenance: 30 minutes weekly

**Questions?** Check the documentation files in the project folder.

Good luck! 🚀

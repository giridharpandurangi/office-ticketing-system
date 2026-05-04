# Office Ticketing System

A full-stack web-based ticketing system for managing support tickets within your office. Users can create tickets, and engineers can assign and resolve them.

## Features

✅ User authentication (email/password)
✅ User registration & account creation
✅ Ticket creation with priority levels and categories
✅ Ticket assignment and status tracking
✅ Comments on tickets
✅ Admin panel for user management
✅ Role-based access (User, Engineer, Admin)
✅ Responsive web interface

## System Requirements

- **Backend**: Node.js 14+ and npm
- **Database**: PostgreSQL 12+
- **OS**: Windows, macOS, or Linux
- **Network**: Local network access (users on same WiFi/LAN)

## Installation & Setup

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Install and remember the password you set for the `postgres` user

**macOS:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
```

### 2. Create Database

Open PostgreSQL command prompt/terminal and run:

```bash
createdb ticketing_db
```

Or using psql:
```bash
psql -U postgres
CREATE DATABASE ticketing_db;
\q
```

### 3. Setup Backend

```bash
cd d:\projects\ticketing-system\backend

# Copy environment file
copy .env.example .env

# Edit .env file with your settings
# Important: Update DATABASE_URL and JWT_SECRET
```

Edit `.env` file:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ticketing_db
JWT_SECRET=your_secure_random_key_here
PORT=5200
NODE_ENV=development
```

Install dependencies:
```bash
npm install
```

### 4. Setup Frontend

```bash
cd d:\projects\ticketing-system\frontend
npm install
```

## Running the Application

### Terminal 1 - Start Backend Service

```bash
cd d:\projects\ticketing-system\backend
npm start
```

You should see:
```
Server running on port 5200
```

### Terminal 2 - Start Frontend Service

```bash
cd d:\projects\ticketing-system\frontend
npm start
```

The browser should open at `http://localhost:3000`.

If port 3000 is already occupied, React may prompt to use another port. Accept with `Y` and the app will start on the next free port.

## First Time Setup

### 1. Create Admin User

You need to create the first admin manually. Use psql:

```bash
psql -U postgres ticketing_db
```

Then run:
```sql
INSERT INTO users (email, password, name, role) 
VALUES ('admin@ticketing.local', '$2a$10$Jpc.o9iXSGRfVYc/hxCqVefE6.5gWK5hx4/A/P.Fxl5vY.0KHK3ha', 'Admin User', 'admin');
```

**Default login:**
- Email: `admin@ticketing.local`
- Password: `admin123`

⚠️ **IMPORTANT:** Change this password immediately after first login!

### 2. Access the Application

Open your browser and go to: **http://localhost:3000**

### 3. Create Users via Admin Panel

1. Login as admin
2. Click "Admin" in the top navigation
3. Click "+ Create New User"
4. Fill in user details and select their role:
   - **User**: Can create and view their own tickets
   - **Engineer**: Can view all tickets, assign, and resolve them
   - **Admin**: Can manage users and view all tickets

## User Roles

### 👤 User
- Create new tickets
- View their own tickets
- Add comments to tickets
- See ticket status updates

### 👨‍💼 Engineer
- View all tickets
- Assign tickets to themselves or other engineers
- Update ticket status (Open → In Progress → Resolved)
- Add comments
- Track ticket resolution

### 👨‍💻 Admin
- All engineer permissions
- Create and manage user accounts
- Change user roles
- Full system access

## Network Access

To access from other computers on your network:

1. Find your laptop's IP address:
   - Windows: `ipconfig` (look for IPv4 Address, e.g., 192.168.x.x)
   - macOS/Linux: `ifconfig`

2. Share the URL with users: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

3. Users can login with their credentials

## Default Priorities

- **High**: Critical/Urgent issues
- **Medium**: Standard issues
- **Low**: Non-urgent issues

## Default Ticket Status

- **Open**: New ticket, not started
- **In Progress**: Being worked on
- **Resolved**: Completed and closed

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL in .env is correct
- Run: `npm install` again

### Can't access from other computers
- Check your laptop's IP address: `ipconfig`
- Ensure firewall allows port 3000 and 5000
- Use IP instead of localhost: `http://192.168.x.x:3000`

### Database connection error
- Check PostgreSQL is running
- Verify username/password in .env
- Create the database: `createdb ticketing_db`

### Port already in use
- Backend uses port 5000
- Frontend uses port 3000
- If ports are taken, edit .env (BACKEND) and .env in frontend folder

## Stopping the Application

Press `Ctrl+C` in each terminal to stop the servers.

## Backup Your Data

Regular PostgreSQL backups:
```bash
pg_dump -U postgres ticketing_db > backup.sql
```

Restore from backup:
```bash
psql -U postgres ticketing_db < backup.sql
```

## Future Enhancements

- Email notifications on ticket updates
- Ticket priority queue view
- SLA tracking
- Advanced reporting
- Bulk operations
- Mobile app

## Support

For issues or questions, check:
1. Database connection
2. Environment variables (.env)
3. PostgreSQL is running
4. Node.js and npm versions

---

**Created**: May 2026  
**License**: Internal Use Only

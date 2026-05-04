# Quick Start Guide

## 5-Minute Setup

### 1. Install PostgreSQL
- Go to https://www.postgresql.org/download/
- Install and remember the password

### 2. Create Database
```bash
createdb ticketing_db
```

### 3. Setup Backend (.env)
```bash
cd backend
copy .env.example .env
# Edit .env with your PostgreSQL password
```

### 4. Install & Run Backend
```bash
cd backend
npm install
npm start
```

Backend runs on port `5200` by default.

### 5. Install & Run Frontend (in a new terminal)
```bash
cd frontend
npm install
npm start
```

Frontend runs on port `3000` by default.

If port `3000` is already in use, choose `Y` when prompted and the app will open on the next available port.

### 6. First Login
- URL: http://localhost:3000
- Email: admin@ticketing.local
- Password: admin123
- Create users via Admin panel

### 7. Share with Team
- Get your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Share: `http://YOUR_IP:3000`
- Users login and create tickets!

## That's it! 🎉

For full details, see [README.md](README.md)

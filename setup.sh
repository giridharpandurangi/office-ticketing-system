#!/bin/bash

# One-click setup for Office Ticketing System (macOS / Linux)
# Usage:
#   ./setup.sh                        # will prompt for PostgreSQL password
#   PGPASSWORD=yourpass ./setup.sh    # fully non-interactive

set -e

echo ""
echo "============================================"
echo " Office Ticketing System - Setup Script"
echo "============================================"
echo ""

# ---------- helpers ----------
fail() { echo ""; echo "ERROR: $*"; echo ""; exit 1; }
command_exists() { command -v "$1" &>/dev/null; }

# ---------- 1. Prerequisites ----------
echo "[1/6] Checking prerequisites..."

command_exists node || fail "Node.js is not installed. Download from: https://nodejs.org/"
command_exists npm  || fail "npm is not installed (usually ships with Node.js)."
command_exists psql || fail "PostgreSQL (psql) not found in PATH.
  macOS:  brew install postgresql@15 && brew services start postgresql@15
  Ubuntu: sudo apt-get install -y postgresql postgresql-contrib && sudo systemctl start postgresql"

NODE_MAJOR=$(node -e "console.log(parseInt(process.version.slice(1)))")
[ "$NODE_MAJOR" -ge 14 ] || fail "Node.js 14+ required. You have $(node --version)."

echo "  Node $(node --version)  |  npm $(npm --version)  |  $(psql --version | head -1)"
echo ""

# ---------- 2. Database ----------
echo "[2/6] Setting up PostgreSQL database..."
echo ""

if [ -z "$PGPASSWORD" ]; then
    echo "Enter the PostgreSQL password for user 'postgres'."
    echo "(Press ENTER to try the default password 'postgres'):"
    read -r -s PG_PASS
    echo ""
    [ -n "$PG_PASS" ] || PG_PASS="postgres"
    export PGPASSWORD="$PG_PASS"
fi

# Verify connection
psql -U postgres -c '\q' 2>/dev/null \
    || fail "Cannot connect to PostgreSQL. Check that the service is running and the password is correct.
Tip: run  PGPASSWORD=yourpassword ./setup.sh"

# Create database (safe if it already exists)
if psql -U postgres -lqt 2>/dev/null | cut -d\| -f1 | grep -qw ticketing_db; then
    echo "  Database 'ticketing_db' already exists."
else
    psql -U postgres -c "CREATE DATABASE ticketing_db;" \
        && echo "  Database 'ticketing_db' created."
fi
echo ""

# ---------- 3. Environment ----------
echo "[3/6] Configuring backend environment..."

cd backend

[ -f .env.example ] || fail ".env.example not found. Are you running this from the project root?"

[ -f .env ] || cp .env.example .env

# Use Node.js (guaranteed available) to safely edit .env,
# handling any special characters in the password.
node -e "
  const fs   = require('fs');
  const pass = encodeURIComponent(process.argv[1]);
  const dbUrl = 'postgresql://postgres:' + pass + '@localhost:5432/ticketing_db';
  const jwt   = require('crypto').randomBytes(32).toString('hex');
  let env = fs.readFileSync('.env', 'utf8');
  env = env.replace(/DATABASE_URL=.*/m, 'DATABASE_URL=' + dbUrl);
  env = env.replace(/JWT_SECRET=.*/m,   'JWT_SECRET='   + jwt);
  fs.writeFileSync('.env', env);
" "$PGPASSWORD"

echo "  DATABASE_URL -> postgresql://postgres:***@localhost:5432/ticketing_db"
echo "  JWT_SECRET   -> (auto-generated, 256-bit random)"
echo ""
cd ..

# ---------- 4. Backend dependencies ----------
echo "[4/6] Installing backend dependencies..."
cd backend && npm install && cd ..
echo ""

# ---------- 5. Frontend dependencies ----------
echo "[5/6] Installing frontend dependencies..."
cd frontend && npm install && cd ..
echo ""

# ---------- 6. Database schema + admin user ----------
echo "[6/6] Initialising database schema and creating admin user..."
cd backend

ADMIN_OUT=$(node create_admin.js 2>&1) && ADMIN_EXIT=0 || ADMIN_EXIT=$?

if [ $ADMIN_EXIT -eq 0 ]; then
    echo "  Admin user created: admin@ticketing.local / admin123"
elif echo "$ADMIN_OUT" | grep -qi "duplicate\|already exists\|unique constraint"; then
    echo "  Admin user already exists (skipped)."
else
    echo "  WARNING: $ADMIN_OUT"
fi
cd ..
echo ""

# ---------- Done ----------
echo "============================================"
echo " Setup Complete!"
echo "============================================"
echo ""
echo "MANUAL STEPS REQUIRED:"
echo ""
echo "  1. (Recommended) Configure email notifications:"
echo "     Edit  backend/.env  and fill in your SMTP details:"
echo ""
echo "       EMAIL_HOST=smtp.gmail.com"
echo "       EMAIL_PORT=587"
echo "       EMAIL_USER=your-email@gmail.com"
echo "       EMAIL_PASS=your-gmail-app-password"
echo ""
echo "     Gmail App Password: https://myaccount.google.com/apppasswords"
echo "     (Without this step, ticket email notifications will not be sent.)"
echo ""
echo "  2. Start the application — open TWO terminals:"
echo ""
echo "       Terminal 1:  cd backend  && npm start"
echo "       Terminal 2:  cd frontend && npm start"
echo ""
echo "  3. Open your browser:  http://localhost:3000"
echo ""
echo "  4. Login:  admin@ticketing.local  /  admin123"
echo "     *** CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN! ***"
echo ""
echo "  To share with office users, find your LAN IP:"
echo "    ifconfig | grep 'inet ' | grep -v 127.0.0.1"
echo "  Then share:  http://<YOUR-IP>:3000"
echo ""

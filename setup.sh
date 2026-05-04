#!/bin/bash

# Setup script for Ticketing System (macOS/Linux)

echo ""
echo "============================================"
echo " Office Ticketing System - Setup Script"
echo "============================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL is not installed"
    echo "Install using: brew install postgresql (macOS) or apt-get install postgresql (Linux)"
    exit 1
fi

echo "[1/5] PostgreSQL found"
echo ""

# Create database
echo "[2/5] Creating database..."
createdb ticketing_db 2>/dev/null
echo "Database created (or already exists)"
echo ""

# Setup backend
echo "[3/5] Setting up backend..."
cd backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "*** IMPORTANT: Edit .env file and update DATABASE_URL password ***"
fi
npm install
cd ..
echo "Backend dependencies installed"
echo ""

# Setup frontend
echo "[4/5] Setting up frontend..."
cd frontend
npm install
cd ..
echo "Frontend dependencies installed"
echo ""

echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your PostgreSQL password"
echo "2. Open two terminals:"
echo "   - Terminal 1: cd backend && npm start"
echo "   - Terminal 2: cd frontend && npm start"
echo "3. Open http://localhost:3000 in your browser"
echo "4. Login with admin@ticketing.local / admin123"
echo "5. Change the password immediately!"
echo ""

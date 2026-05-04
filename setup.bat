@echo off
REM Quick setup script for Ticketing System

echo.
echo ============================================
echo  Office Ticketing System - Setup Script
echo ============================================
echo.

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo [1/5] PostgreSQL found
echo.

REM Create database
echo [2/5] Creating database...
psql -U postgres -c "CREATE DATABASE ticketing_db;" 2>nul
echo Database created (or already exists)
echo.

REM Setup backend
echo [3/5] Setting up backend...
cd backend
if not exist .env (
    copy .env.example .env
    echo *** IMPORTANT: Edit .env file and update DATABASE_URL password ***
)
call npm install
cd..
echo Backend dependencies installed
echo.

REM Setup frontend
echo [4/5] Setting up frontend...
cd frontend
call npm install
cd..
echo Frontend dependencies installed
echo.

echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your PostgreSQL password
echo 2. Open two terminals:
echo    - Terminal 1: cd backend && npm start
echo    - Terminal 2: cd frontend && npm start
echo 3. Open http://localhost:3000 in your browser
echo 4. Login with admin@ticketing.local / admin123
echo 5. Change the password immediately!
echo.
pause

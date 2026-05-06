@echo off
setlocal EnableDelayedExpansion

REM One-click setup for Office Ticketing System (Windows)
REM Usage:
REM   setup.bat                        -- will prompt for PostgreSQL password
REM   set PGPASSWORD=yourpass && setup.bat  -- non-interactive

echo.
echo ============================================
echo  Office Ticketing System - Setup Script
echo ============================================
echo.

REM ---- 1. Prerequisites ----
echo [1/6] Checking prerequisites...

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Download from: https://nodejs.org/
    pause & exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed ^(usually ships with Node.js^).
    pause & exit /b 1
)

where psql >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL ^(psql^) not found in PATH.
    echo Install from: https://www.postgresql.org/download/windows/
    echo After install, re-open this terminal so PATH is updated, then re-run setup.bat.
    pause & exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm  --version 2^>nul') do set NPM_VER=%%v
echo   Node %NODE_VER%  ^|  npm %NPM_VER%
echo.

REM ---- 2. Database ----
echo [2/6] Setting up PostgreSQL database...
echo.

if "%PGPASSWORD%"=="" (
    set /p PG_PASS=Enter PostgreSQL password for 'postgres' user ^(press ENTER for default 'postgres'^):
    if "!PG_PASS!"=="" set PG_PASS=postgres
    set PGPASSWORD=!PG_PASS!
)

REM Test connection
psql -U postgres -c "\q" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Cannot connect to PostgreSQL.
    echo   - Make sure the PostgreSQL service is running.
    echo     ^(Run:  net start postgresql-x64-17  or check Windows Services^)
    echo   - Verify the password for the 'postgres' user is correct.
    echo.
    pause & exit /b 1
)

REM Create database -- ignore error if already exists
psql -U postgres -c "CREATE DATABASE ticketing_db;" >nul 2>&1
if errorlevel 1 (
    echo   Database 'ticketing_db' already exists.
) else (
    echo   Database 'ticketing_db' created.
)
echo.

REM ---- 3. Environment ----
echo [3/6] Configuring backend environment...

cd backend

if not exist .env (
    copy .env.example .env >nul
)

REM Use Node.js to safely update .env (handles special chars in password)
node -e "const fs=require('fs');const pass=encodeURIComponent(process.argv[1]);const dbUrl='postgresql://postgres:'+pass+'@localhost:5432/ticketing_db';const jwt=require('crypto').randomBytes(32).toString('hex');let env=fs.readFileSync('.env','utf8');env=env.replace(/DATABASE_URL=.*/m,'DATABASE_URL='+dbUrl);env=env.replace(/JWT_SECRET=.*/m,'JWT_SECRET='+jwt);fs.writeFileSync('.env',env);" "%PGPASSWORD%"

if errorlevel 1 (
    echo ERROR: Failed to configure .env file.
    pause & exit /b 1
)

echo   DATABASE_URL -^> postgresql://postgres:***@localhost:5432/ticketing_db
echo   JWT_SECRET   -^> ^(auto-generated, 256-bit random^)
echo.
cd..

REM ---- 4. Backend dependencies ----
echo [4/6] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed for backend.
    pause & exit /b 1
)
cd..
echo.

REM ---- 5. Frontend dependencies ----
echo [5/6] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed for frontend.
    pause & exit /b 1
)
cd..
echo.

REM ---- 6. Schema + admin user ----
echo [6/6] Initialising database schema and creating admin user...
cd backend
node create_admin.js >nul 2>&1
if errorlevel 1 (
    echo   Admin user already exists ^(skipped^).
) else (
    echo   Admin user created: admin@ticketing.local / admin123
)
cd..
echo.

echo ============================================
echo  Setup Complete!
echo ============================================
echo.
echo MANUAL STEPS REQUIRED:
echo.
echo   1. ^(Recommended^) Configure email notifications:
echo      Edit  backend\.env  and fill in your SMTP details:
echo.
echo        EMAIL_HOST=smtp.gmail.com
echo        EMAIL_PORT=587
echo        EMAIL_USER=your-email@gmail.com
echo        EMAIL_PASS=your-gmail-app-password
echo.
echo      Gmail App Password: https://myaccount.google.com/apppasswords
echo      ^(Without this, ticket email notifications will not be sent.^)
echo.
echo   2. Start the application -- open TWO Command Prompt windows:
echo.
echo        Window 1:  cd backend  ^&^& npm start
echo        Window 2:  cd frontend ^&^& npm start
echo.
echo   3. Open your browser:  http://localhost:3000
echo.
echo   4. Login:  admin@ticketing.local  /  admin123
echo      *** CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN! ***
echo.
echo   To share with office users, run 'ipconfig' and look for IPv4 Address.
echo   Then share:  http://^<YOUR-IP^>:3000
echo.
pause

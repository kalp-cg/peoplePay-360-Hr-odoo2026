@echo off
title PeoplePay360 - Enterprise HR & Payroll Platform
cls
echo ============================================================
echo           Starting PeoplePay360 Platform...
echo ============================================================

cd /d "%~dp0backend"
if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
)

echo [INFO] Generating Prisma Client...
call npx prisma generate

cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
)

echo ============================================================
echo PeoplePay360 System URLs:
echo    Frontend Application:  http://localhost:5173
echo    Backend REST API:      http://localhost:5000
echo    Prisma Studio:         http://localhost:5555
echo ============================================================
echo Demo Accounts:
echo    Admin:             admin@peoplepay360.com       / Admin@123
echo    HR Manager:        hrmanager@peoplepay360.com   / HR@123
echo    Payroll User:      payrolluser@peoplepay360.com / Payroll@123
echo    Payroll Manager:   payrollmgr@peoplepay360.com  / PayrollMgr@123
echo    Employee (Rahul):  rahul@peoplepay360.com       / Rahul@123
echo ============================================================

cd /d "%~dp0backend"
start "PeoplePay360 - Backend API (5000)" cmd /k "npm run start"

cd /d "%~dp0frontend"
start "PeoplePay360 - Frontend (5173)" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo [SUCCESS] PeoplePay360 is starting up!
echo You can access http://localhost:5173 in your browser.
pause

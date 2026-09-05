#!/bin/bash

# ============================================================
# PeoplePay360 - One-Click All-in-One Startup Script
# Boots PostgreSQL, Backend (Port 5000), & Frontend (Port 5173)
# ============================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DB_DIR="$DIR/.db"
BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"

echo "============================================================"
echo "          Starting PeoplePay360 Platform..."
echo "============================================================"

# 1. Start PostgreSQL Cluster on Port 5433 (if not already running)
if ! pg_isready -h 127.0.0.1 -p 5433 >/dev/null 2>&1; then
    echo "🐘 Starting local PostgreSQL cluster on port 5433..."
    if [ ! -d "$DB_DIR" ]; then
        echo "Creating database cluster in $DB_DIR..."
        initdb -D "$DB_DIR" -U postgres --auth=trust
    fi
    pg_ctl -D "$DB_DIR" -o "-p 5433 -k $DB_DIR" -l "$DB_DIR/server.log" start
    sleep 2
    psql -h 127.0.0.1 -p 5433 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'peoplepay360'" | grep -q 1 || \
    psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE DATABASE peoplepay360;"
    echo "✅ PostgreSQL is running on port 5433."
else
    echo "✅ PostgreSQL is already running on port 5433."
fi

# 2. Check Backend Dependencies & Prisma
cd "$BACKEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🔄 Generating Prisma Client and syncing database..."
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma db push --skip-generate

# 3. Check Frontend Dependencies
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "============================================================"
echo "🚀 PeoplePay360 System URLs:"
echo "   Frontend Port 1 (Admin):    http://localhost:5173"
echo "   Frontend Port 2 (HR Mgr):   http://localhost:5174"
echo "   Frontend Port 3 (Employee): http://localhost:5175"
echo "   Backend REST API:           http://localhost:5000"
echo "   Prisma Studio:              http://localhost:5555"
echo "============================================================"
echo "Direct Login Accounts:"
echo "   Admin:             admin@peoplepay360.com       / Admin@123"
echo "   HR Manager:        hrmanager@peoplepay360.com   / HR@123"
echo "   Payroll User:      payrolluser@peoplepay360.com / Payroll@123"
echo "   Payroll Manager:   payrollmgr@peoplepay360.com  / PayrollMgr@123"
echo "   Employee (Rahul):  rahul@peoplepay360.com       / Rahul@123"
echo "============================================================"

# Trap to kill all processes on Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Shutting down PeoplePay360 servers..."
    kill $BACKEND_PID $FRONTEND_PID_1 $FRONTEND_PID_2 $FRONTEND_PID_3 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID_1 $FRONTEND_PID_2 $FRONTEND_PID_3 2>/dev/null || true
    echo "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Clean up any existing processes on target ports to avoid EADDRINUSE
echo "🧹 Ensuring ports 5000, 5173, 5174, 5175 are free..."
for port in 5000 5173 5174 5175 5555; do
    fuser -k ${port}/tcp 2>/dev/null || true
done
sleep 1

# Start backend in background
cd "$BACKEND_DIR"
node src/server.js &
BACKEND_PID=$!

# Start parallel frontend dev servers
cd "$FRONTEND_DIR"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID_1=$!

npm run dev -- --host 0.0.0.0 --port 5174 &
FRONTEND_PID_2=$!

npm run dev -- --host 0.0.0.0 --port 5175 &
FRONTEND_PID_3=$!

wait

#!/bin/bash

# ============================================================
# PeoplePay360 - One-Click All-in-One Startup Script
# Boots Database, Backend (Port 5000), & Frontend (Port 5173)
# ============================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DB_DIR="$DIR/.db"
BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"

# 0. Environment Shims (Support Git Bash, WSL, Linux, and macOS)
if ! command -v node >/dev/null 2>&1; then
    if command -v node.exe >/dev/null 2>&1; then
        mkdir -p "$DIR/.bin" 2>/dev/null || true
        cat << 'EOF' > "$DIR/.bin/node"
#!/bin/sh
exec node.exe "$@"
EOF
        chmod +x "$DIR/.bin/node"
        export PATH="$DIR/.bin:$PATH"
    fi
fi

if ! command -v npm >/dev/null 2>&1; then
    if command -v npm.cmd >/dev/null 2>&1; then
        mkdir -p "$DIR/.bin" 2>/dev/null || true
        cat << 'EOF' > "$DIR/.bin/npm"
#!/bin/sh
exec npm.cmd "$@"
EOF
        chmod +x "$DIR/.bin/npm"
        export PATH="$DIR/.bin:$PATH"
    fi
fi

if ! command -v npx >/dev/null 2>&1; then
    if command -v npx.cmd >/dev/null 2>&1; then
        mkdir -p "$DIR/.bin" 2>/dev/null || true
        cat << 'EOF' > "$DIR/.bin/npx"
#!/bin/sh
exec npx.cmd "$@"
EOF
        chmod +x "$DIR/.bin/npx"
        export PATH="$DIR/.bin:$PATH"
    fi
fi

echo "============================================================"
echo "          Starting PeoplePay360 Platform..."
echo "============================================================"

# 1. Database Check (Cloud Neon DB vs Local PostgreSQL)
if [ -f "$BACKEND_DIR/.env" ]; then
    DB_URL=$(grep "^DATABASE_URL=" "$BACKEND_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi

if [[ "$DB_URL" == *"neon.tech"* ]] || [[ "$DB_URL" == *"aws"* ]] || [[ "$DB_URL" == *"sslmode="* ]]; then
    echo "🌐 Cloud database detected in .env (Neon / Remote PostgreSQL)."
    echo "   Skipping local postgres cluster startup."
elif command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -h 127.0.0.1 -p 5433 >/dev/null 2>&1; then
        echo "🐘 Starting local PostgreSQL cluster on port 5433..."
        if [ ! -d "$DB_DIR" ] && command -v initdb >/dev/null 2>&1; then
            echo "Creating database cluster in $DB_DIR..."
            initdb -D "$DB_DIR" -U postgres --auth=trust
        fi
        if command -v pg_ctl >/dev/null 2>&1; then
            pg_ctl -D "$DB_DIR" -o "-p 5433 -k $DB_DIR" -l "$DB_DIR/server.log" start
            sleep 2
            if command -v psql >/dev/null 2>&1; then
                psql -h 127.0.0.1 -p 5433 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'peoplepay360'" | grep -q 1 || \
                psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE DATABASE peoplepay360;"
            fi
            echo "✅ PostgreSQL is running on port 5433."
        fi
    else
        echo "✅ PostgreSQL is already running on port 5433."
    fi
else
    echo "ℹ️  Using database configuration defined in backend/.env"
fi

# 2. Check Backend Dependencies & Prisma
cd "$BACKEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🔄 Generating Prisma Client..."
npx prisma generate

# 3. Check Frontend Dependencies
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "============================================================"
echo "🚀 PeoplePay360 System URLs:"
echo "   Frontend Web Application:   http://localhost:5173"
echo "   Backend REST API:           http://localhost:5000"
echo "   Prisma Studio (Optional):   http://localhost:5555"
echo "============================================================"
echo "Demo Login Accounts:"
echo "   Admin:             admin@peoplepay360.com       / Admin@123"
echo "   HR Manager:        hrmanager@peoplepay360.com   / HR@123"
echo "   Payroll User:      payrolluser@peoplepay360.com / Payroll@123"
echo "   Payroll Manager:   payrollmgr@peoplepay360.com  / PayrollMgr@123"
echo "   Employee (Rahul):  rahul@peoplepay360.com       / Rahul@123"
echo "============================================================"

# Trap to kill all background child processes on exit/Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Shutting down PeoplePay360 servers..."
    if [ -n "$BACKEND_PID" ]; then kill $BACKEND_PID 2>/dev/null || true; fi
    if [ -n "$FRONTEND_PID" ]; then kill $FRONTEND_PID 2>/dev/null || true; fi
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Clean up ports if fuser is available
if command -v fuser >/dev/null 2>&1; then
    for port in 5000 5173; do
        fuser -k ${port}/tcp 2>/dev/null || true
    done
fi

# Start backend in background
cd "$BACKEND_DIR"
node --watch src/server.js &
BACKEND_PID=$!

# Start frontend dev server
cd "$FRONTEND_DIR"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

wait

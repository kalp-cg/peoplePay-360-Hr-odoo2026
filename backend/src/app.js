const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const errorHandler = require('./middleware/error.middleware');

// Feature Routes
const authRoutes = require('./features/auth/auth.routes');
const employeeRoutes = require('./features/employees/employee.routes');
const contractRoutes = require('./features/contracts/contract.routes');
const scheduleRoutes = require('./features/schedules/schedule.routes');
const attendanceRoutes = require('./features/attendance/attendance.routes');
const timeoffRoutes = require('./features/time-off/timeoff.routes');
const salaryRoutes = require('./features/salary/salary.routes');
const payrollRoutes = require('./features/payroll/payroll.routes');
const payslipRoutes = require('./features/payslips/payslip.routes');
const dashboardRoutes = require('./features/dashboard/dashboard.routes');
const auditRoutes = require('./features/audit/audit.routes');
const userRoutes = require('./features/users/user.routes');
const departmentRoutes = require('./features/departments/department.routes');

const app = express();

// Global Middleware
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    platform: 'PeoplePay360 HR & Payroll Engine',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL',
  });
});

// Mount Feature API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/time-off', timeoffRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payruns', payrollRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/audit', auditRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;

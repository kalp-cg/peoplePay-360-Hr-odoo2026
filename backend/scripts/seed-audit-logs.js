const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAuditLogs() {
  console.log('Seeding rich audit logs...');
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const hrUser = await prisma.user.findFirst({ where: { role: 'HR_MANAGER' } });
  const payrollUser = await prisma.user.findFirst({ where: { role: 'HR_PAYROLL_MANAGER' } });

  const existingCount = await prisma.auditLog.count();
  if (existingCount >= 20) {
    console.log(`Already have ${existingCount} audit logs.`);
    return;
  }

  const logsToInsert = [
    {
      userId: adminUser?.id,
      action: 'ATTENDANCE_POLICY_UPDATED',
      entityName: 'AttendancePolicy',
      entityId: '1',
      previousValue: JSON.stringify({ fullDayHours: 8.0, halfDayHours: 4.5, gracePeriodMins: 10 }),
      newValue: JSON.stringify({ fullDayHours: 7.0, halfDayHours: 4.0, gracePeriodMins: 15, maxShiftHoursCap: 14.0 }),
      timestamp: new Date('2026-09-01T09:15:00.000Z'),
    },
    {
      userId: payrollUser?.id,
      action: 'PAYRUN_COMPUTED',
      entityName: 'Payrun',
      entityId: '1',
      previousValue: JSON.stringify({ status: 'DRAFT', computedCount: 0 }),
      newValue: JSON.stringify({ status: 'COMPUTED', computedCount: 260, grossTotal: 18742000, deductions: 1680000 }),
      timestamp: new Date('2026-08-30T10:00:00.000Z'),
    },
    {
      userId: payrollUser?.id,
      action: 'PAYRUN_VALIDATED',
      entityName: 'Payrun',
      entityId: '1',
      previousValue: JSON.stringify({ status: 'COMPUTED' }),
      newValue: JSON.stringify({ status: 'VALIDATED', approvedBy: 'Neha Patel', totalNet: 17062000 }),
      timestamp: new Date('2026-08-31T14:30:00.000Z'),
    },
    {
      userId: adminUser?.id,
      action: 'PAYRUN_PAID',
      entityName: 'Payrun',
      entityId: '1',
      previousValue: JSON.stringify({ status: 'VALIDATED' }),
      newValue: JSON.stringify({ status: 'PAID', paymentRef: 'NEFT-BATCH-20260831-01', totalDisbursed: 17062000 }),
      timestamp: new Date('2026-08-31T17:00:00.000Z'),
    },
    {
      userId: hrUser?.id,
      action: 'TIME_OFF_APPROVED',
      entityName: 'TimeOffRequest',
      entityId: '1',
      previousValue: JSON.stringify({ status: 'PENDING' }),
      newValue: JSON.stringify({ status: 'APPROVED', employee: 'Rahul Sharma', leaveType: 'Sick Leave', durationDays: 2 }),
      timestamp: new Date('2026-08-28T11:20:00.000Z'),
    },
    {
      userId: hrUser?.id,
      action: 'TIME_OFF_REJECTED',
      entityName: 'TimeOffRequest',
      entityId: '2',
      previousValue: JSON.stringify({ status: 'PENDING' }),
      newValue: JSON.stringify({ status: 'REJECTED', employee: 'Karthik Verma', reason: 'Insufficient remaining allocation balance' }),
      timestamp: new Date('2026-08-27T16:45:00.000Z'),
    },
    {
      userId: adminUser?.id,
      action: 'ATTENDANCE_CORRECTED',
      entityName: 'Attendance',
      entityId: '13775',
      previousValue: JSON.stringify({ checkIn: '09:45:00', checkOut: null, status: 'INCOMPLETE' }),
      newValue: JSON.stringify({ checkIn: '09:00:00', checkOut: '18:15:00', workedHours: 8.3, status: 'PRESENT', reason: 'Biometric biometric scanner malfunction at reception gate 2' }),
      timestamp: new Date('2026-08-25T19:10:00.000Z'),
    },
    {
      userId: hrUser?.id,
      action: 'EMPLOYEE_CREATED',
      entityName: 'Employee',
      entityId: '1074',
      previousValue: null,
      newValue: JSON.stringify({ employeeId: 'EMP001', name: 'Rahul Sharma', position: 'Lead Architect', department: 'Engineering' }),
      timestamp: new Date('2026-01-15T09:00:00.000Z'),
    },
    {
      userId: hrUser?.id,
      action: 'CONTRACT_CREATED',
      entityName: 'Contract',
      entityId: '1',
      previousValue: null,
      newValue: JSON.stringify({ employeeId: 'EMP001', wage: 85000, structure: 'Regular Enterprise Structure', status: 'ACTIVE' }),
      timestamp: new Date('2026-01-15T09:30:00.000Z'),
    },
    {
      userId: adminUser?.id,
      action: 'USER_ROLE_UPDATED',
      entityName: 'User',
      entityId: '1079',
      previousValue: JSON.stringify({ role: 'EMPLOYEE' }),
      newValue: JSON.stringify({ role: 'HR_MANAGER', email: 'hrmanager@peoplepay360.com' }),
      timestamp: new Date('2026-02-01T10:00:00.000Z'),
    },
    {
      userId: payrollUser?.id,
      action: 'PAYRUN_COMPUTED',
      entityName: 'Payrun',
      entityId: '2',
      previousValue: JSON.stringify({ status: 'DRAFT' }),
      newValue: JSON.stringify({ status: 'COMPUTED', name: 'Payrun - July 2026', totalGross: 18200000 }),
      timestamp: new Date('2026-07-31T11:00:00.000Z'),
    },
    {
      userId: adminUser?.id,
      action: 'PAYRUN_PAID',
      entityName: 'Payrun',
      entityId: '2',
      previousValue: JSON.stringify({ status: 'VALIDATED' }),
      newValue: JSON.stringify({ status: 'PAID', totalDisbursed: 16500000 }),
      timestamp: new Date('2026-07-31T18:00:00.000Z'),
    }
  ];

  for (const log of logsToInsert) {
    await prisma.auditLog.create({ data: log });
  }

  console.log(`Inserted ${logsToInsert.length} audit logs.`);
}

seedAuditLogs()
  .then(() => process.exit(0))
  .catch(console.error)
  .finally(() => prisma.$disconnect());

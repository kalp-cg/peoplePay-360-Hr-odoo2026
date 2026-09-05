const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PeoplePay360 database with enterprise-grade data...');

  // 1. Clean existing records in reverse order
  await prisma.auditLog.deleteMany({});
  await prisma.payrollWarning.deleteMany({});
  await prisma.payslipLine.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.payrun.deleteMany({});
  await prisma.salaryRule.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.timeOffRequest.deleteMany({});
  await prisma.timeOffAllocation.deleteMany({});
  await prisma.timeOffType.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.scheduleDay.deleteMany({});
  await prisma.workingSchedule.deleteMany({});
  await prisma.jobPosition.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Create Departments
  const deptEng = await prisma.department.create({
    data: { name: 'Engineering', code: 'ENG', description: 'Product and Platform Engineering' },
  });
  const deptSales = await prisma.department.create({
    data: { name: 'Sales & Marketing', code: 'SALES', description: 'Revenue and Growth' },
  });
  const deptHR = await prisma.department.create({
    data: { name: 'Human Resources', code: 'HR', description: 'Talent and People Operations' },
  });
  const deptFin = await prisma.department.create({
    data: { name: 'Finance & Accounts', code: 'FIN', description: 'Financial Planning and Payroll' },
  });

  // 3. Create Job Positions
  const posLead = await prisma.jobPosition.create({
    data: { title: 'Lead Architect', departmentId: deptEng.id },
  });
  const posDev = await prisma.jobPosition.create({
    data: { title: 'Senior Software Engineer', departmentId: deptEng.id },
  });
  const posQA = await prisma.jobPosition.create({
    data: { title: 'QA Engineer', departmentId: deptEng.id },
  });
  const posSalesLead = await prisma.jobPosition.create({
    data: { title: 'Sales Director', departmentId: deptSales.id },
  });
  const posAE = await prisma.jobPosition.create({
    data: { title: 'Account Executive', departmentId: deptSales.id },
  });
  const posHRLead = await prisma.jobPosition.create({
    data: { title: 'HR Manager', departmentId: deptHR.id },
  });
  const posFinLead = await prisma.jobPosition.create({
    data: { title: 'Payroll Manager', departmentId: deptFin.id },
  });

  // 4. Create Working Schedule & Schedule Days (Auto 40h/week: 8h * 5 days)
  const schedule40 = await prisma.workingSchedule.create({
    data: {
      name: 'Standard 40-Hour Workweek',
      scheduleType: 'STANDARD_40H',
      weeklyHours: 40.0,
      scheduleDays: {
        create: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', breakHours: 1.0, dailyHours: 8.0 },
          { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', breakHours: 1.0, dailyHours: 8.0 },
          { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', breakHours: 1.0, dailyHours: 8.0 },
          { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', breakHours: 1.0, dailyHours: 8.0 },
          { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', breakHours: 1.0, dailyHours: 8.0 },
        ],
      },
    },
  });

  // 5. Create Salary Structure & Sequential Rules
  const regularStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Salary Structure',
      description: 'Standard enterprise package with Basic, HRA, Allowance, PF, and Tax',
      active: true,
      salaryRules: {
        create: [
          {
            name: 'Basic Salary',
            code: 'BASIC',
            category: 'BASIC',
            sequence: 1,
            calculationType: 'PERCENTAGE',
            valueExpression: '0.60 * WAGE',
            active: true,
          },
          {
            name: 'House Rent Allowance',
            code: 'HRA',
            category: 'ALLOWANCE',
            sequence: 2,
            calculationType: 'PERCENTAGE',
            valueExpression: '0.20 * BASIC',
            active: true,
          },
          {
            name: 'Special Allowance',
            code: 'ALLOWANCE',
            category: 'ALLOWANCE',
            sequence: 3,
            calculationType: 'FORMULA',
            valueExpression: 'WAGE - BASIC - HRA',
            active: true,
          },
          {
            name: 'Gross Salary',
            code: 'GROSS',
            category: 'GROSS',
            sequence: 4,
            calculationType: 'FORMULA',
            valueExpression: 'BASIC + HRA + ALLOWANCE',
            active: true,
          },
          {
            name: 'Provident Fund',
            code: 'PF',
            category: 'DEDUCTION',
            sequence: 5,
            calculationType: 'PERCENTAGE',
            valueExpression: '0.12 * BASIC',
            active: true,
          },
          {
            name: 'Income Tax (TDS)',
            code: 'TAX',
            category: 'DEDUCTION',
            sequence: 6,
            calculationType: 'FORMULA',
            valueExpression: '0.05 * GROSS',
            active: true,
          },
          {
            name: 'Net Salary',
            code: 'NET',
            category: 'NET',
            sequence: 7,
            calculationType: 'FORMULA',
            valueExpression: 'GROSS - PF - TAX',
            active: true,
          },
        ],
      },
    },
  });

  // 6. Create Time Off Types
  const leavePaid = await prisma.timeOffType.create({
    data: {
      name: 'Paid Leave',
      unit: 'DAYS',
      allocationRequired: true,
      approvalRequired: true,
      payrollIntegration: true,
      isPaid: true,
    },
  });
  const leaveSick = await prisma.timeOffType.create({
    data: {
      name: 'Sick Leave',
      unit: 'DAYS',
      allocationRequired: true,
      approvalRequired: true,
      payrollIntegration: true,
      isPaid: true,
    },
  });
  const leaveUnpaid = await prisma.timeOffType.create({
    data: {
      name: 'Unpaid Leave',
      unit: 'DAYS',
      allocationRequired: false,
      approvalRequired: true,
      payrollIntegration: true,
      isPaid: false,
    },
  });

  // 7. Create Employees
  const empManager = await prisma.employee.create({
    data: {
      employeeId: 'EMP000',
      name: 'Arjun Verma',
      email: 'arjun.verma@peoplepay360.com',
      phone: '+91 98765 43210',
      departmentId: deptEng.id,
      jobPositionId: posLead.id,
      employeeType: 'FULL_TIME',
      joiningDate: new Date('2023-01-15'),
      status: 'ACTIVE',
      workingScheduleId: schedule40.id,
      bankAccountNumber: '912345678901',
      bankName: 'HDFC Bank',
      bankIfscCode: 'HDFC0001234',
      panNumber: 'ABCDE1234F',
    },
  });

  // Central Hub Employee: Rahul Sharma
  const empRahul = await prisma.employee.create({
    data: {
      employeeId: 'EMP001',
      name: 'Rahul Sharma',
      email: 'rahul@peoplepay360.com',
      phone: '+91 98123 45678',
      departmentId: deptEng.id,
      jobPositionId: posDev.id,
      managerId: empManager.id,
      employeeType: 'FULL_TIME',
      joiningDate: new Date('2024-03-01'),
      status: 'ACTIVE',
      workingScheduleId: schedule40.id,
      bankAccountNumber: '987654321012',
      bankName: 'State Bank of India',
      bankIfscCode: 'SBIN0005678',
      panNumber: 'RHULS1234K',
    },
  });

  // Employee with MISSING bank details for testing Payroll Warnings!
  const empPriya = await prisma.employee.create({
    data: {
      employeeId: 'EMP002',
      name: 'Priya Nair',
      email: 'priya.nair@peoplepay360.com',
      phone: '+91 98234 56789',
      departmentId: deptEng.id,
      jobPositionId: posQA.id,
      managerId: empManager.id,
      employeeType: 'FULL_TIME',
      joiningDate: new Date('2024-06-01'),
      status: 'ACTIVE',
      workingScheduleId: schedule40.id,
      bankAccountNumber: null, // Intentionally missing for Payroll Warning demo!
      bankName: null,
      bankIfscCode: null,
      panNumber: 'PRIYA5678P',
    },
  });

  const empVikram = await prisma.employee.create({
    data: {
      employeeId: 'EMP003',
      name: 'Vikram Mehta',
      email: 'vikram.mehta@peoplepay360.com',
      phone: '+91 98345 67890',
      departmentId: deptSales.id,
      jobPositionId: posSalesLead.id,
      employeeType: 'FULL_TIME',
      joiningDate: new Date('2023-08-15'),
      status: 'ACTIVE',
      workingScheduleId: schedule40.id,
      bankAccountNumber: '543210987654',
      bankName: 'ICICI Bank',
      bankIfscCode: 'ICIC0002345',
      panNumber: 'VIKRM7890M',
    },
  });

  const empSneha = await prisma.employee.create({
    data: {
      employeeId: 'EMP004',
      name: 'Sneha Rao',
      email: 'sneha.rao@peoplepay360.com',
      phone: '+91 98456 78901',
      departmentId: deptSales.id,
      jobPositionId: posAE.id,
      managerId: empVikram.id,
      employeeType: 'FULL_TIME',
      joiningDate: new Date('2024-01-10'),
      status: 'ACTIVE',
      workingScheduleId: schedule40.id,
      bankAccountNumber: '654321098765',
      bankName: 'Axis Bank',
      bankIfscCode: 'UTIB0003456',
      panNumber: 'SNEHA8901S',
    },
  });

  const empKavita = await prisma.employee.create({
    data: {
      employeeId: 'EMP005',
      name: 'Kavita Deshmukh',
      email: 'kavita.d@peoplepay360.com',
      phone: '+91 98567 89012',
      departmentId: deptHR.id,
      jobPositionId: posHRLead.id,
      employeeType: 'FULL_TIME',
      joiningDate: new Date('2023-05-01'),
      status: 'ACTIVE',
      workingScheduleId: schedule40.id,
      bankAccountNumber: '765432109876',
      bankName: 'Kotak Mahindra Bank',
      bankIfscCode: 'KKBK0004567',
      panNumber: 'KAVIT9012D',
    },
  });

  const empRohan = await prisma.employee.create({
    data: {
      employeeId: 'EMP006',
      name: 'Rohan Joshi',
      email: 'rohan.j@peoplepay360.com',
      phone: '+91 98678 90123',
      departmentId: deptFin.id,
      jobPositionId: posFinLead.id,
      employeeType: 'FULL_TIME',
      joiningDate: new Date('2023-04-01'),
      status: 'ACTIVE',
      workingScheduleId: schedule40.id,
      bankAccountNumber: '876543210987',
      bankName: 'Bank of Baroda',
      bankIfscCode: 'BARB0005678',
      panNumber: 'ROHAN0123J',
    },
  });

  // 8. Create Users for the 5 Roles with bcrypt hashed passwords
  const salt = await bcrypt.genSalt(10);
  const hashAdmin = await bcrypt.hash('Admin@123', salt);
  const hashHR = await bcrypt.hash('HR@123', salt);
  const hashPayroll = await bcrypt.hash('Payroll@123', salt);
  const hashPayrollMgr = await bcrypt.hash('PayrollMgr@123', salt);
  const hashRahul = await bcrypt.hash('Rahul@123', salt);

  const userAdmin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@peoplepay360.com',
      password: hashAdmin,
      role: 'ADMIN',
    },
  });

  const userHR = await prisma.user.create({
    data: {
      name: 'Kavita Deshmukh',
      email: 'hrmanager@peoplepay360.com',
      password: hashHR,
      role: 'HR_MANAGER',
      employeeId: empKavita.id,
    },
  });

  const userPayroll = await prisma.user.create({
    data: {
      name: 'Rohan Joshi',
      email: 'payrolluser@peoplepay360.com',
      password: hashPayroll,
      role: 'HR_PAYROLL_USER',
      employeeId: empRohan.id,
    },
  });

  const userPayrollMgr = await prisma.user.create({
    data: {
      name: 'Rohan Finance Head',
      email: 'payrollmgr@peoplepay360.com',
      password: hashPayrollMgr,
      role: 'HR_PAYROLL_MANAGER',
    },
  });

  const userRahul = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      email: 'rahul@peoplepay360.com',
      password: hashRahul,
      role: 'EMPLOYEE',
      employeeId: empRahul.id,
    },
  });

  // 9. Create Historical & Active Contracts
  // Crucial test case from PRD:
  // Rahul Contract A: 2025-01-01 to 2025-12-31, Wage = ₹40,000 (EXPIRED)
  await prisma.contract.create({
    data: {
      employeeId: empRahul.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      wage: 40000.0,
      salaryStructureId: regularStructure.id,
      status: 'EXPIRED',
      notes: 'Initial junior contract for 2025',
    },
  });

  // Rahul Contract B: 2026-01-01 to NULL, Wage = ₹50,000 (ACTIVE)
  const rahulContractB = await prisma.contract.create({
    data: {
      employeeId: empRahul.id,
      startDate: new Date('2026-01-01'),
      endDate: null,
      wage: 50000.0,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
      notes: 'Promoted to Senior Engineer with ₹50,000 package',
    },
  });

  const contractArjun = await prisma.contract.create({
    data: {
      employeeId: empManager.id,
      startDate: new Date('2024-01-01'),
      endDate: null,
      wage: 90000.0,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
    },
  });

  const contractPriya = await prisma.contract.create({
    data: {
      employeeId: empPriya.id,
      startDate: new Date('2024-06-01'),
      endDate: null,
      wage: 42000.0,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
    },
  });

  const contractVikram = await prisma.contract.create({
    data: {
      employeeId: empVikram.id,
      startDate: new Date('2024-01-01'),
      endDate: null,
      wage: 75000.0,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
    },
  });

  const contractSneha = await prisma.contract.create({
    data: {
      employeeId: empSneha.id,
      startDate: new Date('2024-01-10'),
      endDate: null,
      wage: 45000.0,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
    },
  });

  const contractKavita = await prisma.contract.create({
    data: {
      employeeId: empKavita.id,
      startDate: new Date('2024-01-01'),
      endDate: null,
      wage: 60000.0,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
    },
  });

  const contractRohan = await prisma.contract.create({
    data: {
      employeeId: empRohan.id,
      startDate: new Date('2024-01-01'),
      endDate: null,
      wage: 65000.0,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
    },
  });

  // 10. Create Leave Allocations & Requests
  // Rahul: 20 Allocated, 2 Taken, 18 Remaining
  await prisma.timeOffAllocation.create({
    data: {
      employeeId: empRahul.id,
      timeOffTypeId: leavePaid.id,
      allocatedDays: 20.0,
      takenDays: 2.0,
      remainingDays: 18.0,
      year: 2026,
    },
  });
  await prisma.timeOffAllocation.create({
    data: {
      employeeId: empRahul.id,
      timeOffTypeId: leaveSick.id,
      allocatedDays: 10.0,
      takenDays: 0.0,
      remainingDays: 10.0,
      year: 2026,
    },
  });

  // Allocations for other employees
  const otherEmps = [empManager, empPriya, empVikram, empSneha, empKavita, empRohan];
  for (const emp of otherEmps) {
    await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: leavePaid.id,
        allocatedDays: 20.0,
        takenDays: 1.0,
        remainingDays: 19.0,
        year: 2026,
      },
    });
  }

  // Rahul: Approved leave request of 2 days
  await prisma.timeOffRequest.create({
    data: {
      employeeId: empRahul.id,
      timeOffTypeId: leavePaid.id,
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-11'),
      durationDays: 2.0,
      reason: 'Family emergency trip to home town',
      status: 'APPROVED',
      approvedById: userHR.id,
    },
  });

  // Sneha: Pending leave request
  await prisma.timeOffRequest.create({
    data: {
      employeeId: empSneha.id,
      timeOffTypeId: leavePaid.id,
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-09-16'),
      durationDays: 2.0,
      reason: 'Personal leave',
      status: 'PENDING',
    },
  });

  // 11. Create Attendance Records for August 2026 (for live statistics)
  const allEmployees = [empRahul, empManager, empPriya, empVikram, empSneha, empKavita, empRohan];
  for (let day = 1; day <= 22; day++) {
    const dayStr = String(day).padStart(2, '0');
    const date = new Date(`2026-08-${dayStr}`);

    for (const emp of allEmployees) {
      let status = 'PRESENT';
      let checkIn = new Date(`2026-08-${dayStr}T09:00:00Z`);
      let checkOut = new Date(`2026-08-${dayStr}T18:00:00Z`);
      let worked = 8.0;

      if (day === 5 && emp.id === empRahul.id) {
        status = 'LATE';
        checkIn = new Date(`2026-08-${dayStr}T09:45:00Z`);
        worked = 7.25;
      } else if (day === 12 && emp.id === empVikram.id) {
        status = 'OVERTIME';
        checkOut = new Date(`2026-08-${dayStr}T20:00:00Z`);
        worked = 10.0;
      } else if (day === 18 && emp.id === empPriya.id) {
        status = 'ABSENT';
        checkIn = null;
        checkOut = null;
        worked = 0.0;
      }

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          checkIn,
          checkOut,
          breakHours: 1.0,
          workedHours: worked,
          status,
        },
      });
    }
  }

  // 12. Create Completed Payrun for August 2026 (Live Database History)
  const payrunAugust = await prisma.payrun.create({
    data: {
      name: 'Payrun - August 2026',
      salaryStructureId: regularStructure.id,
      periodStart: new Date('2026-08-01'),
      periodEnd: new Date('2026-08-31'),
      status: 'PAID',
      processedById: userPayroll.id,
      paidAt: new Date('2026-08-31T17:00:00Z'),
    },
  });

  // Generate Payslips for August 2026
  let totalGrossAugust = 0;
  let totalDeductionsAugust = 0;
  let totalNetAugust = 0;

  const empContracts = [
    { emp: empRahul, contract: rahulContractB },
    { emp: empManager, contract: contractArjun },
    { emp: empPriya, contract: contractPriya },
    { emp: empVikram, contract: contractVikram },
    { emp: empSneha, contract: contractSneha },
    { emp: empKavita, contract: contractKavita },
    { emp: empRohan, contract: contractRohan },
  ];

  for (let i = 0; i < empContracts.length; i++) {
    const { emp, contract } = empContracts[i];
    const wage = contract.wage;
    const basic = Math.round(0.6 * wage);
    const hra = Math.round(0.2 * basic);
    const allowance = wage - basic - hra;
    const gross = basic + hra + allowance;
    const pf = Math.round(0.12 * basic);
    const tax = Math.round(0.05 * gross);
    const net = gross - pf - tax;

    totalGrossAugust += gross;
    totalDeductionsAugust += pf + tax;
    totalNetAugust += net;

    const payslipNum = `PS-2026-08-${String(i + 1).padStart(3, '0')}`;
    const payslip = await prisma.payslip.create({
      data: {
        payslipNumber: payslipNum,
        payrunId: payrunAugust.id,
        employeeId: emp.id,
        contractId: contract.id,
        workingDays: 22.0,
        presentDays: 22.0,
        leaveDays: emp.id === empRahul.id ? 2.0 : 0.0,
        absentDays: emp.id === empPriya.id ? 1.0 : 0.0,
        overtimeHours: emp.id === empVikram.id ? 2.0 : 0.0,
        grossSalary: gross,
        totalDeductions: pf + tax,
        netSalary: net,
        status: 'PAID',
        sentAt: new Date('2026-08-31T18:00:00Z'),
        payslipLines: {
          create: [
            { code: 'BASIC', name: 'Basic Salary', category: 'BASIC', sequence: 1, amount: basic },
            { code: 'HRA', name: 'House Rent Allowance', category: 'ALLOWANCE', sequence: 2, amount: hra },
            { code: 'ALLOWANCE', name: 'Special Allowance', category: 'ALLOWANCE', sequence: 3, amount: allowance },
            { code: 'GROSS', name: 'Gross Salary', category: 'GROSS', sequence: 4, amount: gross },
            { code: 'PF', name: 'Provident Fund', category: 'DEDUCTION', sequence: 5, amount: pf },
            { code: 'TAX', name: 'Income Tax (TDS)', category: 'DEDUCTION', sequence: 6, amount: tax },
            { code: 'NET', name: 'Net Salary', category: 'NET', sequence: 7, amount: net },
          ],
        },
      },
    });
  }

  await prisma.payrun.update({
    where: { id: payrunAugust.id },
    data: {
      totalGross: totalGrossAugust,
      totalDeductions: totalDeductionsAugust,
      totalNet: totalNetAugust,
    },
  });

  // 13. Audit Log Entries
  await prisma.auditLog.create({
    data: {
      userId: userHR.id,
      action: 'LEAVE_APPROVED',
      entityName: 'TimeOffRequest',
      entityId: '1',
      previousValue: JSON.stringify({ status: 'PENDING' }),
      newValue: JSON.stringify({ status: 'APPROVED', durationDays: 2.0 }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: userPayroll.id,
      action: 'PAYRUN_COMPLETED',
      entityName: 'Payrun',
      entityId: String(payrunAugust.id),
      previousValue: JSON.stringify({ status: 'VALIDATED' }),
      newValue: JSON.stringify({ status: 'PAID', totalNet: totalNetAugust }),
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log(`   Departments: 4`);
  console.log(`   Employees: ${allEmployees.length}`);
  console.log(`   Users: 5 (Admin, HR Manager, HR Payroll User, HR Payroll Manager, Employee)`);
  console.log(`   Salary Structure: Regular Salary (7 sequential rules)`);
  console.log(`   Historical Payrun: August 2026 (Status: PAID, Total Net: ₹${totalNetAugust.toLocaleString()})`);
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

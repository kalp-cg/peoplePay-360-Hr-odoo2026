const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Diverse pool of names to generate 260 unique, realistic corporate profiles
const FIRST_NAMES = [
  'Rahul', 'Priya', 'Amit', 'Neha', 'Vikram', 'Ananya', 'Rajesh', 'Sneha', 'Rohan', 'Pooja',
  'Karthik', 'Divya', 'Manoj', 'Meera', 'Suresh', 'Kavita', 'Deepak', 'Sunita', 'Alok', 'Swati',
  'Manish', 'Ritu', 'Sandeep', 'Shalini', 'Harish', 'Preeti', 'Nitin', 'Vandana', 'Gaurav', 'Tanvi',
  'Arjun', 'Ishita', 'Aditya', 'Shreya', 'Varun', 'Nidhi', 'Siddharth', 'Rashi', 'Akhil', 'Radhika',
  'Mayank', 'Bhavna', 'Kunal', 'Rashmi', 'Tarun', 'Natasha', 'Abhinav', 'Priyanka', 'Ankit', 'Payal',
  'Sachin', 'Simran', 'Kishore', 'Anjali', 'Vivek', 'Shruti', 'Pranav', 'Kritika', 'Abhishek', 'Monika'
];

const LAST_NAMES = [
  'Sharma', 'Desai', 'Verma', 'Patel', 'Singh', 'Roy', 'Iyer', 'Kulkarni', 'Mehta', 'Nair',
  'Subramanian', 'Joshi', 'Kumar', 'Pillai', 'Reddy', 'Rao', 'Gupta', 'Sen', 'Mishra', 'Bhatt',
  'Agarwal', 'Jain', 'Choudhury', 'Tiwari', 'Nambiar', 'Kapoor', 'Saxena', 'Malhotra', 'Shah', 'Banerjee',
  'Chatterjee', 'Mukherjee', 'Trivedi', 'Bhatia', 'Dutta', 'Pandey', 'Yadav', 'Chauhan', 'Rathore', 'Menon'
];

const BANKS = [
  { name: 'HDFC Bank', ifsc: 'HDFC0000240' },
  { name: 'ICICI Bank', ifsc: 'ICIC0000024' },
  { name: 'State Bank of India', ifsc: 'SBIN0001040' },
  { name: 'Axis Bank', ifsc: 'UTIB0000128' },
  { name: 'Kotak Mahindra Bank', ifsc: 'KKBK0000958' },
];

async function main() {
  console.log('============================================================');
  console.log('🌱 Starting Enterprise Scale Seeding (260 Users Across All Roles)...');
  console.log('============================================================');

  // 1. Clean existing records in proper dependency order
  console.log('[1/6] Cleaning existing database records...');
  await prisma.auditLog.deleteMany({});
  await prisma.payrollWarning.deleteMany({});
  await prisma.payslipLine.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.payrun.deleteMany({});
  await prisma.timeOffRequest.deleteMany({});
  await prisma.timeOffAllocation.deleteMany({});
  await prisma.timeOffType.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.salaryRule.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.scheduleDay.deleteMany({});
  await prisma.workingSchedule.deleteMany({});
  await prisma.jobPosition.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Precompute BCrypt Hashes once for lightning speed
  console.log('[2/6] Generating cryptographic credential hashes...');
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const hrPasswordHash = await bcrypt.hash('HR@123', 10);
  const payrollUserPasswordHash = await bcrypt.hash('Payroll@123', 10);
  const payrollMgrPasswordHash = await bcrypt.hash('PayrollMgr@123', 10);
  const employeePasswordHash = await bcrypt.hash('Rahul@123', 10);

  // 3. Create Departments
  console.log('[3/6] Setting up Departments, Positions & Schedules...');
  const departmentsData = [
    { name: 'Engineering', code: 'ENG', description: 'Product and Platform Engineering' },
    { name: 'Sales & Marketing', code: 'SALES', description: 'Revenue, Growth and Client Success' },
    { name: 'Human Resources', code: 'HR', description: 'Talent Acquisition, People Operations & Culture' },
    { name: 'Finance & Accounts', code: 'FIN', description: 'Financial Planning, Auditing & Payroll' },
    { name: 'Product Management', code: 'PROD', description: 'Product Roadmap, UX and Strategy' },
    { name: 'Operations & IT', code: 'OPS', description: 'Cloud Infrastructure & Internal Support' },
  ];

  const depts = {};
  for (const d of departmentsData) {
    depts[d.code] = await prisma.department.create({ data: d });
  }

  // Create Job Positions
  const positionsData = [
    { title: 'Lead Architect', code: 'ENG' },
    { title: 'Senior Software Engineer', code: 'ENG' },
    { title: 'Full Stack Engineer', code: 'ENG' },
    { title: 'QA Automation Lead', code: 'ENG' },
    { title: 'VP of Sales', code: 'SALES' },
    { title: 'Senior Account Executive', code: 'SALES' },
    { title: 'Digital Marketing Specialist', code: 'SALES' },
    { title: 'HR Director', code: 'HR' },
    { title: 'HR Manager', code: 'HR' },
    { title: 'Talent Acquisition Lead', code: 'HR' },
    { title: 'Payroll Manager', code: 'FIN' },
    { title: 'Financial Analyst', code: 'FIN' },
    { title: 'Director of Product', code: 'PROD' },
    { title: 'Technical Product Manager', code: 'PROD' },
    { title: 'DevOps & Cloud Engineer', code: 'OPS' },
  ];

  const positionsList = [];
  for (const p of positionsData) {
    const pos = await prisma.jobPosition.create({
      data: { title: p.title, departmentId: depts[p.code].id },
    });
    positionsList.push({ ...pos, deptCode: p.code });
  }

  // Working Schedule (Standard 40h workweek)
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

  // Salary Structure & Rules
  const standardStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Enterprise Structure',
      description: 'Standard compensation package with Basic (60%), HRA (20%), Allowance (28%), PF (12%), and Tax (₹200)',
      active: true,
      salaryRules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, calculationType: 'PERCENTAGE', valueExpression: '0.60 * WAGE', active: true },
          { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 2, calculationType: 'PERCENTAGE', valueExpression: '0.20 * BASIC', active: true },
          { name: 'Standard Special Allowance', code: 'ALLOWANCE', category: 'ALLOWANCE', sequence: 3, calculationType: 'PERCENTAGE', valueExpression: '0.28 * WAGE', active: true },
          { name: 'Provident Fund (Employee)', code: 'PF', category: 'DEDUCTION', sequence: 4, calculationType: 'PERCENTAGE', valueExpression: '0.12 * BASIC', active: true },
          { name: 'Professional Tax', code: 'TAX', category: 'DEDUCTION', sequence: 5, calculationType: 'FIXED', valueExpression: '200', active: true },
        ],
      },
    },
  });

  // Leave Types
  const typePaid = await prisma.timeOffType.create({
    data: { name: 'Paid Time Off', unit: 'DAYS', allocationRequired: true, approvalRequired: true, isPaid: true },
  });
  const typeSick = await prisma.timeOffType.create({
    data: { name: 'Sick Leave', unit: 'DAYS', allocationRequired: true, approvalRequired: true, isPaid: true },
  });
  const typeUnpaid = await prisma.timeOffType.create({
    data: { name: 'Unpaid Leave', unit: 'DAYS', allocationRequired: false, approvalRequired: true, isPaid: false },
  });

  // 4. Generate 260 Users Across All 5 Roles
  console.log('[4/6] Creating 260 Users & 250 Employees distributed across all roles...');

  // Target Distribution (Total = 260 Users):
  // - ADMIN: 10
  // - HR_MANAGER: 20
  // - HR_PAYROLL_MANAGER: 20
  // - HR_PAYROLL_USER: 30
  // - EMPLOYEE: 180

  const userRolesDistribution = [
    ...Array(10).fill('ADMIN'),
    ...Array(20).fill('HR_MANAGER'),
    ...Array(20).fill('HR_PAYROLL_MANAGER'),
    ...Array(30).fill('HR_PAYROLL_USER'),
    ...Array(180).fill('EMPLOYEE'),
  ];

  // Core Demo Accounts Definition
  const coreDemoAccounts = {
    'admin@peoplepay360.com': { name: 'System Administrator', role: 'ADMIN', pwHash: adminPasswordHash },
    'hrmanager@peoplepay360.com': { name: 'Priya Desai', role: 'HR_MANAGER', pwHash: hrPasswordHash, dept: 'HR', pos: 'HR Manager', wage: 78000 },
    'payrollmgr@peoplepay360.com': { name: 'Neha Patel', role: 'HR_PAYROLL_MANAGER', pwHash: payrollMgrPasswordHash, dept: 'FIN', pos: 'Payroll Manager', wage: 92000 },
    'payrolluser@peoplepay360.com': { name: 'Amit Verma', role: 'HR_PAYROLL_USER', pwHash: payrollUserPasswordHash, dept: 'FIN', pos: 'Financial Analyst', wage: 58000 },
    'rahul@peoplepay360.com': { name: 'Rahul Sharma', role: 'EMPLOYEE', pwHash: employeePasswordHash, dept: 'ENG', pos: 'Lead Architect', wage: 85000 },
  };

  const createdUsers = [];
  const createdEmployees = [];
  const createdContracts = [];
  const createdAllocations = [];

  // Standalone Super-Admin (User ID 1)
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@peoplepay360.com',
      password: adminPasswordHash,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });
  createdUsers.push(superAdmin);

  let nameIndex = 0;
  for (let i = 1; i < userRolesDistribution.length; i++) {
    let role = userRolesDistribution[i];
    const empCode = `EMP${String(i).padStart(3, '0')}`;

    let firstName, lastName, fullName, email, pwHash, wage, deptCode, posObj;

    // Check if slot maps to one of our designated core demo accounts
    if (i === 1) {
      // Rahul Sharma (EMPLOYEE)
      role = 'EMPLOYEE';
      firstName = 'Rahul'; lastName = 'Sharma'; fullName = 'Rahul Sharma';
      email = 'rahul@peoplepay360.com'; pwHash = employeePasswordHash; wage = 85000;
      deptCode = 'ENG'; posObj = positionsList.find(p => p.title === 'Lead Architect');
    } else if (i === 2) {
      // Priya Desai (HR_MANAGER)
      role = 'HR_MANAGER';
      firstName = 'Priya'; lastName = 'Desai'; fullName = 'Priya Desai';
      email = 'hrmanager@peoplepay360.com'; pwHash = hrPasswordHash; wage = 78000;
      deptCode = 'HR'; posObj = positionsList.find(p => p.title === 'HR Manager');
    } else if (i === 3) {
      // Neha Patel (HR_PAYROLL_MANAGER)
      role = 'HR_PAYROLL_MANAGER';
      firstName = 'Neha'; lastName = 'Patel'; fullName = 'Neha Patel';
      email = 'payrollmgr@peoplepay360.com'; pwHash = payrollMgrPasswordHash; wage = 92000;
      deptCode = 'FIN'; posObj = positionsList.find(p => p.title === 'Payroll Manager');
    } else if (i === 4) {
      // Amit Verma (HR_PAYROLL_USER)
      role = 'HR_PAYROLL_USER';
      firstName = 'Amit'; lastName = 'Verma'; fullName = 'Amit Verma';
      email = 'payrolluser@peoplepay360.com'; pwHash = payrollUserPasswordHash; wage = 58000;
      deptCode = 'FIN'; posObj = positionsList.find(p => p.title === 'Financial Analyst');
    } else {
      // Unique generated corporate identity
      const fIdx = nameIndex % FIRST_NAMES.length;
      const lIdx = Math.floor(nameIndex / FIRST_NAMES.length) % LAST_NAMES.length;
      firstName = FIRST_NAMES[fIdx];
      lastName = LAST_NAMES[lIdx];
      fullName = `${firstName} ${lastName}`;
      nameIndex++;

      const cleanSlug = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 100 ? i : ''}`;
      email = `${cleanSlug}@peoplepay360.com`;

      if (role === 'ADMIN') pwHash = adminPasswordHash;
      else if (role === 'HR_MANAGER') pwHash = hrPasswordHash;
      else if (role === 'HR_PAYROLL_MANAGER') pwHash = payrollMgrPasswordHash;
      else if (role === 'HR_PAYROLL_USER') pwHash = payrollUserPasswordHash;
      else pwHash = employeePasswordHash;

      // Role-aligned department & position
      if (role === 'HR_MANAGER') {
        deptCode = 'HR';
        posObj = positionsList.find(p => p.deptCode === 'HR');
        wage = 70000 + ((i * 700) % 25000);
      } else if (role === 'HR_PAYROLL_MANAGER' || role === 'HR_PAYROLL_USER') {
        deptCode = 'FIN';
        posObj = positionsList.find(p => p.deptCode === 'FIN');
        wage = 55000 + ((i * 600) % 35000);
      } else if (role === 'ADMIN') {
        deptCode = 'OPS';
        posObj = positionsList.find(p => p.deptCode === 'OPS');
        wage = 90000 + ((i * 1000) % 30000);
      } else {
        // General employee distributed across all departments
        posObj = positionsList[i % positionsList.length];
        deptCode = posObj.deptCode;
        wage = 45000 + ((i * 850) % 55000);
      }
    }

    const bank = BANKS[i % BANKS.length];
    const accNum = `${100000000000 + (i * 382910)}`;
    const panNum = `ABC${String.fromCharCode(65 + (i % 26))}P${1000 + i}${String.fromCharCode(65 + ((i + 3) % 26))}`;

    // Create Employee record
    const emp = await prisma.employee.create({
      data: {
        employeeId: empCode,
        name: fullName,
        email: email,
        phone: `+91 98${String(20000000 + i).slice(0, 8)}`,
        departmentId: depts[deptCode].id,
        jobPositionId: posObj.id,
        workingScheduleId: schedule40.id,
        joiningDate: new Date('2025-01-15T00:00:00.000Z'),
        status: 'ACTIVE',
        bankName: bank.name,
        bankAccountNumber: accNum,
        bankIfscCode: bank.ifsc,
        panNumber: panNum,
      },
    });

    createdEmployees.push({ ...emp, wage, role });

    // Create User record linked to employee
    const user = await prisma.user.create({
      data: {
        email: email,
        password: pwHash,
        name: fullName,
        role: role,
        employeeId: emp.id,
      },
    });
    createdUsers.push(user);

    // Create Active Contract
    const contract = await prisma.contract.create({
      data: {
        employeeId: emp.id,
        startDate: new Date('2025-01-15T00:00:00.000Z'),
        wage: wage,
        salaryStructureId: standardStructure.id,
        status: 'ACTIVE',
        notes: `Enterprise employment contract for ${fullName} (${role})`,
      },
    });
    createdContracts.push(contract);

    // Allocations
    createdAllocations.push(
      { employeeId: emp.id, timeOffTypeId: typePaid.id, allocatedDays: 20, remainingDays: 17, takenDays: 3, year: 2026 },
      { employeeId: emp.id, timeOffTypeId: typeSick.id, allocatedDays: 12, remainingDays: 11, takenDays: 1, year: 2026 }
    );
  }

  // Bulk insert allocations
  await prisma.timeOffAllocation.createMany({ data: createdAllocations });

  // 5. Seed 150+ Time Off Requests
  console.log('[5/6] Seeding Time Off Requests across all departments...');
  const leaveReasons = [
    'Annual family vacation', 'Medical health checkup', 'Personal family function',
    'Dental surgery', 'Child school admission', 'Sister wedding celebration',
    'Attending tech conference', 'Home relocation', 'Fever & recovery', 'Personal emergency'
  ];

  const timeOffRequests = [];
  for (let i = 0; i < createdEmployees.length; i += 2) {
    const emp = createdEmployees[i];
    const start = new Date(2026, 4 + (i % 4), 10 + (i % 15));
    const end = new Date(start);
    end.setDate(start.getDate() + 2);

    timeOffRequests.push({
      employeeId: emp.id,
      timeOffTypeId: i % 3 === 0 ? typeSick.id : typePaid.id,
      startDate: start,
      endDate: end,
      durationDays: 2,
      reason: leaveReasons[i % leaveReasons.length],
      status: i % 5 === 0 ? 'PENDING' : i % 7 === 0 ? 'REJECTED' : 'APPROVED',
    });
  }
  await prisma.timeOffRequest.createMany({ data: timeOffRequests });

  // 6. Seed Attendance Records for August & September 2026
  console.log('[6/6] Seeding Attendance Logs & Historical Payruns...');
  const attendanceRecords = [];
  const augustDays = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 31];
  const septemberDays = [1, 2, 3, 4];
  const workDates = [
    ...augustDays.map(d => ({ y: 2026, m: 7, d })),
    ...septemberDays.map(d => ({ y: 2026, m: 8, d }))
  ];

  for (const emp of createdEmployees) {
    // Generate ~10 attendance records per employee (250 * 10 = 2,500 records)
    for (let di = 0; di < 10; di++) {
      const dt = workDates[(emp.id + di) % workDates.length];
      const attDate = new Date(Date.UTC(dt.y, dt.m, dt.d, 0, 0, 0));
      const isLate = (emp.id + di) % 8 === 0;
      const checkInHour = isLate ? 9 : 8;
      const checkInMin = isLate ? 40 : 55;

      attendanceRecords.push({
        employeeId: emp.id,
        date: attDate,
        checkIn: new Date(Date.UTC(dt.y, dt.m, dt.d, checkInHour, checkInMin, 0)),
        checkOut: new Date(Date.UTC(dt.y, dt.m, dt.d, 18, 15, 0)),
        breakHours: 1.0,
        workedHours: isLate ? 7.6 : 8.3,
        status: isLate ? 'LATE' : 'PRESENT',
      });
    }
  }

  // Insert in batches of 500 for optimal memory usage
  for (let b = 0; b < attendanceRecords.length; b += 500) {
    await prisma.attendance.createMany({
      data: attendanceRecords.slice(b, b + 500),
    });
  }

  // 7. Seed Past Payruns & Payslips for All Employees
  const pastMonths = [
    { name: 'Payrun - June 2026', start: new Date('2026-06-01T00:00:00.000Z'), end: new Date('2026-06-30T00:00:00.000Z'), code: '2026-06' },
    { name: 'Payrun - July 2026', start: new Date('2026-07-01T00:00:00.000Z'), end: new Date('2026-07-31T00:00:00.000Z'), code: '2026-07' },
    { name: 'Payrun - August 2026', start: new Date('2026-08-01T00:00:00.000Z'), end: new Date('2026-08-31T00:00:00.000Z'), code: '2026-08' },
  ];

  let totalPayslipsCount = 0;
  for (const pm of pastMonths) {
    const payrun = await prisma.payrun.create({
      data: {
        name: pm.name,
        salaryStructureId: standardStructure.id,
        periodStart: pm.start,
        periodEnd: pm.end,
        status: 'PAID',
        paidAt: pm.end,
      },
    });

    let grossSum = 0;
    let dedSum = 0;
    let netSum = 0;

    const payslipsData = [];
    for (let idx = 0; idx < createdEmployees.length; idx++) {
      const emp = createdEmployees[idx];
      const contract = createdContracts[idx];
      const wage = emp.wage;

      const basic = Math.round(wage * 0.60);
      const hra = Math.round(basic * 0.20);
      const allowance = Math.round(wage * 0.28);
      const gross = basic + hra + allowance;

      const pf = Math.round(basic * 0.12);
      const tax = 200;
      const deductions = pf + tax;
      const net = gross - deductions;

      grossSum += gross;
      dedSum += deductions;
      netSum += net;

      const slipNumber = `PS-${pm.code}-${String(idx + 1).padStart(3, '0')}`;
      payslipsData.push({
        payslipNumber: slipNumber,
        payrunId: payrun.id,
        employeeId: emp.id,
        contractId: contract.id,
        workingDays: 22.0,
        presentDays: 22.0,
        grossSalary: gross,
        totalDeductions: deductions,
        netSalary: net,
        status: 'PAID',
      });
      totalPayslipsCount++;
    }

    await prisma.payslip.createMany({ data: payslipsData });

    await prisma.payrun.update({
      where: { id: payrun.id },
      data: { totalGross: grossSum, totalDeductions: dedSum, totalNet: netSum },
    });
  }

  // Count final user roles for report
  const adminCount = createdUsers.filter(u => u.role === 'ADMIN').length;
  const hrCount = createdUsers.filter(u => u.role === 'HR_MANAGER').length;
  const payrollMgrCount = createdUsers.filter(u => u.role === 'HR_PAYROLL_MANAGER').length;
  const payrollUserCount = createdUsers.filter(u => u.role === 'HR_PAYROLL_USER').length;
  const empRoleCount = createdUsers.filter(u => u.role === 'EMPLOYEE').length;

  console.log('============================================================');
  console.log('🎉 Enterprise Role-Based Seeding Complete!');
  console.log('------------------------------------------------------------');
  console.log(`✓ Total User Accounts:      ${createdUsers.length}  (Squarely in 200-500 range)`);
  console.log(`   - ADMIN:                 ${adminCount}`);
  console.log(`   - HR_MANAGER:            ${hrCount}`);
  console.log(`   - HR_PAYROLL_MANAGER:    ${payrollMgrCount}`);
  console.log(`   - HR_PAYROLL_USER:       ${payrollUserCount}`);
  console.log(`   - EMPLOYEE:              ${empRoleCount}`);
  console.log(`✓ Total Employee Profiles:  ${createdEmployees.length}`);
  console.log(`✓ Active Contracts:         ${createdContracts.length}`);
  console.log(`✓ Attendance Entries:       ${attendanceRecords.length}`);
  console.log(`✓ Time Off Requests:        ${timeOffRequests.length}`);
  console.log(`✓ Historical Payslips:      ${totalPayslipsCount}`);
  console.log('============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

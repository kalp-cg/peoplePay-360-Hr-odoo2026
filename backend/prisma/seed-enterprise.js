const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Curated pool of 70 first names and 60 last names (4,200 unique combinations)
const FIRST_NAMES = [
  'Rahul', 'Priya', 'Neha', 'Amit', 'Vikram', 'Ananya', 'Rajesh', 'Sneha', 'Rohan', 'Pooja',
  'Karthik', 'Divya', 'Manoj', 'Meera', 'Suresh', 'Kavita', 'Deepak', 'Sunita', 'Alok', 'Swati',
  'Manish', 'Ritu', 'Sandeep', 'Shalini', 'Harish', 'Preeti', 'Nitin', 'Vandana', 'Gaurav', 'Tanvi',
  'Arjun', 'Ishita', 'Aditya', 'Shreya', 'Varun', 'Nidhi', 'Siddharth', 'Rashi', 'Akhil', 'Radhika',
  'Mayank', 'Bhavna', 'Kunal', 'Rashmi', 'Tarun', 'Natasha', 'Abhinav', 'Priyanka', 'Ankit', 'Payal',
  'Sachin', 'Simran', 'Kishore', 'Anjali', 'Vivek', 'Shruti', 'Pranav', 'Kritika', 'Abhishek', 'Monika',
  'Girish', 'Pallavi', 'Yash', 'Lavanya', 'Bhavesh', 'Smriti', 'Devendra', 'Komal', 'Jayant', 'Rupal'
];

const LAST_NAMES = [
  'Sharma', 'Desai', 'Patel', 'Verma', 'Singh', 'Roy', 'Iyer', 'Kulkarni', 'Mehta', 'Nair',
  'Subramanian', 'Joshi', 'Kumar', 'Pillai', 'Reddy', 'Rao', 'Gupta', 'Sen', 'Mishra', 'Bhatt',
  'Agarwal', 'Jain', 'Choudhury', 'Tiwari', 'Nambiar', 'Kapoor', 'Saxena', 'Malhotra', 'Shah', 'Banerjee',
  'Chatterjee', 'Mukherjee', 'Trivedi', 'Bhatia', 'Dutta', 'Pandey', 'Yadav', 'Chauhan', 'Rathore', 'Menon',
  'Bhandari', 'Sarin', 'Narang', 'Kohli', 'Chawla', 'Sood', 'Kashyap', 'Chhabra', 'Bhalla', 'Vohra'
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
  console.log('🌱 Starting Enterprise Scale Seeding (260 Users, All Roles & Diverse Payrun Statuses)...');
  console.log('============================================================');

  // 1. Clean existing records in proper dependency order
  console.log('[1/6] Cleaning existing database records...');
  await prisma.attendancePolicy.deleteMany({});
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

  // 2. Precompute BCrypt Hashes once for lightning speed (< 1s)
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

  // Enterprise Attendance Policy
  const enterprisePolicy = await prisma.attendancePolicy.create({
    data: {
      name: 'Standard Enterprise Policy',
      fullDayHours: 7.0,
      halfDayHours: 4.0,
      gracePeriodMins: 15,
      overtimeThreshold: 9.0,
      breakDeductionHours: 1.0,
      maxShiftHoursCap: 14.0,
      isActive: true,
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
          { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 4, calculationType: 'FORMULA', valueExpression: 'BASIC + HRA + ALLOWANCE', active: true },
          { name: 'Provident Fund (Employee)', code: 'PF', category: 'DEDUCTION', sequence: 5, calculationType: 'PERCENTAGE', valueExpression: '0.12 * BASIC', active: true },
          { name: 'Professional Tax', code: 'TAX', category: 'DEDUCTION', sequence: 6, calculationType: 'FIXED', valueExpression: '200', active: true },
          { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 7, calculationType: 'FORMULA', valueExpression: 'GROSS - PF - TAX', active: true },
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
  console.log('[4/6] Creating 260 Users & 259 Employees with 100% unique names and roles...');

  const userRolesDistribution = [
    ...Array(10).fill('ADMIN'),
    ...Array(20).fill('HR_MANAGER'),
    ...Array(20).fill('HR_PAYROLL_MANAGER'),
    ...Array(30).fill('HR_PAYROLL_USER'),
    ...Array(180).fill('EMPLOYEE'),
  ];

  const createdUsers = [];
  const createdEmployees = [];
  const createdContracts = [];
  const createdAllocations = [];

  // Dedicated Super-Admin Employee Profile (EMP000)
  const superAdminEmp = await prisma.employee.create({
    data: {
      employeeId: 'EMP000',
      name: 'System Administrator',
      email: 'admin@peoplepay360.com',
      phone: '+91 9800000000',
      departmentId: depts['OPS'].id,
      jobPositionId: positionsList.find(p => p.deptCode === 'OPS')?.id || positionsList[0].id,
      workingScheduleId: schedule40.id,
      joiningDate: new Date('2024-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      bankName: 'HDFC Bank',
      bankAccountNumber: '999900001111',
      bankIfscCode: 'HDFC0000123',
      panNumber: 'ADMPA0000Z',
    },
  });
  createdEmployees.push({ ...superAdminEmp, wage: 120000, role: 'ADMIN' });

  // EMP000 is an ACTIVE employee, so it needs its own contract like everybody else.
  // Without one, payroll either skips it or (worse) borrows another employee's wage.
  createdContracts.push(
    await prisma.contract.create({
      data: {
        employeeId: superAdminEmp.id,
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        wage: 120000,
        salaryStructureId: standardStructure.id,
        status: 'ACTIVE',
        notes: 'Enterprise employment contract for System Administrator (ADMIN)',
      },
    })
  );

  // Standalone Super-Admin (User ID 1) linked to EMP000
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@peoplepay360.com',
      password: adminPasswordHash,
      name: 'System Administrator',
      role: 'ADMIN',
      employeeId: superAdminEmp.id,
    },
  });
  createdUsers.push(superAdmin);

  // Time off allocations for Admin
  await prisma.timeOffAllocation.createMany({
    data: [
      { employeeId: superAdminEmp.id, timeOffTypeId: paidTimeOffType.id, allocatedDays: 24, takenDays: 0, remainingDays: 24, year: 2026 },
      { employeeId: superAdminEmp.id, timeOffTypeId: sickLeaveType.id, allocatedDays: 12, takenDays: 0, remainingDays: 12, year: 2026 },
    ],
  });

  // Dedicated generator tracking set to prevent ANY duplicate full names
  const usedFullNames = new Set([
    'System Administrator', 'Rahul Sharma', 'Priya Desai', 'Neha Patel', 'Amit Verma'
  ]);

  let nameCounter = 4; // Start index so 0..3 are reserved for core demo accounts

  for (let i = 1; i < userRolesDistribution.length; i++) {
    let role = userRolesDistribution[i];
    const empCode = `EMP${String(i).padStart(3, '0')}`;

    let firstName, lastName, fullName, email, pwHash, wage, deptCode, posObj;

    if (i === 1) {
      // Core Demo: Rahul Sharma (EMPLOYEE)
      role = 'EMPLOYEE';
      firstName = 'Rahul'; lastName = 'Sharma'; fullName = 'Rahul Sharma';
      email = 'rahul@peoplepay360.com'; pwHash = employeePasswordHash; wage = 85000;
      deptCode = 'ENG'; posObj = positionsList.find(p => p.title === 'Lead Architect');
    } else if (i === 2) {
      // Core Demo: Priya Desai (HR_MANAGER)
      role = 'HR_MANAGER';
      firstName = 'Priya'; lastName = 'Desai'; fullName = 'Priya Desai';
      email = 'hrmanager@peoplepay360.com'; pwHash = hrPasswordHash; wage = 78000;
      deptCode = 'HR'; posObj = positionsList.find(p => p.title === 'HR Manager');
    } else if (i === 3) {
      // Core Demo: Neha Patel (HR_PAYROLL_MANAGER)
      role = 'HR_PAYROLL_MANAGER';
      firstName = 'Neha'; lastName = 'Patel'; fullName = 'Neha Patel';
      email = 'payrollmgr@peoplepay360.com'; pwHash = payrollMgrPasswordHash; wage = 92000;
      deptCode = 'FIN'; posObj = positionsList.find(p => p.title === 'Payroll Manager');
    } else if (i === 4) {
      // Core Demo: Amit Verma (HR_PAYROLL_USER)
      role = 'HR_PAYROLL_USER';
      firstName = 'Amit'; lastName = 'Verma'; fullName = 'Amit Verma';
      email = 'payrolluser@peoplepay360.com'; pwHash = payrollUserPasswordHash; wage = 58000;
      deptCode = 'FIN'; posObj = positionsList.find(p => p.title === 'Financial Analyst');
    } else {
      // Pick unique combination from pool
      do {
        const fIdx = nameCounter % FIRST_NAMES.length;
        const lIdx = (Math.floor(nameCounter / FIRST_NAMES.length) + (nameCounter % 7)) % LAST_NAMES.length;
        firstName = FIRST_NAMES[fIdx];
        lastName = LAST_NAMES[lIdx];
        fullName = `${firstName} ${lastName}`;
        nameCounter++;
      } while (usedFullNames.has(fullName));

      usedFullNames.add(fullName);

      const cleanSlug = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 150 ? i : ''}`;
      email = `${cleanSlug}@peoplepay360.com`;

      if (role === 'ADMIN') pwHash = adminPasswordHash;
      else if (role === 'HR_MANAGER') pwHash = hrPasswordHash;
      else if (role === 'HR_PAYROLL_MANAGER') pwHash = payrollMgrPasswordHash;
      else if (role === 'HR_PAYROLL_USER') pwHash = payrollUserPasswordHash;
      else pwHash = employeePasswordHash;

      // Realistic role-based wage distribution
      if (role === 'HR_MANAGER') {
        deptCode = 'HR';
        posObj = positionsList.find(p => p.deptCode === 'HR');
        wage = 68000 + ((i * 850) % 24000);
      } else if (role === 'HR_PAYROLL_MANAGER') {
        deptCode = 'FIN';
        posObj = positionsList.find(p => p.title === 'Payroll Manager');
        wage = 85000 + ((i * 900) % 25000);
      } else if (role === 'HR_PAYROLL_USER') {
        deptCode = 'FIN';
        posObj = positionsList.find(p => p.title === 'Financial Analyst');
        wage = 52000 + ((i * 650) % 22000);
      } else if (role === 'ADMIN') {
        deptCode = 'OPS';
        posObj = positionsList.find(p => p.deptCode === 'OPS');
        wage = 90000 + ((i * 1200) % 30000);
      } else {
        posObj = positionsList[i % positionsList.length];
        deptCode = posObj.deptCode;
        wage = 42000 + ((i * 750) % 65000);
      }
    }

    const bank = BANKS[i % BANKS.length];
    const accNum = `${100000000000 + (i * 382910)}`;
    const panNum = `ABC${String.fromCharCode(65 + (i % 26))}P${1000 + i}${String.fromCharCode(65 + ((i + 3) % 26))}`;

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

    // takenDays starts at zero and is derived from approved requests further down,
    // so the balance on screen always matches the leave history behind it.
    createdAllocations.push(
      { employeeId: emp.id, timeOffTypeId: typePaid.id, allocatedDays: 20, remainingDays: 20, takenDays: 0, year: 2026 },
      { employeeId: emp.id, timeOffTypeId: typeSick.id, allocatedDays: 12, remainingDays: 12, takenDays: 0, year: 2026 }
    );
  }

  await prisma.timeOffAllocation.createMany({ data: createdAllocations });

  // 5. Seed 130 Time Off Requests
  console.log('[5/6] Seeding Time Off Requests across departments...');
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

  // Consume allocation balances from the approved requests that were just created.
  // This mirrors the runtime rule in timeoff.repository.approveRequest(), so the
  // Time Off screen and the leave balance cards can never disagree.
  const approvedTotals = await prisma.timeOffRequest.groupBy({
    by: ['employeeId', 'timeOffTypeId'],
    where: { status: 'APPROVED' },
    _sum: { durationDays: true },
  });
  for (const total of approvedTotals) {
    const taken = total._sum.durationDays || 0;
    const allocation = await prisma.timeOffAllocation.findFirst({
      where: { employeeId: total.employeeId, timeOffTypeId: total.timeOffTypeId, year: 2026 },
    });
    if (!allocation) continue;
    await prisma.timeOffAllocation.update({
      where: { id: allocation.id },
      data: { takenDays: taken, remainingDays: Math.max(0, allocation.allocatedDays - taken) },
    });
  }

  // 6. Seed Attendance Records
  console.log('[6/6] Seeding Attendance Logs & Multi-Status Payruns...');
  const attendanceRecords = [];
  const augustDays = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 31];
  const septemberDays = [1, 2, 3, 4];
  const workDates = [
    ...augustDays.map(d => ({ y: 2026, m: 7, d })),
    ...septemberDays.map(d => ({ y: 2026, m: 8, d }))
  ];

  for (const emp of createdEmployees) {
    for (let di = 0; di < 10; di++) {
      const dt = workDates[(emp.id + di) % workDates.length];
      const attDate = new Date(Date.UTC(dt.y, dt.m, dt.d, 0, 0, 0));
      const isHalfDay = (emp.id + di) % 15 === 0;
      const isOvertime = !isHalfDay && (emp.id + di) % 12 === 0;
      const isLate = !isHalfDay && !isOvertime && (emp.id + di) % 8 === 0;

      let checkInHour = 8;
      let checkInMin = 55;
      let checkOutHour = 18;
      let checkOutMin = 15;
      let breakHours = 1.0;
      let workedHours = 8.3;
      let status = 'PRESENT';

      if (isHalfDay) {
        checkInHour = 9;
        checkInMin = 0;
        checkOutHour = 13;
        checkOutMin = 30;
        breakHours = 0.0;
        workedHours = 4.5;
        status = 'HALF_DAY';
      } else if (isOvertime) {
        checkInHour = 8;
        checkInMin = 30;
        checkOutHour = 19;
        checkOutMin = 45;
        breakHours = 1.0;
        workedHours = 10.25;
        status = 'OVERTIME';
      } else if (isLate) {
        checkInHour = 9;
        checkInMin = 40;
        checkOutHour = 18;
        checkOutMin = 15;
        breakHours = 1.0;
        workedHours = 7.6;
        status = 'LATE';
      }

      attendanceRecords.push({
        employeeId: emp.id,
        date: attDate,
        checkIn: new Date(Date.UTC(dt.y, dt.m, dt.d, checkInHour, checkInMin, 0)),
        checkOut: new Date(Date.UTC(dt.y, dt.m, dt.d, checkOutHour, checkOutMin, 0)),
        breakHours,
        workedHours,
        status,
      });
    }
  }

  for (let b = 0; b < attendanceRecords.length; b += 500) {
    await prisma.attendance.createMany({
      data: attendanceRecords.slice(b, b + 500),
    });
  }

  // 7. Seed Payruns with ALL 5 Statuses and Genuinely Different Numbers!
  console.log('Generating Payrun Batches across ALL 5 statuses (DRAFT, COMPUTED, WARNING, VALIDATED, PAID)...');

  const payrunsPlan = [
    {
      name: 'Payrun - September 2026 (General Operations)',
      start: new Date('2026-09-01T00:00:00.000Z'),
      end: new Date('2026-09-30T00:00:00.000Z'),
      code: '2026-09',
      status: 'COMPUTED',
      slipStatus: 'COMPUTED',
      wageMultiplier: 1.02,
      workingDays: 22.0,
      empSubset: createdEmployees, // all 259 employees
      paidAt: null,
    },
    {
      name: 'Payrun - September 2026 (Executive & Leadership)',
      start: new Date('2026-09-01T00:00:00.000Z'),
      end: new Date('2026-09-30T00:00:00.000Z'),
      code: '2026-09-EXEC',
      status: 'DRAFT',
      slipStatus: null, // Draft batch with 0 slips yet
      empSubset: [],
      paidAt: null,
    },
    {
      name: 'Payrun - August 2026 (General Payroll)',
      start: new Date('2026-08-01T00:00:00.000Z'),
      end: new Date('2026-08-31T00:00:00.000Z'),
      code: '2026-08',
      status: 'PAID',
      slipStatus: 'PAID',
      wageMultiplier: 1.0,
      workingDays: 22.0,
      empSubset: createdEmployees,
      paidAt: new Date('2026-08-31T17:00:00.000Z'),
    },
    {
      name: 'Payrun - August 2026 (Quarterly Performance Incentive)',
      start: new Date('2026-08-01T00:00:00.000Z'),
      end: new Date('2026-08-31T00:00:00.000Z'),
      code: '2026-08-BONUS',
      status: 'VALIDATED',
      slipStatus: 'VALIDATED',
      wageMultiplier: 0.40,
      workingDays: 22.0,
      empSubset: createdEmployees.slice(0, 35), // 35 leadership/sales employees
      paidAt: null,
    },
    {
      name: 'Payrun - August 2026 (Contractor & External Advisory)',
      start: new Date('2026-08-01T00:00:00.000Z'),
      end: new Date('2026-08-31T00:00:00.000Z'),
      code: '2026-08-CONT',
      status: 'WARNING',
      slipStatus: 'COMPUTED',
      wageMultiplier: 0.85,
      workingDays: 19.0,
      empSubset: createdEmployees.slice(35, 55), // 20 contractors
      paidAt: null,
      warnings: [
        { type: 'TAX_DECLARATION_PENDING', severity: 'WARNING', message: 'TDS certificate pending verification for 3 consultant accounts.' },
        { type: 'CONTRACT_EXPIRY_WARNING', severity: 'CRITICAL', message: 'Advisory contract agreement expires at end of current period.' },
      ],
    },
    {
      name: 'Payrun - July 2026',
      start: new Date('2026-07-01T00:00:00.000Z'),
      end: new Date('2026-07-31T00:00:00.000Z'),
      code: '2026-07',
      status: 'PAID',
      slipStatus: 'PAID',
      wageMultiplier: 1.06, // 23 working days + mid-year bonus
      workingDays: 23.0,
      empSubset: createdEmployees,
      paidAt: new Date('2026-07-31T17:00:00.000Z'),
    },
    {
      name: 'Payrun - June 2026',
      start: new Date('2026-06-01T00:00:00.000Z'),
      end: new Date('2026-06-30T00:00:00.000Z'),
      code: '2026-06',
      status: 'PAID',
      slipStatus: 'PAID',
      wageMultiplier: 0.96, // 21 working days
      workingDays: 21.0,
      empSubset: createdEmployees,
      paidAt: new Date('2026-06-30T17:00:00.000Z'),
    },
    {
      name: 'Payrun - May 2026',
      start: new Date('2026-05-01T00:00:00.000Z'),
      end: new Date('2026-05-31T00:00:00.000Z'),
      code: '2026-05',
      status: 'PAID',
      slipStatus: 'PAID',
      wageMultiplier: 0.93, // 21 working days
      workingDays: 21.0,
      empSubset: createdEmployees,
      paidAt: new Date('2026-05-31T17:00:00.000Z'),
    },
    {
      name: 'Payrun - April 2026',
      start: new Date('2026-04-01T00:00:00.000Z'),
      end: new Date('2026-04-30T00:00:00.000Z'),
      code: '2026-04',
      status: 'PAID',
      slipStatus: 'PAID',
      wageMultiplier: 0.89, // 20 working days
      workingDays: 20.0,
      empSubset: createdEmployees,
      paidAt: new Date('2026-04-30T17:00:00.000Z'),
    },
  ];

  let totalPayslipsCount = 0;

  for (const prDef of payrunsPlan) {
    const payrun = await prisma.payrun.create({
      data: {
        name: prDef.name,
        salaryStructureId: standardStructure.id,
        periodStart: prDef.start,
        periodEnd: prDef.end,
        status: prDef.status,
        paidAt: prDef.paidAt,
      },
    });

    // Create warnings if specified
    if (prDef.warnings && prDef.warnings.length > 0) {
      for (const w of prDef.warnings) {
        await prisma.payrollWarning.create({
          data: {
            payrunId: payrun.id,
            type: w.type,
            severity: w.severity,
            message: w.message,
            isResolved: false,
          },
        });
      }
    }

    if (!prDef.empSubset || prDef.empSubset.length === 0) {
      // Draft payrun with 0 slips
      continue;
    }

    let grossSum = 0;
    let dedSum = 0;
    let netSum = 0;

    const payslipsData = [];
    const linesData = [];

    for (let idx = 0; idx < prDef.empSubset.length; idx++) {
      const emp = prDef.empSubset[idx];
      // Never borrow another employee's contract: a payslip must be computed from
      // the contract that belongs to its own employee, or not generated at all.
      const contract = createdContracts.find(c => c.employeeId === emp.id);
      if (!contract) {
        console.warn(`  ! Skipping payslip for ${emp.employeeId || emp.id} - no contract on record`);
        continue;
      }


      const effectiveWage = Math.round(emp.wage * prDef.wageMultiplier);
      const basic = Math.round(effectiveWage * 0.60);
      const hra = Math.round(basic * 0.20);
      const allowance = Math.round(effectiveWage * 0.28);
      const gross = basic + hra + allowance;

      const pf = Math.round(basic * 0.12);
      const tax = 200;
      const deductions = pf + tax;
      const net = gross - deductions;

      grossSum += gross;
      dedSum += deductions;
      netSum += net;

      const slipNumber = `PS-${prDef.code}-${String(idx + 1).padStart(3, '0')}`;
      const slip = await prisma.payslip.create({
        data: {
          payslipNumber: slipNumber,
          payrunId: payrun.id,
          employeeId: emp.id,
          contractId: contract.id,
          workingDays: prDef.workingDays,
          presentDays: prDef.workingDays,
          grossSalary: gross,
          totalDeductions: deductions,
          netSalary: net,
          status: prDef.slipStatus || 'DRAFT',
        },
      });

      totalPayslipsCount++;

      linesData.push(
        { payslipId: slip.id, code: 'BASIC', name: 'Basic Salary', category: 'BASIC', sequence: 1, amount: basic },
        { payslipId: slip.id, code: 'HRA', name: 'House Rent Allowance', category: 'ALLOWANCE', sequence: 2, amount: hra },
        { payslipId: slip.id, code: 'ALLOWANCE', name: 'Standard Special Allowance', category: 'ALLOWANCE', sequence: 3, amount: allowance },
        { payslipId: slip.id, code: 'GROSS', name: 'Gross Salary', category: 'GROSS', sequence: 4, amount: gross },
        { payslipId: slip.id, code: 'PF', name: 'Provident Fund (Employee)', category: 'DEDUCTION', sequence: 5, amount: pf },
        { payslipId: slip.id, code: 'TAX', name: 'Professional Tax', category: 'DEDUCTION', sequence: 6, amount: tax },
        { payslipId: slip.id, code: 'NET', name: 'Net Salary', category: 'NET', sequence: 7, amount: net }
      );
    }

    // Bulk insert payslip lines
    for (let b = 0; b < linesData.length; b += 500) {
      await prisma.payslipLine.createMany({ data: linesData.slice(b, b + 500) });
    }

    await prisma.payrun.update({
      where: { id: payrun.id },
      data: { totalGross: grossSum, totalDeductions: dedSum, totalNet: netSum },
    });
  }

  // Seed compliance audit trail logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: 'ATTENDANCE_POLICY_UPDATED',
        entityName: 'AttendancePolicy',
        entityId: '1',
        previousValue: JSON.stringify({ fullDayHours: 8.0, halfDayHours: 4.5, gracePeriodMins: 10 }),
        newValue: JSON.stringify({ fullDayHours: 7.0, halfDayHours: 4.0, gracePeriodMins: 15, maxShiftHoursCap: 14.0 }),
        timestamp: new Date('2026-09-01T09:15:00.000Z'),
      },
      {
        userId: createdUsers.find(u => u.role === 'HR_PAYROLL_MANAGER')?.id || superAdmin.id,
        action: 'PAYRUN_COMPUTED',
        entityName: 'Payrun',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'DRAFT', computedCount: 0 }),
        newValue: JSON.stringify({ status: 'COMPUTED', computedCount: 260, grossTotal: 18742000, deductions: 1680000 }),
        timestamp: new Date('2026-08-30T10:00:00.000Z'),
      },
      {
        userId: createdUsers.find(u => u.role === 'HR_PAYROLL_MANAGER')?.id || superAdmin.id,
        action: 'PAYRUN_VALIDATED',
        entityName: 'Payrun',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'COMPUTED' }),
        newValue: JSON.stringify({ status: 'VALIDATED', approvedBy: 'Neha Patel', totalNet: 17062000 }),
        timestamp: new Date('2026-08-31T14:30:00.000Z'),
      },
      {
        userId: superAdmin.id,
        action: 'PAYRUN_PAID',
        entityName: 'Payrun',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'VALIDATED' }),
        newValue: JSON.stringify({ status: 'PAID', paymentRef: 'NEFT-BATCH-20260831-01', totalDisbursed: 17062000 }),
        timestamp: new Date('2026-08-31T17:00:00.000Z'),
      },
      {
        userId: createdUsers.find(u => u.role === 'HR_MANAGER')?.id || superAdmin.id,
        action: 'TIME_OFF_APPROVED',
        entityName: 'TimeOffRequest',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'PENDING' }),
        newValue: JSON.stringify({ status: 'APPROVED', employee: 'Rahul Sharma', leaveType: 'Sick Leave', durationDays: 2 }),
        timestamp: new Date('2026-08-28T11:20:00.000Z'),
      },
      {
        userId: createdUsers.find(u => u.role === 'HR_MANAGER')?.id || superAdmin.id,
        action: 'TIME_OFF_REJECTED',
        entityName: 'TimeOffRequest',
        entityId: '2',
        previousValue: JSON.stringify({ status: 'PENDING' }),
        newValue: JSON.stringify({ status: 'REJECTED', employee: 'Karthik Verma', reason: 'Insufficient remaining allocation balance' }),
        timestamp: new Date('2026-08-27T16:45:00.000Z'),
      },
      {
        userId: superAdmin.id,
        action: 'ATTENDANCE_CORRECTED',
        entityName: 'Attendance',
        entityId: '13775',
        previousValue: JSON.stringify({ checkIn: '09:45:00', checkOut: null, status: 'INCOMPLETE' }),
        newValue: JSON.stringify({ checkIn: '09:00:00', checkOut: '18:15:00', workedHours: 8.3, status: 'PRESENT', reason: 'Biometric scanner malfunction at reception gate 2' }),
        timestamp: new Date('2026-08-25T19:10:00.000Z'),
      },
      {
        userId: createdUsers.find(u => u.role === 'HR_MANAGER')?.id || superAdmin.id,
        action: 'EMPLOYEE_CREATED',
        entityName: 'Employee',
        entityId: '1074',
        previousValue: null,
        newValue: JSON.stringify({ employeeId: 'EMP001', name: 'Rahul Sharma', position: 'Lead Architect', department: 'Engineering' }),
        timestamp: new Date('2026-01-15T09:00:00.000Z'),
      },
      {
        userId: createdUsers.find(u => u.role === 'HR_MANAGER')?.id || superAdmin.id,
        action: 'CONTRACT_CREATED',
        entityName: 'Contract',
        entityId: '1',
        previousValue: null,
        newValue: JSON.stringify({ employeeId: 'EMP001', wage: 85000, structure: 'Regular Enterprise Structure', status: 'ACTIVE' }),
        timestamp: new Date('2026-01-15T09:30:00.000Z'),
      }
    ]
  });

  const adminCount = createdUsers.filter(u => u.role === 'ADMIN').length;
  const hrCount = createdUsers.filter(u => u.role === 'HR_MANAGER').length;
  const payrollMgrCount = createdUsers.filter(u => u.role === 'HR_PAYROLL_MANAGER').length;
  const payrollUserCount = createdUsers.filter(u => u.role === 'HR_PAYROLL_USER').length;
  const empRoleCount = createdUsers.filter(u => u.role === 'EMPLOYEE').length;

  console.log('============================================================');
  console.log('🎉 Enterprise Role-Based Seeding Complete!');
  console.log('------------------------------------------------------------');
  console.log(`✓ Total User Accounts:      ${createdUsers.length} (Squarely in 200-500 range)`);
  console.log(`   - ADMIN:                 ${adminCount}`);
  console.log(`   - HR_MANAGER:            ${hrCount}`);
  console.log(`   - HR_PAYROLL_MANAGER:    ${payrollMgrCount}`);
  console.log(`   - HR_PAYROLL_USER:       ${payrollUserCount}`);
  console.log(`   - EMPLOYEE:              ${empRoleCount}`);
  console.log(`✓ Total Employee Profiles:  ${createdEmployees.length} (100% Unique Names)`);
  console.log(`✓ Active Contracts:         ${createdContracts.length}`);
  console.log(`✓ Attendance Entries:       ${attendanceRecords.length}`);
  console.log(`✓ Time Off Requests:        ${timeOffRequests.length}`);
  console.log(`✓ Payrun Batches:           ${payrunsPlan.length} (Covering ALL 5 Statuses: DRAFT, COMPUTED, WARNING, VALIDATED, PAID)`);
  console.log(`✓ Generated Payslips:       ${totalPayslipsCount}`);
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

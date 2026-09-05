const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('============================================================');
  console.log('🌱 Starting PeoplePay360 Enterprise Dataset Seeding (200-500+ records)...');
  console.log('============================================================');

  // 1. Clean existing records in proper dependency order
  console.log('[1/7] Cleaning existing records...');
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

  // 2. Create Departments
  console.log('[2/7] Creating Departments & Job Positions...');
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

  // 3. Create Job Positions
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

  const positions = {};
  for (const p of positionsData) {
    const pos = await prisma.jobPosition.create({
      data: { title: p.title, departmentId: depts[p.code].id },
    });
    positions[p.title] = pos;
  }

  // 4. Create Working Schedule & Schedule Days (Standard 40h workweek)
  console.log('[3/7] Creating Working Schedules & Salary Structures...');
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

  // 5. Create Salary Structure & Standard Rules
  const standardStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Enterprise Structure',
      description: 'Standard compensation package with Basic (60%), HRA (20%), Allowance (20%), PF (12%), and Tax',
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
            name: 'Standard Special Allowance',
            code: 'ALLOWANCE',
            category: 'ALLOWANCE',
            sequence: 3,
            calculationType: 'PERCENTAGE',
            valueExpression: '0.28 * WAGE',
            active: true,
          },
          {
            name: 'Provident Fund (Employee)',
            code: 'PF',
            category: 'DEDUCTION',
            sequence: 4,
            calculationType: 'PERCENTAGE',
            valueExpression: '0.12 * BASIC',
            active: true,
          },
          {
            name: 'Professional Tax',
            code: 'TAX',
            category: 'DEDUCTION',
            sequence: 5,
            calculationType: 'FIXED',
            valueExpression: '200',
            active: true,
          },
        ],
      },
    },
  });

  // 6. Create Time Off Types
  const typePaid = await prisma.timeOffType.create({
    data: { name: 'Paid Time Off', unit: 'DAYS', allocationRequired: true, approvalRequired: true, isPaid: true },
  });
  const typeSick = await prisma.timeOffType.create({
    data: { name: 'Sick Leave', unit: 'DAYS', allocationRequired: true, approvalRequired: true, isPaid: true },
  });
  const typeUnpaid = await prisma.timeOffType.create({
    data: { name: 'Unpaid Leave', unit: 'DAYS', allocationRequired: false, approvalRequired: true, isPaid: false },
  });

  // 7. Create Admin User (Unlinked)
  const defaultPasswordHash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@peoplepay360.com',
      password: defaultPasswordHash,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  // 8. Create 30 Enterprise Employees with Contracts, Users, and Allocations
  console.log('[4/7] Seeding 30 Enterprise Employees & Employment Contracts...');
  const employeesDef = [
    // Core Demo Accounts
    {
      code: 'EMP001', name: 'Rahul Sharma', email: 'rahul@peoplepay360.com', phone: '+91 98201 11001',
      dept: 'ENG', pos: 'Lead Architect', role: 'EMPLOYEE', wage: 85000, password: 'Rahul@123',
      bank: 'HDFC Bank', acc: '50100438291021', ifsc: 'HDFC0000240', pan: 'ABCPS1234F'
    },
    {
      code: 'EMP002', name: 'Priya Desai', email: 'hrmanager@peoplepay360.com', phone: '+91 98201 11002',
      dept: 'HR', pos: 'HR Manager', role: 'HR_MANAGER', wage: 75000, password: 'HR@123',
      bank: 'ICICI Bank', acc: '00240158291032', ifsc: 'ICIC0000024', pan: 'BDEPD5678G'
    },
    {
      code: 'EMP003', name: 'Amit Verma', email: 'payrolluser@peoplepay360.com', phone: '+91 98201 11003',
      dept: 'FIN', pos: 'Financial Analyst', role: 'HR_PAYROLL_USER', wage: 55000, password: 'Payroll@123',
      bank: 'State Bank of India', acc: '30248591023412', ifsc: 'SBIN0001040', pan: 'CFGPA9012H'
    },
    {
      code: 'EMP004', name: 'Neha Patel', email: 'payrollmgr@peoplepay360.com', phone: '+91 98201 11004',
      dept: 'FIN', pos: 'Payroll Manager', role: 'HR_PAYROLL_MANAGER', wage: 90000, password: 'PayrollMgr@123',
      bank: 'Axis Bank', acc: '91201002349182', ifsc: 'UTIB0000128', pan: 'DHJPN3456J'
    },
    // Engineering Team
    { code: 'EMP005', name: 'Vikram Singh', email: 'vikram.singh@peoplepay360.com', phone: '+91 98201 11005', dept: 'ENG', pos: 'Senior Software Engineer', role: 'EMPLOYEE', wage: 95000, bank: 'HDFC Bank', acc: '50100438291025', ifsc: 'HDFC0000240', pan: 'VIKPS1235K' },
    { code: 'EMP006', name: 'Ananya Roy', email: 'ananya.roy@peoplepay360.com', phone: '+91 98201 11006', dept: 'ENG', pos: 'Senior Software Engineer', role: 'EMPLOYEE', wage: 88000, bank: 'ICICI Bank', acc: '00240158291036', ifsc: 'ICIC0000024', pan: 'ANAPS1236L' },
    { code: 'EMP007', name: 'Rajesh Iyer', email: 'rajesh.iyer@peoplepay360.com', phone: '+91 98201 11007', dept: 'ENG', pos: 'Full Stack Engineer', role: 'EMPLOYEE', wage: 65000, bank: 'State Bank of India', acc: '30248591023417', ifsc: 'SBIN0001040', pan: 'RAJPS1237M' },
    { code: 'EMP008', name: 'Sneha Kulkarni', email: 'sneha.k@peoplepay360.com', phone: '+91 98201 11008', dept: 'ENG', pos: 'QA Automation Lead', role: 'EMPLOYEE', wage: 70000, bank: 'HDFC Bank', acc: '50100438291028', ifsc: 'HDFC0000240', pan: 'SNEPS1238N' },
    { code: 'EMP009', name: 'Rohan Mehta', email: 'rohan.mehta@peoplepay360.com', phone: '+91 98201 11009', dept: 'ENG', pos: 'Full Stack Engineer', role: 'EMPLOYEE', wage: 60000, bank: 'Axis Bank', acc: '91201002349189', ifsc: 'UTIB0000128', pan: 'ROHPS1239P' },
    // Sales & Marketing Team
    { code: 'EMP010', name: 'Karthik Subramanian', email: 'karthik.s@peoplepay360.com', phone: '+91 98201 11010', dept: 'SALES', pos: 'VP of Sales', role: 'EMPLOYEE', wage: 130000, bank: 'HDFC Bank', acc: '50100438291030', ifsc: 'HDFC0000240', pan: 'KARPS1240Q' },
    { code: 'EMP011', name: 'Pooja Nair', email: 'pooja.nair@peoplepay360.com', phone: '+91 98201 11011', dept: 'SALES', pos: 'Senior Account Executive', role: 'EMPLOYEE', wage: 75000, bank: 'ICICI Bank', acc: '00240158291041', ifsc: 'ICIC0000024', pan: 'POOPS1241R' },
    { code: 'EMP012', name: 'Manoj Kumar', email: 'manoj.k@peoplepay360.com', phone: '+91 98201 11012', dept: 'SALES', pos: 'Digital Marketing Specialist', role: 'EMPLOYEE', wage: 52000, bank: 'State Bank of India', acc: '30248591023422', ifsc: 'SBIN0001040', pan: 'MANPS1242S' },
    { code: 'EMP013', name: 'Divya Joshi', email: 'divya.joshi@peoplepay360.com', phone: '+91 98201 11013', dept: 'SALES', pos: 'Senior Account Executive', role: 'EMPLOYEE', wage: 68000, bank: 'Axis Bank', acc: '91201002349193', ifsc: 'UTIB0000128', pan: 'DIVPS1243T' },
    // HR & Talent Team
    { code: 'EMP014', name: 'Meera Pillai', email: 'meera.p@peoplepay360.com', phone: '+91 98201 11014', dept: 'HR', pos: 'HR Director', role: 'EMPLOYEE', wage: 115000, bank: 'HDFC Bank', acc: '50100438291034', ifsc: 'HDFC0000240', pan: 'MEEPS1244U' },
    { code: 'EMP015', name: 'Suresh Reddy', email: 'suresh.r@peoplepay360.com', phone: '+91 98201 11015', dept: 'HR', pos: 'Talent Acquisition Lead', role: 'EMPLOYEE', wage: 62000, bank: 'ICICI Bank', acc: '00240158291045', ifsc: 'ICIC0000024', pan: 'SURPS1245V' },
    { code: 'EMP016', name: 'Kavita Rao', email: 'kavita.rao@peoplepay360.com', phone: '+91 98201 11016', dept: 'HR', pos: 'HR Manager', role: 'EMPLOYEE', wage: 58000, bank: 'State Bank of India', acc: '30248591023426', ifsc: 'SBIN0001040', pan: 'KAVPS1246W' },
    // Product & UX Team
    { code: 'EMP017', name: 'Deepak Gupta', email: 'deepak.gupta@peoplepay360.com', phone: '+91 98201 11017', dept: 'PROD', pos: 'Director of Product', role: 'EMPLOYEE', wage: 140000, bank: 'HDFC Bank', acc: '50100438291037', ifsc: 'HDFC0000240', pan: 'DEEPS1247X' },
    { code: 'EMP018', name: 'Sunita Sen', email: 'sunita.sen@peoplepay360.com', phone: '+91 98201 11018', dept: 'PROD', pos: 'Technical Product Manager', role: 'EMPLOYEE', wage: 92000, bank: 'ICICI Bank', acc: '00240158291048', ifsc: 'ICIC0000024', pan: 'SUNPS1248Y' },
    { code: 'EMP019', name: 'Alok Mishra', email: 'alok.m@peoplepay360.com', phone: '+91 98201 11019', dept: 'PROD', pos: 'Technical Product Manager', role: 'EMPLOYEE', wage: 84000, bank: 'Axis Bank', acc: '91201002349199', ifsc: 'UTIB0000128', pan: 'ALOPS1249Z' },
    // Operations & DevOps
    { code: 'EMP020', name: 'Swati Bhatt', email: 'swati.bhatt@peoplepay360.com', phone: '+91 98201 11020', dept: 'OPS', pos: 'DevOps & Cloud Engineer', role: 'EMPLOYEE', wage: 88000, bank: 'HDFC Bank', acc: '50100438291040', ifsc: 'HDFC0000240', pan: 'SWAPS1250A' },
    { code: 'EMP021', name: 'Manish Agarwal', email: 'manish.a@peoplepay360.com', phone: '+91 98201 11021', dept: 'OPS', pos: 'DevOps & Cloud Engineer', role: 'EMPLOYEE', wage: 76000, bank: 'State Bank of India', acc: '30248591023431', ifsc: 'SBIN0001040', pan: 'MANPS1251B' },
    { code: 'EMP022', name: 'Ritu Jain', email: 'ritu.jain@peoplepay360.com', phone: '+91 98201 11022', dept: 'FIN', pos: 'Financial Analyst', role: 'EMPLOYEE', wage: 58000, bank: 'ICICI Bank', acc: '00240158291052', ifsc: 'ICIC0000024', pan: 'RITPS1252C' },
    { code: 'EMP023', name: 'Sandeep Choudhury', email: 'sandeep.c@peoplepay360.com', phone: '+91 98201 11023', dept: 'SALES', pos: 'Senior Account Executive', role: 'EMPLOYEE', wage: 64000, bank: 'HDFC Bank', acc: '50100438291043', ifsc: 'HDFC0000240', pan: 'SANPS1253D' },
    { code: 'EMP024', name: 'Shalini Tiwari', email: 'shalini.t@peoplepay360.com', phone: '+91 98201 11024', dept: 'ENG', pos: 'Full Stack Engineer', role: 'EMPLOYEE', wage: 62000, bank: 'Axis Bank', acc: '91201002349204', ifsc: 'UTIB0000128', pan: 'SHAPS1254E' },
    { code: 'EMP025', name: 'Harish Nambiar', email: 'harish.n@peoplepay360.com', phone: '+91 98201 11025', dept: 'ENG', pos: 'Senior Software Engineer', role: 'EMPLOYEE', wage: 90000, bank: 'State Bank of India', acc: '30248591023435', ifsc: 'SBIN0001040', pan: 'HARPS1255F' },
    { code: 'EMP026', name: 'Preeti Kapoor', email: 'preeti.k@peoplepay360.com', phone: '+91 98201 11026', dept: 'SALES', pos: 'Digital Marketing Specialist', role: 'EMPLOYEE', wage: 50000, bank: 'ICICI Bank', acc: '00240158291056', ifsc: 'ICIC0000024', pan: 'PREPS1256G' },
    { code: 'EMP027', name: 'Nitin Saxena', email: 'nitin.s@peoplepay360.com', phone: '+91 98201 11027', dept: 'ENG', pos: 'QA Automation Lead', role: 'EMPLOYEE', wage: 68000, bank: 'HDFC Bank', acc: '50100438291047', ifsc: 'HDFC0000240', pan: 'NITPS1257H' },
    { code: 'EMP028', name: 'Vandana Verma', email: 'vandana.v@peoplepay360.com', phone: '+91 98201 11028', dept: 'HR', pos: 'Talent Acquisition Lead', role: 'EMPLOYEE', wage: 60000, bank: 'Axis Bank', acc: '91201002349208', ifsc: 'UTIB0000128', pan: 'VANPS1258J' },
    { code: 'EMP029', name: 'Gaurav Malhotra', email: 'gaurav.m@peoplepay360.com', phone: '+91 98201 11029', dept: 'FIN', pos: 'Financial Analyst', role: 'EMPLOYEE', wage: 56000, bank: 'State Bank of India', acc: '30248591023439', ifsc: 'SBIN0001040', pan: 'GAUPS1259K' },
    { code: 'EMP030', name: 'Tanvi Shah', email: 'tanvi.shah@peoplepay360.com', phone: '+91 98201 11030', dept: 'PROD', pos: 'Technical Product Manager', role: 'EMPLOYEE', wage: 82000, bank: 'HDFC Bank', acc: '50100438291050', ifsc: 'HDFC0000240', pan: 'TANPS1260L' },
  ];

  const createdEmployees = [];

  for (const def of employeesDef) {
    const emp = await prisma.employee.create({
      data: {
        employeeId: def.code,
        name: def.name,
        email: def.email,
        phone: def.phone,
        departmentId: depts[def.dept].id,
        jobPositionId: positions[def.pos].id,
        workingScheduleId: schedule40.id,
        joiningDate: new Date('2025-01-15T00:00:00.000Z'),
        status: 'ACTIVE',
        bankName: def.bank,
        bankAccountNumber: def.acc,
        bankIfscCode: def.ifsc,
        panNumber: def.pan,
      },
    });

    createdEmployees.push({ ...emp, wage: def.wage });

    // Create User account
    const pw = def.password || 'Employee@123';
    const pwHash = await bcrypt.hash(pw, 10);
    await prisma.user.create({
      data: {
        email: def.email,
        password: pwHash,
        name: def.name,
        role: def.role,
        employeeId: emp.id,
      },
    });

    // Create Active Employment Contract
    await prisma.contract.create({
      data: {
        employeeId: emp.id,
        startDate: new Date('2025-01-15T00:00:00.000Z'),
        wage: def.wage,
        salaryStructureId: standardStructure.id,
        status: 'ACTIVE',
        notes: `Permanent ongoing contract for ${def.name}`,
      },
    });

    // Create Time Off Allocations (2026)
    await prisma.timeOffAllocation.createMany({
      data: [
        { employeeId: emp.id, timeOffTypeId: typePaid.id, allocatedDays: 20, remainingDays: 17, takenDays: 3, year: 2026 },
        { employeeId: emp.id, timeOffTypeId: typeSick.id, allocatedDays: 12, remainingDays: 11, takenDays: 1, year: 2026 },
      ],
    });
  }

  // 9. Create 60 Time Off Requests
  console.log('[5/7] Seeding 60 Time Off Requests across teams...');
  const leaveReasons = [
    'Annual family vacation', 'Medical health checkup', 'Personal family function',
    'Dental appointment', 'Child school admission', 'Sister wedding celebration',
    'Attending technical conference', 'Home relocation', 'Fever & recovery', 'Personal emergency'
  ];

  const timeOffRequests = [];
  for (let i = 0; i < createdEmployees.length; i++) {
    const emp = createdEmployees[i];
    // Each employee gets 2 leave requests
    const start1 = new Date(2026, 4, 10 + (i % 15)); // May 2026
    const end1 = new Date(start1);
    end1.setDate(start1.getDate() + 2);

    const start2 = new Date(2026, 7, 5 + (i % 18)); // August 2026
    const end2 = new Date(start2);
    end2.setDate(start2.getDate() + 1);

    timeOffRequests.push({
      employeeId: emp.id,
      timeOffTypeId: i % 3 === 0 ? typeSick.id : typePaid.id,
      startDate: start1,
      endDate: end1,
      durationDays: 3,
      reason: leaveReasons[i % leaveReasons.length],
      status: i % 4 === 0 ? 'PENDING' : 'APPROVED',
    });

    timeOffRequests.push({
      employeeId: emp.id,
      timeOffTypeId: typePaid.id,
      startDate: start2,
      endDate: end2,
      durationDays: 2,
      reason: leaveReasons[(i + 3) % leaveReasons.length],
      status: i % 5 === 0 ? 'REJECTED' : 'APPROVED',
    });
  }

  await prisma.timeOffRequest.createMany({ data: timeOffRequests });

  // 10. Create 400+ Attendance Records across August & September 2026
  console.log('[6/7] Seeding 400+ Attendance Check-In / Check-Out records...');
  const attendanceRecords = [];

  // Working days in August 2026 (Mon-Fri)
  const augustWorkingDays = [
    3, 4, 5, 6, 7,
    10, 11, 12, 13, 14,
    17, 18, 19, 20, 21,
    24, 25, 26, 27, 28,
    31
  ];

  // Working days in September 2026 (Sep 1 to Sep 4)
  const septemberWorkingDays = [1, 2, 3, 4];

  const allWorkDates = [
    ...augustWorkingDays.map(d => ({ year: 2026, month: 7, day: d })), // Month 7 = August
    ...septemberWorkingDays.map(d => ({ year: 2026, month: 8, day: d })) // Month 8 = September
  ];

  for (const emp of createdEmployees) {
    for (let di = 0; di < allWorkDates.length; di++) {
      if ((emp.id + di) % 10 === 0) continue; // 90% attendance rate

      const dt = allWorkDates[di];
      const attDate = new Date(Date.UTC(dt.year, dt.month, dt.day, 0, 0, 0, 0));

      const isLate = (emp.id + di) % 7 === 0;
      const checkInHour = isLate ? 9 : 8;
      const checkInMin = isLate ? 40 : 55;

      const checkIn = new Date(Date.UTC(dt.year, dt.month, dt.day, checkInHour, checkInMin, 0));
      const checkOut = new Date(Date.UTC(dt.year, dt.month, dt.day, 18, 15, 0));
      const workedHours = isLate ? 7.6 : 8.3;

      attendanceRecords.push({
        employeeId: emp.id,
        date: attDate,
        checkIn,
        checkOut,
        breakHours: 1.0,
        workedHours,
        status: isLate ? 'LATE' : 'PRESENT',
      });
    }
  }

  await prisma.attendance.createMany({ data: attendanceRecords });

  // 11. Create 6 Historical Monthly Payruns (March to August 2026) with 180 Payslips & 900 Lines
  console.log('[7/7] Seeding 6 Historical Payruns & 180 Payslips (March - August 2026)...');
  const pastMonths = [
    { name: 'Payrun - March 2026', start: new Date('2026-03-01T00:00:00.000Z'), end: new Date('2026-03-31T00:00:00.000Z'), code: '2026-03' },
    { name: 'Payrun - April 2026', start: new Date('2026-04-01T00:00:00.000Z'), end: new Date('2026-04-30T00:00:00.000Z'), code: '2026-04' },
    { name: 'Payrun - May 2026', start: new Date('2026-05-01T00:00:00.000Z'), end: new Date('2026-05-31T00:00:00.000Z'), code: '2026-05' },
    { name: 'Payrun - June 2026', start: new Date('2026-06-01T00:00:00.000Z'), end: new Date('2026-06-30T00:00:00.000Z'), code: '2026-06' },
    { name: 'Payrun - July 2026', start: new Date('2026-07-01T00:00:00.000Z'), end: new Date('2026-07-31T00:00:00.000Z'), code: '2026-07' },
    { name: 'Payrun - August 2026', start: new Date('2026-08-01T00:00:00.000Z'), end: new Date('2026-08-31T00:00:00.000Z'), code: '2026-08' },
  ];

  let totalPayslipsCount = 0;
  let totalLinesCount = 0;

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

    let payrunGross = 0;
    let payrunDed = 0;
    let payrunNet = 0;

    for (let idx = 0; idx < createdEmployees.length; idx++) {
      const emp = createdEmployees[idx];
      const wage = emp.wage;

      const basic = Math.round(wage * 0.60);
      const hra = Math.round(basic * 0.20);
      const allowance = Math.round(wage * 0.28);
      const gross = basic + hra + allowance;

      const pf = Math.round(basic * 0.12);
      const tax = 200;
      const deductions = pf + tax;
      const net = gross - deductions;

      payrunGross += gross;
      payrunDed += deductions;
      payrunNet += net;

      // Find employee's active contract
      const contract = await prisma.contract.findFirst({
        where: { employeeId: emp.id, status: 'ACTIVE' }
      });

      const slipNumber = `PS-${pm.code}-${String(idx + 1).padStart(3, '0')}`;

      const payslip = await prisma.payslip.create({
        data: {
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
        },
      });

      totalPayslipsCount++;

      // Create 5 itemized payslip lines
      await prisma.payslipLine.createMany({
        data: [
          { payslipId: payslip.id, code: 'BASIC', name: 'Basic Salary', category: 'BASIC', sequence: 1, amount: basic },
          { payslipId: payslip.id, code: 'HRA', name: 'House Rent Allowance', category: 'ALLOWANCE', sequence: 2, amount: hra },
          { payslipId: payslip.id, code: 'ALLOWANCE', name: 'Standard Special Allowance', category: 'ALLOWANCE', sequence: 3, amount: allowance },
          { payslipId: payslip.id, code: 'PF', name: 'Provident Fund (Employee)', category: 'DEDUCTION', sequence: 4, amount: pf },
          { payslipId: payslip.id, code: 'TAX', name: 'Professional Tax', category: 'DEDUCTION', sequence: 5, amount: tax },
        ],
      });

      totalLinesCount += 5;
    }

    // Update payrun totals
    await prisma.payrun.update({
      where: { id: payrun.id },
      data: {
        totalGross: payrunGross,
        totalDeductions: payrunDed,
        totalNet: payrunNet,
      },
    });
  }

  console.log('============================================================');
  console.log('🎉 Enterprise Seeding Finished Successfully!');
  console.log(`✓ Employees Created:        ${createdEmployees.length}`);
  console.log(`✓ Active Contracts:         ${createdEmployees.length}`);
  console.log(`✓ Attendance Records:       ${attendanceRecords.length}`);
  console.log(`✓ Time Off Requests:        ${timeOffRequests.length}`);
  console.log(`✓ Historical Payruns:       ${pastMonths.length}`);
  console.log(`✓ Historical Payslips:      ${totalPayslipsCount}`);
  console.log(`✓ Payslip Line Items:       ${totalLinesCount}`);
  console.log(`✓ Total Enterprise Records: ~${createdEmployees.length * 2 + attendanceRecords.length + timeOffRequests.length + totalPayslipsCount + totalLinesCount + 50}`);
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

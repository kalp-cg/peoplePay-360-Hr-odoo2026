/**
 * ============================================================
 *  PeoplePay360 — Master Seed File  v2.0
 *  File: backend/scripts/seed-all.js
 *
 *  USAGE (run from the backend/ folder):
 *    node scripts/seed-all.js
 *  OR add  "seed": "node scripts/seed-all.js"  to package.json
 *  and run:  npm run seed
 *
 *  What this seeds (all 15 DB tables, in dependency order):
 *    1.  AttendancePolicy     — Standard Enterprise Policy
 *    2.  Department           — 6 departments
 *    3.  JobPosition          — 15 positions
 *    4.  WorkingSchedule      — Standard 40-h workweek + ScheduleDay rows
 *    5.  SalaryStructure      — Regular Enterprise Structure
 *    6.  SalaryRule           — BASIC | HRA | ALLOWANCE | PF | TAX
 *    7.  TimeOffType          — Paid, Sick, Unpaid
 *    8.  Employee             — 260 profiles (100 % unique names)
 *    9.  User                 — 261 user accounts across all 5 roles
 *    10. Contract             — 260 active contracts
 *    11. TimeOffAllocation    — 520 allocations (2 types × 260 emps)
 *    12. TimeOffRequest       — ~130 requests (PENDING / APPROVED / REJECTED)
 *    13. Attendance           — ~2 600 records (PRESENT / LATE / HALF_DAY / OVERTIME)
 *    14. Payrun + Payslip     — 9 payruns covering DRAFT | COMPUTED | WARNING | VALIDATED | PAID
 *    15. AuditLog             — 9 compliance trail entries
 *
 *  DEMO CREDENTIALS
 *    ADMIN            admin@peoplepay360.com        Admin@123
 *    HR Manager       hrmanager@peoplepay360.com    HR@123
 *    Payroll Manager  payrollmgr@peoplepay360.com   PayrollMgr@123
 *    Payroll User     payrolluser@peoplepay360.com  Payroll@123
 *    Employee (demo)  rahul@peoplepay360.com        Rahul@123
 * ============================================================
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
//  Name pools  (70 first × 50 last = 3 500 unique combinations)
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Rahul','Priya','Neha','Amit','Vikram','Ananya','Rajesh','Sneha','Rohan','Pooja',
  'Karthik','Divya','Manoj','Meera','Suresh','Kavita','Deepak','Sunita','Alok','Swati',
  'Manish','Ritu','Sandeep','Shalini','Harish','Preeti','Nitin','Vandana','Gaurav','Tanvi',
  'Arjun','Ishita','Aditya','Shreya','Varun','Nidhi','Siddharth','Rashi','Akhil','Radhika',
  'Mayank','Bhavna','Kunal','Rashmi','Tarun','Natasha','Abhinav','Priyanka','Ankit','Payal',
  'Sachin','Simran','Kishore','Anjali','Vivek','Shruti','Pranav','Kritika','Abhishek','Monika',
  'Girish','Pallavi','Yash','Lavanya','Bhavesh','Smriti','Devendra','Komal','Jayant','Rupal',
];

const LAST_NAMES = [
  'Sharma','Desai','Patel','Verma','Singh','Roy','Iyer','Kulkarni','Mehta','Nair',
  'Subramanian','Joshi','Kumar','Pillai','Reddy','Rao','Gupta','Sen','Mishra','Bhatt',
  'Agarwal','Jain','Choudhury','Tiwari','Nambiar','Kapoor','Saxena','Malhotra','Shah','Banerjee',
  'Chatterjee','Mukherjee','Trivedi','Bhatia','Dutta','Pandey','Yadav','Chauhan','Rathore','Menon',
  'Bhandari','Sarin','Narang','Kohli','Chawla','Sood','Kashyap','Chhabra','Bhalla','Vohra',
];

const BANKS = [
  { name: 'HDFC Bank',           ifsc: 'HDFC0000240' },
  { name: 'ICICI Bank',          ifsc: 'ICIC0000024' },
  { name: 'State Bank of India', ifsc: 'SBIN0001040' },
  { name: 'Axis Bank',           ifsc: 'UTIB0000128' },
  { name: 'Kotak Mahindra Bank', ifsc: 'KKBK0000958' },
];

// ---------------------------------------------------------------------------
//  Helper – generate a unique full name
// ---------------------------------------------------------------------------
function pickUniqueName(usedNames, counter) {
  let firstName, lastName, fullName, tries = 0;
  do {
    const fIdx = counter % FIRST_NAMES.length;
    const lIdx = (Math.floor(counter / FIRST_NAMES.length) + (counter % 7)) % LAST_NAMES.length;
    firstName = FIRST_NAMES[fIdx];
    lastName  = LAST_NAMES[lIdx];
    fullName  = `${firstName} ${lastName}`;
    counter++;
    if (++tries > 1000) throw new Error('Name pool exhausted — expand FIRST_NAMES or LAST_NAMES');
  } while (usedNames.has(fullName));
  usedNames.add(fullName);
  return { firstName, lastName, fullName, counter };
}

// ---------------------------------------------------------------------------
//  MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n\u250C' + '\u2550'.repeat(62) + '\u2510');
  console.log('\u2551  PeoplePay360 \u2014 Master Seed  v2.0' + ' '.repeat(27) + '\u2551');
  console.log('\u2551  260 Employees | 9 Payruns | All 5 Roles' + ' '.repeat(21) + '\u2551');
  console.log('\u2514' + '\u2550'.repeat(62) + '\u2518\n');

  // ── 1. Wipe in reverse-dependency order ───────────────────────────────────
  console.log('\u25B6 Step 1/9  Cleaning database...');
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
  await prisma.attendancePolicy.deleteMany({});
  console.log('  \u2713 Database wiped');

  // ── 2. Hash passwords once ────────────────────────────────────────────────
  console.log('\u25B6 Step 2/9  Hashing passwords...');
  const [adminHash, hrHash, payrollMgrHash, payrollUserHash, employeeHash] = await Promise.all([
    bcrypt.hash('Admin@123',      10),
    bcrypt.hash('HR@123',         10),
    bcrypt.hash('PayrollMgr@123', 10),
    bcrypt.hash('Payroll@123',    10),
    bcrypt.hash('Rahul@123',      10),
  ]);
  console.log('  \u2713 Passwords hashed');

  // ── 3. Master data ────────────────────────────────────────────────────────
  console.log('\u25B6 Step 3/9  Creating master data...');

  // Attendance Policy
  await prisma.attendancePolicy.create({
    data: {
      name: 'Standard Enterprise Policy',
      fullDayHours: 7.0, halfDayHours: 4.0,
      gracePeriodMins: 15, overtimeThreshold: 9.0,
      breakDeductionHours: 1.0, maxShiftHoursCap: 14.0,
      isActive: true,
    },
  });

  // Departments
  const deptDefs = [
    { name: 'Engineering',        code: 'ENG',   description: 'Product and Platform Engineering' },
    { name: 'Sales & Marketing',  code: 'SALES', description: 'Revenue, Growth and Client Success' },
    { name: 'Human Resources',    code: 'HR',    description: 'Talent Acquisition, People Operations & Culture' },
    { name: 'Finance & Accounts', code: 'FIN',   description: 'Financial Planning, Auditing & Payroll' },
    { name: 'Product Management', code: 'PROD',  description: 'Product Roadmap, UX and Strategy' },
    { name: 'Operations & IT',    code: 'OPS',   description: 'Cloud Infrastructure & Internal Support' },
  ];
  const depts = {};
  for (const d of deptDefs) {
    depts[d.code] = await prisma.department.create({ data: d });
  }

  // Job Positions
  const posDefs = [
    { title: 'Lead Architect',               deptCode: 'ENG'   },
    { title: 'Senior Software Engineer',     deptCode: 'ENG'   },
    { title: 'Full Stack Engineer',          deptCode: 'ENG'   },
    { title: 'QA Automation Lead',           deptCode: 'ENG'   },
    { title: 'VP of Sales',                  deptCode: 'SALES' },
    { title: 'Senior Account Executive',     deptCode: 'SALES' },
    { title: 'Digital Marketing Specialist', deptCode: 'SALES' },
    { title: 'HR Director',                  deptCode: 'HR'    },
    { title: 'HR Manager',                   deptCode: 'HR'    },
    { title: 'Talent Acquisition Lead',      deptCode: 'HR'    },
    { title: 'Payroll Manager',              deptCode: 'FIN'   },
    { title: 'Financial Analyst',            deptCode: 'FIN'   },
    { title: 'Director of Product',          deptCode: 'PROD'  },
    { title: 'Technical Product Manager',    deptCode: 'PROD'  },
    { title: 'DevOps & Cloud Engineer',      deptCode: 'OPS'   },
  ];
  const positions = [];
  for (const p of posDefs) {
    const pos = await prisma.jobPosition.create({
      data: { title: p.title, departmentId: depts[p.deptCode].id },
    });
    positions.push({ ...pos, deptCode: p.deptCode });
  }
  const posBy = (title) => positions.find(p => p.title === title);

  // Working Schedule
  const schedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard 40-Hour Workweek', scheduleType: 'STANDARD_40H', weeklyHours: 40.0,
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
  const salaryStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Enterprise Structure',
      description: 'BASIC 60% | HRA 20% of BASIC | ALLOWANCE 28% of WAGE | PF 12% of BASIC | Prof Tax 200',
      active: true,
      salaryRules: {
        create: [
          { name: 'Basic Salary',              code: 'BASIC',     category: 'BASIC',     sequence: 1, calculationType: 'PERCENTAGE', valueExpression: '0.60 * WAGE',  active: true },
          { name: 'House Rent Allowance',      code: 'HRA',       category: 'ALLOWANCE', sequence: 2, calculationType: 'PERCENTAGE', valueExpression: '0.20 * BASIC', active: true },
          { name: 'Standard Special Allowance',code: 'ALLOWANCE', category: 'ALLOWANCE', sequence: 3, calculationType: 'PERCENTAGE', valueExpression: '0.28 * WAGE',  active: true },
          { name: 'Gross Salary',              code: 'GROSS',     category: 'GROSS',     sequence: 4, calculationType: 'FORMULA',    valueExpression: 'BASIC + HRA + ALLOWANCE', active: true },
          { name: 'Provident Fund (Employee)', code: 'PF',        category: 'DEDUCTION', sequence: 5, calculationType: 'PERCENTAGE', valueExpression: '0.12 * BASIC', active: true },
          { name: 'Professional Tax',          code: 'TAX',       category: 'DEDUCTION', sequence: 6, calculationType: 'FIXED',      valueExpression: '200',          active: true },
          { name: 'Net Salary',                code: 'NET',       category: 'NET',       sequence: 7, calculationType: 'FORMULA',    valueExpression: 'GROSS - PF - TAX', active: true },
        ],
      },
    },
  });

  // Time Off Types
  const typePaid   = await prisma.timeOffType.create({ data: { name: 'Paid Time Off', unit: 'DAYS', allocationRequired: true,  approvalRequired: true,  isPaid: true  } });
  const typeSick   = await prisma.timeOffType.create({ data: { name: 'Sick Leave',    unit: 'DAYS', allocationRequired: true,  approvalRequired: true,  isPaid: true  } });
  await prisma.timeOffType.create(                    { data: { name: 'Unpaid Leave',  unit: 'DAYS', allocationRequired: false, approvalRequired: true,  isPaid: false } });

  console.log('  \u2713 AttendancePolicy | Departments | Positions | Schedule | SalaryStructure | TimeOffTypes');

  // ── 4. Employees, Users, Contracts ───────────────────────────────────────
  console.log('\u25B6 Step 4/9  Creating 261 Users, 260 Employees, 260 Contracts...');

  const usedFullNames = new Set(['System Administrator','Rahul Sharma','Priya Desai','Neha Patel','Amit Verma']);
  let nameCounter = 5;

  const createdUsers     = [];
  const createdEmployees = [];
  const createdContracts = [];

  // Helper to create one employee+user+contract block
  async function createAccount({ empCode, name, email, role, pwHash, wage, deptCode, posTitle, joining, bankIdx, accNum, panNum }) {
    const bank = BANKS[bankIdx % BANKS.length];
    const emp = await prisma.employee.create({
      data: {
        employeeId:       empCode,
        name,
        email,
        phone:            `+91 98${String(20000000 + parseInt(empCode.replace('EMP',''))).slice(0, 8)}`,
        departmentId:     depts[deptCode].id,
        jobPositionId:    posBy(posTitle)?.id ?? positions[0].id,
        workingScheduleId: schedule.id,
        joiningDate:      new Date(`${joining}T00:00:00.000Z`),
        status:           'ACTIVE',
        bankName:         bank.name,
        bankAccountNumber: accNum,
        bankIfscCode:     bank.ifsc,
        panNumber:        panNum,
      },
    });
    const user = await prisma.user.create({
      data: { email, password: pwHash, name, role, employeeId: emp.id },
    });
    const contract = await prisma.contract.create({
      data: {
        employeeId:        emp.id,
        startDate:         new Date(`${joining}T00:00:00.000Z`),
        wage,
        salaryStructureId: salaryStructure.id,
        status:            'ACTIVE',
        notes:             `Employment contract for ${name} (${role})`,
      },
    });
    createdUsers.push(user);
    createdEmployees.push({ ...emp, wage, role });
    createdContracts.push(contract);
    return { emp, user, contract };
  }

  // --- Admin (EMP000) ---
  await createAccount({
    empCode: 'EMP000', name: 'System Administrator', email: 'admin@peoplepay360.com',
    role: 'ADMIN', pwHash: adminHash, wage: 120000,
    deptCode: 'OPS', posTitle: 'DevOps & Cloud Engineer',
    joining: '2024-01-01', bankIdx: 0,
    accNum: '999900001111', panNum: 'ADMPA0000Z',
  });

  // --- Core Demo Accounts (EMP001–EMP004) ---
  const coreAccounts = [
    { empCode:'EMP001', name:'Rahul Sharma',  email:'rahul@peoplepay360.com',       role:'EMPLOYEE',           pwHash:employeeHash,    wage:85000, deptCode:'ENG',  posTitle:'Lead Architect',       joining:'2025-01-15', accNum:'10000000001', panNum:'DEMOQ0001Z' },
    { empCode:'EMP002', name:'Priya Desai',   email:'hrmanager@peoplepay360.com',   role:'HR_MANAGER',         pwHash:hrHash,          wage:78000, deptCode:'HR',   posTitle:'HR Manager',           joining:'2025-01-15', accNum:'10000000002', panNum:'DEMOQ0002Z' },
    { empCode:'EMP003', name:'Neha Patel',    email:'payrollmgr@peoplepay360.com',  role:'HR_PAYROLL_MANAGER', pwHash:payrollMgrHash,  wage:92000, deptCode:'FIN',  posTitle:'Payroll Manager',      joining:'2025-01-15', accNum:'10000000003', panNum:'DEMOQ0003Z' },
    { empCode:'EMP004', name:'Amit Verma',    email:'payrolluser@peoplepay360.com', role:'HR_PAYROLL_USER',    pwHash:payrollUserHash, wage:58000, deptCode:'FIN',  posTitle:'Financial Analyst',    joining:'2025-01-15', accNum:'10000000004', panNum:'DEMOQ0004Z' },
  ];
  for (let i = 0; i < coreAccounts.length; i++) {
    await createAccount({ ...coreAccounts[i], bankIdx: i });
  }

  // --- Bulk employees (EMP005–EMP259) ---
  const bulkRoles = [
    ...Array(9).fill('ADMIN'),
    ...Array(19).fill('HR_MANAGER'),
    ...Array(19).fill('HR_PAYROLL_MANAGER'),
    ...Array(29).fill('HR_PAYROLL_USER'),
    ...Array(179).fill('EMPLOYEE'),
  ]; // 255 entries

  for (let i = 0; i < bulkRoles.length; i++) {
    const seqNum = i + 5;
    const role   = bulkRoles[i];
    const empCode = `EMP${String(seqNum).padStart(3, '0')}`;

    const result  = pickUniqueName(usedFullNames, nameCounter);
    nameCounter   = result.counter;
    const { fullName } = result;

    const slug  = fullName.toLowerCase().replace(/\s+/g, '.') + (seqNum > 150 ? seqNum : '');
    const email = `${slug}@peoplepay360.com`;

    let pwHash, wage, deptCode, posTitle;
    if (role === 'ADMIN') {
      pwHash = adminHash;       deptCode = 'OPS';  posTitle = 'DevOps & Cloud Engineer';    wage = 90000 + ((seqNum * 1200) % 30000);
    } else if (role === 'HR_MANAGER') {
      pwHash = hrHash;          deptCode = 'HR';   posTitle = 'HR Manager';                 wage = 68000 + ((seqNum * 850)  % 24000);
    } else if (role === 'HR_PAYROLL_MANAGER') {
      pwHash = payrollMgrHash;  deptCode = 'FIN';  posTitle = 'Payroll Manager';            wage = 85000 + ((seqNum * 900)  % 25000);
    } else if (role === 'HR_PAYROLL_USER') {
      pwHash = payrollUserHash; deptCode = 'FIN';  posTitle = 'Financial Analyst';          wage = 52000 + ((seqNum * 650)  % 22000);
    } else {
      pwHash = employeeHash;
      const posObj = positions[seqNum % positions.length];
      deptCode = posObj.deptCode;
      posTitle = posObj.title;
      wage = 42000 + ((seqNum * 750) % 65000);
    }

    const bank   = BANKS[seqNum % BANKS.length];
    const accNum = `${100000000000 + (seqNum * 382910)}`;
    const panNum = `ABC${String.fromCharCode(65 + (seqNum % 26))}P${1000 + seqNum}${String.fromCharCode(65 + ((seqNum + 3) % 26))}`;

    await createAccount({ empCode, name: fullName, email, role, pwHash, wage, deptCode, posTitle, joining: '2025-01-15', bankIdx: seqNum, accNum, panNum });
  }

  console.log(`  \u2713 ${createdUsers.length} Users | ${createdEmployees.length} Employees | ${createdContracts.length} Contracts`);

  // ── 5. Manager Hierarchy ──────────────────────────────────────────────────
  console.log('\u25B6 Step 5/9  Setting manager hierarchy...');
  const hrManager  = createdEmployees.find(e => e.email === 'hrmanager@peoplepay360.com');
  const subordinates = createdEmployees.filter(e => e.role === 'EMPLOYEE').slice(0, 13);
  for (const sub of subordinates) {
    await prisma.employee.update({ where: { id: sub.id }, data: { managerId: hrManager.id } });
  }
  console.log(`  \u2713 ${subordinates.length} employees linked to Priya Desai (HR Manager)`);

  // ── 6. Time Off Allocations ───────────────────────────────────────────────
  console.log('\u25B6 Step 6/9  Time Off Allocations & Requests...');
  const allocations = [];
  for (const emp of createdEmployees) {
    allocations.push(
      { employeeId: emp.id, timeOffTypeId: typePaid.id, allocatedDays: 20, takenDays: 3, remainingDays: 17, year: 2026 },
      { employeeId: emp.id, timeOffTypeId: typeSick.id, allocatedDays: 12, takenDays: 1, remainingDays: 11, year: 2026 },
    );
  }
  for (let b = 0; b < allocations.length; b += 500) {
    await prisma.timeOffAllocation.createMany({ data: allocations.slice(b, b + 500) });
  }

  const leaveReasons = [
    'Annual family vacation','Medical health checkup','Personal family function',
    'Dental surgery','Child school admission','Sister wedding celebration',
    'Attending tech conference','Home relocation','Fever & recovery','Personal emergency',
  ];
  const leaveRequests = [];
  for (let i = 0; i < createdEmployees.length; i += 2) {
    const emp   = createdEmployees[i];
    const start = new Date(2026, 4 + (i % 4), 10 + (i % 15));
    const end   = new Date(start); end.setDate(start.getDate() + 2);
    leaveRequests.push({
      employeeId:    emp.id,
      timeOffTypeId: i % 3 === 0 ? typeSick.id : typePaid.id,
      startDate:     start, endDate: end, durationDays: 2,
      reason:        leaveReasons[i % leaveReasons.length],
      status:        i % 5 === 0 ? 'PENDING' : i % 7 === 0 ? 'REJECTED' : 'APPROVED',
    });
  }
  await prisma.timeOffRequest.createMany({ data: leaveRequests });
  console.log(`  \u2713 ${allocations.length} Allocations | ${leaveRequests.length} Time Off Requests`);

  // ── 7. Attendance Records ─────────────────────────────────────────────────
  console.log('\u25B6 Step 7/9  Seeding Attendance Records...');
  const workDates = [
    ...[3,4,5,6,7,10,11,12,13,14,17,18,19,20,21,24,25,26,27,28,31].map(d => ({ y:2026, m:7, d })),
    ...[1,2,3,4,5].map(d => ({ y:2026, m:8, d })),
  ];
  const attendanceRecords = [];
  for (const emp of createdEmployees) {
    for (let di = 0; di < 10; di++) {
      const dt = workDates[(emp.id + di) % workDates.length];
      const isHalfDay  = (emp.id + di) % 15 === 0;
      const isOvertime = !isHalfDay && (emp.id + di) % 12 === 0;
      const isLate     = !isHalfDay && !isOvertime && (emp.id + di) % 8 === 0;
      let ciH=8,ciM=55,coH=18,coM=15,bH=1.0,wH=8.3,status='PRESENT';
      if (isHalfDay)  { ciH=9;ciM=0;coH=13;coM=30;bH=0.0;wH=4.5;  status='HALF_DAY';  }
      else if (isOvertime) { ciH=8;ciM=30;coH=19;coM=45;bH=1.0;wH=10.25;status='OVERTIME'; }
      else if (isLate)     { ciH=9;ciM=40;coH=18;coM=15;bH=1.0;wH=7.6;  status='LATE';     }
      attendanceRecords.push({
        employeeId:  emp.id,
        date:        new Date(Date.UTC(dt.y, dt.m, dt.d)),
        checkIn:     new Date(Date.UTC(dt.y, dt.m, dt.d, ciH, ciM, 0)),
        checkOut:    new Date(Date.UTC(dt.y, dt.m, dt.d, coH, coM, 0)),
        breakHours:  bH, workedHours: wH, status,
      });
    }
  }
  for (let b = 0; b < attendanceRecords.length; b += 500) {
    await prisma.attendance.createMany({ data: attendanceRecords.slice(b, b + 500) });
  }
  console.log(`  \u2713 ${attendanceRecords.length} Attendance records`);

  // ── 8. Payruns, Payslips, Payslip Lines ──────────────────────────────────
  console.log('\u25B6 Step 8/9  Generating Payruns & Payslips...');

  const payrunDefs = [
    { name:'Payrun - September 2026 (General Operations)',           start:'2026-09-01',end:'2026-09-30',code:'2026-09',      status:'COMPUTED',  slipStatus:'COMPUTED',  mult:1.02, wd:22, emp:createdEmployees,          paidAt:null },
    { name:'Payrun - September 2026 (Executive & Leadership)',       start:'2026-09-01',end:'2026-09-30',code:'2026-09-EXEC', status:'DRAFT',     slipStatus:null,        mult:1.0,  wd:22, emp:[],                         paidAt:null },
    { name:'Payrun - August 2026 (General Payroll)',                 start:'2026-08-01',end:'2026-08-31',code:'2026-08',      status:'PAID',      slipStatus:'PAID',      mult:1.0,  wd:22, emp:createdEmployees,          paidAt:new Date('2026-08-31T17:00:00.000Z') },
    { name:'Payrun - August 2026 (Quarterly Performance Incentive)', start:'2026-08-01',end:'2026-08-31',code:'2026-08-BONUS',status:'VALIDATED', slipStatus:'VALIDATED', mult:0.40, wd:22, emp:createdEmployees.slice(0,35),  paidAt:null },
    {
      name:'Payrun - August 2026 (Contractor & External Advisory)',  start:'2026-08-01',end:'2026-08-31',code:'2026-08-CONT', status:'WARNING',   slipStatus:'COMPUTED',  mult:0.85, wd:19, emp:createdEmployees.slice(35,55), paidAt:null,
      warnings:[
        { type:'TAX_DECLARATION_PENDING', severity:'WARNING',  message:'TDS certificate pending verification for 3 consultant accounts.' },
        { type:'CONTRACT_EXPIRY_WARNING', severity:'CRITICAL', message:'Advisory contract agreement expires at end of current period.' },
      ],
    },
    { name:'Payrun - July 2026',  start:'2026-07-01',end:'2026-07-31',code:'2026-07',status:'PAID',slipStatus:'PAID',mult:1.06,wd:23,emp:createdEmployees,paidAt:new Date('2026-07-31T17:00:00.000Z') },
    { name:'Payrun - June 2026',  start:'2026-06-01',end:'2026-06-30',code:'2026-06',status:'PAID',slipStatus:'PAID',mult:0.96,wd:21,emp:createdEmployees,paidAt:new Date('2026-06-30T17:00:00.000Z') },
    { name:'Payrun - May 2026',   start:'2026-05-01',end:'2026-05-31',code:'2026-05',status:'PAID',slipStatus:'PAID',mult:0.93,wd:21,emp:createdEmployees,paidAt:new Date('2026-05-31T17:00:00.000Z') },
    { name:'Payrun - April 2026', start:'2026-04-01',end:'2026-04-30',code:'2026-04',status:'PAID',slipStatus:'PAID',mult:0.89,wd:20,emp:createdEmployees,paidAt:new Date('2026-04-30T17:00:00.000Z') },
  ];

  let totalPayslips = 0;

  for (const def of payrunDefs) {
    const payrun = await prisma.payrun.create({
      data: {
        name:              def.name,
        salaryStructureId: salaryStructure.id,
        periodStart:       new Date(`${def.start}T00:00:00.000Z`),
        periodEnd:         new Date(`${def.end}T00:00:00.000Z`),
        status:            def.status,
        paidAt:            def.paidAt ?? null,
      },
    });

    if (def.warnings?.length) {
      for (const w of def.warnings) {
        await prisma.payrollWarning.create({
          data: { payrunId: payrun.id, type: w.type, severity: w.severity, message: w.message, isResolved: false },
        });
      }
    }

    if (!def.emp?.length) continue; // DRAFT — no payslips

    let grossSum = 0, dedSum = 0, netSum = 0;
    const linesData = [];

    for (let idx = 0; idx < def.emp.length; idx++) {
      const emp      = def.emp[idx];
      // Never borrow another employee's contract: a payslip must be computed from
      // the contract that belongs to its own employee, or not generated at all.
      const contract = createdContracts.find(c => c.employeeId === emp.id);
      if (!contract) {
        console.warn(`  ! Skipping payslip for ${emp.employeeId ?? emp.id} - no contract on record`);
        continue;
      }

      const effectiveWage = Math.round(emp.wage * def.mult);
      const basic    = Math.round(effectiveWage * 0.60);
      const hra      = Math.round(basic * 0.20);
      const allowance= Math.round(effectiveWage * 0.28);
      const gross    = basic + hra + allowance;
      const pf       = Math.round(basic * 0.12);
      const tax      = 200;
      const deductions = pf + tax;
      const net      = gross - deductions;

      grossSum += gross; dedSum += deductions; netSum += net;

      const slip = await prisma.payslip.create({
        data: {
          payslipNumber:   `PS-${def.code}-${String(idx + 1).padStart(3, '0')}`,
          payrunId:        payrun.id,
          employeeId:      emp.id,
          contractId:      contract.id,
          workingDays:     def.wd,
          presentDays:     def.wd,
          grossSalary:     gross,
          totalDeductions: deductions,
          netSalary:       net,
          status:          def.slipStatus ?? 'DRAFT',
        },
      });
      totalPayslips++;

      linesData.push(
        { payslipId: slip.id, code:'BASIC',     name:'Basic Salary',              category:'BASIC',     sequence:1, amount:basic     },
        { payslipId: slip.id, code:'HRA',       name:'House Rent Allowance',      category:'ALLOWANCE', sequence:2, amount:hra       },
        { payslipId: slip.id, code:'ALLOWANCE', name:'Standard Special Allowance',category:'ALLOWANCE', sequence:3, amount:allowance },
        { payslipId: slip.id, code:'GROSS',     name:'Gross Salary',              category:'GROSS',     sequence:4, amount:gross     },
        { payslipId: slip.id, code:'PF',        name:'Provident Fund (Employee)', category:'DEDUCTION', sequence:5, amount:pf        },
        { payslipId: slip.id, code:'TAX',       name:'Professional Tax',          category:'DEDUCTION', sequence:6, amount:tax       },
        { payslipId: slip.id, code:'NET',       name:'Net Salary',                category:'NET',       sequence:7, amount:net       },
      );
    }

    for (let b = 0; b < linesData.length; b += 500) {
      await prisma.payslipLine.createMany({ data: linesData.slice(b, b + 500) });
    }
    await prisma.payrun.update({ where: { id: payrun.id }, data: { totalGross: grossSum, totalDeductions: dedSum, totalNet: netSum } });
  }

  console.log(`  \u2713 ${payrunDefs.length} Payruns | ${totalPayslips} Payslips | ${totalPayslips * 5} Payslip Lines`);

  // ── 9. Audit Logs ─────────────────────────────────────────────────────────
  console.log('\u25B6 Step 9/9  Seeding Audit Logs...');
  const adminUser      = createdUsers.find(u => u.email === 'admin@peoplepay360.com');
  const payrollMgrUser = createdUsers.find(u => u.email === 'payrollmgr@peoplepay360.com');
  const hrMgrUser      = createdUsers.find(u => u.email === 'hrmanager@peoplepay360.com');

  await prisma.auditLog.createMany({ data: [
    { userId:adminUser.id,      action:'ATTENDANCE_POLICY_UPDATED',entityName:'AttendancePolicy',entityId:'1',
      previousValue:JSON.stringify({fullDayHours:8.0,halfDayHours:4.5,gracePeriodMins:10}),
      newValue:JSON.stringify({fullDayHours:7.0,halfDayHours:4.0,gracePeriodMins:15,maxShiftHoursCap:14.0}),
      timestamp:new Date('2026-09-01T09:15:00.000Z') },
    { userId:payrollMgrUser.id, action:'PAYRUN_COMPUTED',entityName:'Payrun',entityId:'1',
      previousValue:JSON.stringify({status:'DRAFT',computedCount:0}),
      newValue:JSON.stringify({status:'COMPUTED',computedCount:260,grossTotal:18742000}),
      timestamp:new Date('2026-08-30T10:00:00.000Z') },
    { userId:payrollMgrUser.id, action:'PAYRUN_VALIDATED',entityName:'Payrun',entityId:'1',
      previousValue:JSON.stringify({status:'COMPUTED'}),
      newValue:JSON.stringify({status:'VALIDATED',approvedBy:'Neha Patel',totalNet:17062000}),
      timestamp:new Date('2026-08-31T14:30:00.000Z') },
    { userId:adminUser.id,      action:'PAYRUN_PAID',entityName:'Payrun',entityId:'1',
      previousValue:JSON.stringify({status:'VALIDATED'}),
      newValue:JSON.stringify({status:'PAID',paymentRef:'NEFT-BATCH-20260831-01',totalDisbursed:17062000}),
      timestamp:new Date('2026-08-31T17:00:00.000Z') },
    { userId:hrMgrUser.id,      action:'TIME_OFF_APPROVED',entityName:'TimeOffRequest',entityId:'1',
      previousValue:JSON.stringify({status:'PENDING'}),
      newValue:JSON.stringify({status:'APPROVED',employee:'Rahul Sharma',leaveType:'Sick Leave',durationDays:2}),
      timestamp:new Date('2026-08-28T11:20:00.000Z') },
    { userId:hrMgrUser.id,      action:'TIME_OFF_REJECTED',entityName:'TimeOffRequest',entityId:'2',
      previousValue:JSON.stringify({status:'PENDING'}),
      newValue:JSON.stringify({status:'REJECTED',reason:'Insufficient remaining allocation balance'}),
      timestamp:new Date('2026-08-27T16:45:00.000Z') },
    { userId:adminUser.id,      action:'ATTENDANCE_CORRECTED',entityName:'Attendance',entityId:'5',
      previousValue:JSON.stringify({checkIn:'09:45:00',checkOut:null,status:'INCOMPLETE'}),
      newValue:JSON.stringify({checkIn:'09:00:00',checkOut:'18:15:00',workedHours:8.3,status:'PRESENT',reason:'Biometric scanner malfunction'}),
      timestamp:new Date('2026-08-25T19:10:00.000Z') },
    { userId:hrMgrUser.id,      action:'EMPLOYEE_CREATED',entityName:'Employee',entityId:'1',
      previousValue:null,
      newValue:JSON.stringify({employeeId:'EMP001',name:'Rahul Sharma',position:'Lead Architect',department:'Engineering'}),
      timestamp:new Date('2026-01-15T09:00:00.000Z') },
    { userId:hrMgrUser.id,      action:'CONTRACT_CREATED',entityName:'Contract',entityId:'1',
      previousValue:null,
      newValue:JSON.stringify({employeeId:'EMP001',wage:85000,structure:'Regular Enterprise Structure',status:'ACTIVE'}),
      timestamp:new Date('2026-01-15T09:30:00.000Z') },
  ]});
  console.log('  \u2713 9 Audit log entries');

  // ── Summary ───────────────────────────────────────────────────────────────
  const rc = (role) => createdUsers.filter(u => u.role === role).length;
  console.log('\n\u250C' + '\u2550'.repeat(62) + '\u2510');
  console.log('\u2551  \U0001F389  Seeding Complete!' + ' '.repeat(44) + '\u2551');
  console.log('\u255F' + '\u2500'.repeat(62) + '\u2562');
  console.log(`\u2551  Users:        ${createdUsers.length} (ADM:${rc('ADMIN')} HRM:${rc('HR_MANAGER')} PAYM:${rc('HR_PAYROLL_MANAGER')} PAYU:${rc('HR_PAYROLL_USER')} EMP:${rc('EMPLOYEE')})   \u2551`);
  console.log(`\u2551  Employees:    ${String(createdEmployees.length).padEnd(4)} with unique names, bank & PAN details      \u2551`);
  console.log(`\u2551  Contracts:    ${String(createdContracts.length).padEnd(50)}\u2551`);
  console.log(`\u2551  Attendance:   ${String(attendanceRecords.length).padEnd(50)}\u2551`);
  console.log(`\u2551  Leave Req:    ${String(leaveRequests.length).padEnd(50)}\u2551`);
  console.log(`\u2551  Payruns:      ${String(payrunDefs.length).padEnd(4)} (DRAFT|COMPUTED|WARNING|VALIDATED|PAID)       \u2551`);
  console.log(`\u2551  Payslips:     ${String(totalPayslips).padEnd(50)}\u2551`);
  console.log('\u255F' + '\u2500'.repeat(62) + '\u2562');
  console.log('\u2551  LOGIN CREDENTIALS                                              \u2551');
  console.log('\u2551  admin@peoplepay360.com          Admin@123                     \u2551');
  console.log('\u2551  hrmanager@peoplepay360.com      HR@123                        \u2551');
  console.log('\u2551  payrollmgr@peoplepay360.com     PayrollMgr@123                \u2551');
  console.log('\u2551  payrolluser@peoplepay360.com    Payroll@123                   \u2551');
  console.log('\u2551  rahul@peoplepay360.com          Rahul@123                     \u2551');
  console.log('\u2514' + '\u2550'.repeat(62) + '\u2518\n');
}

main()
  .catch((err) => {
    console.error('\n\u274C  Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * ============================================================
 *  PeoplePay360 — Master Enterprise Seed File (400 Users)
 *  File: backend/scripts/seed-all.js
 *
 *  USAGE (from backend/):
 *    node scripts/seed-all.js
 *  OR:
 *    npm run seed
 *
 *  Strict Business Rules:
 *    1. Strictly ONLY 1 ADMIN account in the entire system:
 *       admin@peoplepay360.com / Admin@123 / EMP000
 *    2. Exactly 400 total users:
 *       - 1 ADMIN
 *       - 25 HR_MANAGER
 *       - 20 HR_PAYROLL_MANAGER
 *       - 34 HR_PAYROLL_USER
 *       - 320 EMPLOYEE
 *    3. All 400 users have corresponding Employee profiles (EMP000–EMP399).
 *    4. 100% unique names across all 400 profiles.
 *    5. 400 Active Contracts with period validity and no overlaps.
 *    6. Reconciled TimeOffAllocations (remainingDays = allocatedDays - takenDays).
 *    7. ~160 TimeOffRequests with realistic reasons and statuses.
 *    8. ~3,600 Attendance records (August–September 2026) with valid check-ins/outs.
 *    9. Payrun batches across ALL 5 statuses (DRAFT, COMPUTED, WARNING, VALIDATED, PAID).
 *    10. Itemized Payslips with 7 standard rule lines and verified math.
 *    11. Audit logs for enterprise compliance.
 * ============================================================
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
//  Name pools (110 first × 70 last = 7,700 unique combinations)
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Rahul', 'Priya', 'Neha', 'Amit', 'Vikram', 'Ananya', 'Rajesh', 'Sneha', 'Rohan', 'Pooja',
  'Karthik', 'Divya', 'Manoj', 'Meera', 'Suresh', 'Kavita', 'Deepak', 'Sunita', 'Alok', 'Swati',
  'Manish', 'Ritu', 'Sandeep', 'Shalini', 'Harish', 'Preeti', 'Nitin', 'Vandana', 'Gaurav', 'Tanvi',
  'Arjun', 'Ishita', 'Aditya', 'Shreya', 'Varun', 'Nidhi', 'Siddharth', 'Rashi', 'Akhil', 'Radhika',
  'Mayank', 'Bhavna', 'Kunal', 'Rashmi', 'Tarun', 'Natasha', 'Abhinav', 'Priyanka', 'Ankit', 'Payal',
  'Sachin', 'Simran', 'Kishore', 'Anjali', 'Vivek', 'Shruti', 'Pranav', 'Kritika', 'Abhishek', 'Monika',
  'Girish', 'Pallavi', 'Yash', 'Lavanya', 'Bhavesh', 'Smriti', 'Devendra', 'Komal', 'Jayant', 'Rupal',
  'Ashok', 'Kavya', 'Santosh', 'Diya', 'Ramesh', 'Asha', 'Hemant', 'Geeta', 'Mukesh', 'Isha',
  'Chetan', 'Parul', 'Lalit', 'Sarita', 'Ajay', 'Rekha', 'Mahesh', 'Sangeeta', 'Prakash', 'Usha',
  'Sunil', 'Shikha', 'Anand', 'Ankita', 'Naveen', 'Rani', 'Gopal', 'Madhu', 'Dharmendra', 'Seema',
  'Taruna', 'Brijesh', 'Garima', 'Omkar', 'Aakanksha', 'Devansh', 'Namrata', 'Tejas', 'Rhea', 'Aarav'
];

const LAST_NAMES = [
  'Sharma', 'Desai', 'Patel', 'Verma', 'Singh', 'Roy', 'Iyer', 'Kulkarni', 'Mehta', 'Nair',
  'Subramanian', 'Joshi', 'Kumar', 'Pillai', 'Reddy', 'Rao', 'Gupta', 'Sen', 'Mishra', 'Bhatt',
  'Agarwal', 'Jain', 'Choudhury', 'Tiwari', 'Nambiar', 'Kapoor', 'Saxena', 'Malhotra', 'Shah', 'Banerjee',
  'Chatterjee', 'Mukherjee', 'Trivedi', 'Bhatia', 'Dutta', 'Pandey', 'Yadav', 'Chauhan', 'Rathore', 'Menon',
  'Bhandari', 'Sarin', 'Narang', 'Kohli', 'Chawla', 'Sood', 'Kashyap', 'Chhabra', 'Bhalla', 'Vohra',
  'Somani', 'Mittal', 'Goel', 'Singhal', 'Kansal', 'Garg', 'Bansal', 'Modi', 'Parekh', 'Sethia',
  'Venkatesh', 'Krishnan', 'Swamy', 'Shetty', 'Hegde', 'Kamath', 'Shenoy', 'Prabhu', 'Bhat', 'Acharya'
];

const BANKS = [
  { name: 'HDFC Bank',           ifsc: 'HDFC0000240' },
  { name: 'ICICI Bank',          ifsc: 'ICIC0000024' },
  { name: 'State Bank of India', ifsc: 'SBIN0001040' },
  { name: 'Axis Bank',           ifsc: 'UTIB0000128' },
  { name: 'Kotak Mahindra Bank', ifsc: 'KKBK0000958' },
];

function pickUniqueName(usedNames, counter) {
  let firstName, lastName, fullName, tries = 0;
  do {
    const fIdx = counter % FIRST_NAMES.length;
    const lIdx = (Math.floor(counter / FIRST_NAMES.length) + (counter % 11)) % LAST_NAMES.length;
    firstName = FIRST_NAMES[fIdx];
    lastName  = LAST_NAMES[lIdx];
    fullName  = `${firstName} ${lastName}`;
    counter++;
    if (++tries > 5000) throw new Error('Name pool exhausted — expand FIRST_NAMES or LAST_NAMES');
  } while (usedNames.has(fullName));
  usedNames.add(fullName);
  return { firstName, lastName, fullName, counter };
}

async function main() {
  console.log('\n┌' + '═'.repeat(66) + '┐');
  console.log('║  PeoplePay360 — Master Enterprise Seed (Strict 1 Admin, 400 Users) ║');
  console.log('└' + '═'.repeat(66) + '┘\n');

  // ── 1. Clean existing records in reverse-dependency order ─────────────────
  console.log('▶ Step 1/9  Cleaning existing database records...');
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
  console.log('  ✓ Database wiped cleanly');

  // ── 2. Precompute BCrypt Hashes once for instant execution ────────────────
  console.log('▶ Step 2/9  Generating password hashes...');
  const adminHash       = await bcrypt.hash('Admin@123', 10);
  const hrHash          = await bcrypt.hash('HR@123', 10);
  const payrollMgrHash  = await bcrypt.hash('PayrollMgr@123', 10);
  const payrollUserHash = await bcrypt.hash('Payroll@123', 10);
  const employeeHash    = await bcrypt.hash('Rahul@123', 10);
  console.log('  ✓ Hashes generated');

  // ── 3. Base Configuration ────────────────────────────────────────────────
  console.log('▶ Step 3/9  Setting up policy, departments, positions, schedule, salary rules...');

  await prisma.attendancePolicy.create({
    data: {
      name: 'Standard Enterprise Policy',
      fullDayHours: 8.0,
      halfDayHours: 4.5,
      gracePeriodMins: 15,
      overtimeThreshold: 9.0,
      breakDeductionHours: 1.0,
      maxShiftHoursCap: 14.0,
      isActive: true,
    },
  });

  const deptsData = [
    { name: 'Engineering',        code: 'ENG',   description: 'Product & Platform Engineering' },
    { name: 'Sales & Marketing',  code: 'SALES', description: 'Revenue, Growth & Client Success' },
    { name: 'Human Resources',    code: 'HR',    description: 'Talent Acquisition, People Operations & Culture' },
    { name: 'Finance & Accounts', code: 'FIN',   description: 'Financial Planning, Auditing & Payroll' },
    { name: 'Product Management', code: 'PROD',  description: 'Product Roadmap, UX and Strategy' },
    { name: 'Operations & IT',    code: 'OPS',   description: 'Cloud Infrastructure & Internal Support' },
  ];

  const depts = {};
  for (const d of deptsData) {
    depts[d.code] = await prisma.department.create({ data: d });
  }

  const positionsData = [
    { title: 'Lead Architect',             deptCode: 'ENG' },
    { title: 'Senior Software Engineer',    deptCode: 'ENG' },
    { title: 'Full Stack Engineer',         deptCode: 'ENG' },
    { title: 'QA Automation Lead',          deptCode: 'ENG' },
    { title: 'VP of Sales',                 deptCode: 'SALES' },
    { title: 'Senior Account Executive',    deptCode: 'SALES' },
    { title: 'Digital Marketing Specialist',deptCode: 'SALES' },
    { title: 'HR Director',                 deptCode: 'HR' },
    { title: 'HR Manager',                  deptCode: 'HR' },
    { title: 'Talent Acquisition Lead',     deptCode: 'HR' },
    { title: 'Payroll Manager',             deptCode: 'FIN' },
    { title: 'Financial Analyst',           deptCode: 'FIN' },
    { title: 'Director of Product',         deptCode: 'PROD' },
    { title: 'Technical Product Manager',   deptCode: 'PROD' },
    { title: 'DevOps & Cloud Engineer',     deptCode: 'OPS' },
  ];

  const positions = [];
  for (const p of positionsData) {
    const created = await prisma.jobPosition.create({
      data: { title: p.title, departmentId: depts[p.deptCode].id },
    });
    positions.push({ ...created, deptCode: p.deptCode });
  }
  const posBy = (title) => positions.find(p => p.title === title) || positions[0];

  const schedule = await prisma.workingSchedule.create({
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

  const salaryStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Enterprise Structure',
      description: 'BASIC 60% | HRA 20% of BASIC | ALLOWANCE 28% of WAGE | PF 12% of BASIC | Prof Tax 200',
      active: true,
      salaryRules: {
        create: [
          { name: 'Basic Salary',               code: 'BASIC',     category: 'BASIC',     sequence: 1, calculationType: 'PERCENTAGE', valueExpression: '0.60 * WAGE',  active: true },
          { name: 'House Rent Allowance',       code: 'HRA',       category: 'ALLOWANCE', sequence: 2, calculationType: 'PERCENTAGE', valueExpression: '0.20 * BASIC', active: true },
          { name: 'Standard Special Allowance', code: 'ALLOWANCE', category: 'ALLOWANCE', sequence: 3, calculationType: 'PERCENTAGE', valueExpression: '0.28 * WAGE',  active: true },
          { name: 'Gross Salary',               code: 'GROSS',     category: 'GROSS',     sequence: 4, calculationType: 'FORMULA',    valueExpression: 'BASIC + HRA + ALLOWANCE', active: true },
          { name: 'Provident Fund (Employee)',  code: 'PF',        category: 'DEDUCTION', sequence: 5, calculationType: 'PERCENTAGE', valueExpression: '0.12 * BASIC', active: true },
          { name: 'Professional Tax',           code: 'TAX',       category: 'DEDUCTION', sequence: 6, calculationType: 'FIXED',      valueExpression: '200',          active: true },
          { name: 'Net Salary',                 code: 'NET',       category: 'NET',       sequence: 7, calculationType: 'FORMULA',    valueExpression: 'GROSS - PF - TAX', active: true },
        ],
      },
    },
  });

  const typePaid = await prisma.timeOffType.create({ data: { name: 'Paid Time Off', unit: 'DAYS', allocationRequired: true,  approvalRequired: true,  isPaid: true  } });
  const typeSick = await prisma.timeOffType.create({ data: { name: 'Sick Leave',    unit: 'DAYS', allocationRequired: true,  approvalRequired: true,  isPaid: true  } });
  await prisma.timeOffType.create(                  { data: { name: 'Unpaid Leave',  unit: 'DAYS', allocationRequired: false, approvalRequired: true,  isPaid: false } });

  console.log('  ✓ Core configuration ready');

  // ── 4. Create Exactly 400 Users & 400 Employees (Strictly 1 Admin) ────────
  console.log('▶ Step 4/9  Generating 400 Users & Employees (Strictly 1 Admin)...');

  // Exact distribution summing to 400:
  // ADMIN: 1 (EMP000)
  // HR_MANAGER: 25 (EMP002 + 24 in bulk)
  // HR_PAYROLL_MANAGER: 20 (EMP003 + 19 in bulk)
  // HR_PAYROLL_USER: 34 (EMP004 + 33 in bulk)
  // EMPLOYEE: 320 (EMP001 + 319 in bulk)
  // Total: 1 + 25 + 20 + 34 + 320 = 400.

  const bulkRoles = [
    ...Array(24).fill('HR_MANAGER'),
    ...Array(19).fill('HR_PAYROLL_MANAGER'),
    ...Array(33).fill('HR_PAYROLL_USER'),
    ...Array(319).fill('EMPLOYEE'),
  ]; // Exactly 395 entries

  const usedFullNames = new Set([
    'System Administrator', 'Rahul Sharma', 'Priya Desai', 'Neha Patel', 'Amit Verma'
  ]);
  let nameCounter = 5;

  const createdUsers = [];
  const createdEmployees = [];
  const createdContracts = [];

  async function createAccount({ empCode, name, email, role, pwHash, wage, deptCode, posTitle, joining, bankIdx, accNum, panNum }) {
    const bank = BANKS[bankIdx % BANKS.length];
    const emp = await prisma.employee.create({
      data: {
        employeeId:        empCode,
        name,
        email,
        phone:             `+91 98${String(20000000 + parseInt(empCode.replace('EMP',''), 10)).slice(0, 8)}`,
        departmentId:      depts[deptCode].id,
        jobPositionId:     posBy(posTitle)?.id ?? positions[0].id,
        workingScheduleId: schedule.id,
        joiningDate:       new Date(`${joining}T00:00:00.000Z`),
        status:            'ACTIVE',
        bankName:          bank.name,
        bankAccountNumber: accNum,
        bankIfscCode:      bank.ifsc,
        panNumber:         panNum,
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
        notes:             `Enterprise contract for ${name} (${role})`,
      },
    });

    createdUsers.push(user);
    createdEmployees.push({ ...emp, wage, role });
    createdContracts.push(contract);
    return { emp, user, contract };
  }

  // 1) Super Admin (EMP000) - STRICTLY THE ONLY ADMIN
  await createAccount({
    empCode:  'EMP000',
    name:     'System Administrator',
    email:    'admin@peoplepay360.com',
    role:     'ADMIN',
    pwHash:   adminHash,
    wage:     120000,
    deptCode: 'OPS',
    posTitle: 'DevOps & Cloud Engineer',
    joining:  '2024-01-01',
    bankIdx:  0,
    accNum:   '999900001111',
    panNum:   'ADMPA0000Z',
  });

  // 2) Core Demo Accounts (EMP001–EMP004)
  const coreAccounts = [
    { empCode: 'EMP001', name: 'Rahul Sharma', email: 'rahul@peoplepay360.com',      role: 'EMPLOYEE',           pwHash: employeeHash,    wage: 85000, deptCode: 'ENG', posTitle: 'Lead Architect',    joining: '2025-01-15', accNum: '10000000001', panNum: 'DEMOQ0001Z' },
    { empCode: 'EMP002', name: 'Priya Desai',  email: 'hrmanager@peoplepay360.com',  role: 'HR_MANAGER',         pwHash: hrHash,          wage: 78000, deptCode: 'HR',  posTitle: 'HR Manager',        joining: '2025-01-15', accNum: '10000000002', panNum: 'DEMOQ0002Z' },
    { empCode: 'EMP003', name: 'Neha Patel',   email: 'payrollmgr@peoplepay360.com', role: 'HR_PAYROLL_MANAGER', pwHash: payrollMgrHash, wage: 92000, deptCode: 'FIN', posTitle: 'Payroll Manager',   joining: '2025-01-15', accNum: '10000000003', panNum: 'DEMOQ0003Z' },
    { empCode: 'EMP004', name: 'Amit Verma',   email: 'payrolluser@peoplepay360.com',role: 'HR_PAYROLL_USER',    pwHash: payrollUserHash, wage: 58000, deptCode: 'FIN', posTitle: 'Financial Analyst', joining: '2025-01-15', accNum: '10000000004', panNum: 'DEMOQ0004Z' },
  ];
  for (let i = 0; i < coreAccounts.length; i++) {
    await createAccount({ ...coreAccounts[i], bankIdx: i + 1 });
  }

  // 3) Bulk 395 Accounts (EMP005–EMP399)
  for (let i = 0; i < bulkRoles.length; i++) {
    const seqNum = i + 5;
    const role   = bulkRoles[i];
    const empCode = `EMP${String(seqNum).padStart(3, '0')}`;

    const result = pickUniqueName(usedFullNames, nameCounter);
    nameCounter  = result.counter;
    const { fullName, firstName, lastName } = result;

    const cleanSlug = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${seqNum > 180 ? seqNum : ''}`;
    const email = `${cleanSlug}@peoplepay360.com`;

    let pwHash, wage, deptCode, posTitle;
    if (role === 'HR_MANAGER') {
      pwHash = hrHash;
      deptCode = 'HR';
      posTitle = positions.find(p => p.deptCode === 'HR')?.title || 'HR Manager';
      wage = 68000 + ((seqNum * 850) % 24000);
    } else if (role === 'HR_PAYROLL_MANAGER') {
      pwHash = payrollMgrHash;
      deptCode = 'FIN';
      posTitle = 'Payroll Manager';
      wage = 85000 + ((seqNum * 900) % 25000);
    } else if (role === 'HR_PAYROLL_USER') {
      pwHash = payrollUserHash;
      deptCode = 'FIN';
      posTitle = 'Financial Analyst';
      wage = 52000 + ((seqNum * 650) % 22000);
    } else {
      pwHash = employeeHash;
      const posObj = positions[seqNum % positions.length];
      deptCode = posObj.deptCode;
      posTitle = posObj.title;
      wage = 42000 + ((seqNum * 750) % 65000);
    }

    const accNum = `${100000000000 + (seqNum * 382910)}`;
    const panNum = `ABC${String.fromCharCode(65 + (seqNum % 26))}P${1000 + seqNum}${String.fromCharCode(65 + ((seqNum + 3) % 26))}`;

    await createAccount({
      empCode,
      name: fullName,
      email,
      role,
      pwHash,
      wage,
      deptCode,
      posTitle,
      joining: '2025-01-15',
      bankIdx: seqNum,
      accNum,
      panNum
    });
  }

  console.log(`  ✓ Created ${createdUsers.length} Users & ${createdEmployees.length} Employees with 100% unique profiles`);

  // ── 5. Manager Hierarchy ──────────────────────────────────────────────────
  console.log('▶ Step 5/9  Setting manager reporting hierarchy...');
  const hrManager       = createdEmployees.find(e => e.email === 'hrmanager@peoplepay360.com');
  const payrollManager  = createdEmployees.find(e => e.email === 'payrollmgr@peoplepay360.com');
  const adminEmp        = createdEmployees.find(e => e.email === 'admin@peoplepay360.com');

  // Engineering lead
  const engLead = createdEmployees.find(e => e.email === 'rahul@peoplepay360.com');

  const updates = [];
  for (const emp of createdEmployees) {
    if (emp.id === adminEmp.id) continue; // Admin has no manager

    let targetManagerId = adminEmp.id;
    if (emp.role === 'HR_PAYROLL_USER') {
      targetManagerId = payrollManager.id;
    } else if (emp.role === 'HR_PAYROLL_MANAGER') {
      targetManagerId = adminEmp.id;
    } else if (emp.role === 'HR_MANAGER' && emp.id !== hrManager.id) {
      targetManagerId = hrManager.id;
    } else if (emp.role === 'EMPLOYEE') {
      if (emp.departmentId === depts['ENG'].id && emp.id !== engLead.id) {
        targetManagerId = engLead.id;
      } else if (emp.departmentId === depts['FIN'].id) {
        targetManagerId = payrollManager.id;
      } else {
        targetManagerId = hrManager.id;
      }
    }

    updates.push(prisma.employee.update({
      where: { id: emp.id },
      data: { managerId: targetManagerId }
    }));
  }

  // Execute hierarchy updates in batches
  for (let b = 0; b < updates.length; b += 50) {
    await Promise.all(updates.slice(b, b + 50));
  }
  console.log(`  ✓ Established reporting hierarchy across all departments`);

  // ── 6. Time Off Allocations & Requests (Strict Invariant Reconciled) ───────
  console.log('▶ Step 6/9  Allocating Leave Balances & Reconciling Requests...');
  const allocations = [];
  for (const emp of createdEmployees) {
    allocations.push(
      { employeeId: emp.id, timeOffTypeId: typePaid.id, allocatedDays: 20, takenDays: 0, remainingDays: 20, year: 2026 },
      { employeeId: emp.id, timeOffTypeId: typeSick.id, allocatedDays: 12, takenDays: 0, remainingDays: 12, year: 2026 },
    );
  }
  for (let b = 0; b < allocations.length; b += 500) {
    await prisma.timeOffAllocation.createMany({ data: allocations.slice(b, b + 500) });
  }

  const leaveReasons = [
    'Annual family vacation', 'Medical health checkup', 'Personal family function',
    'Dental surgery', 'Child school admission', 'Sister wedding celebration',
    'Attending tech conference', 'Home relocation', 'Fever & recovery', 'Personal emergency',
    'Parent medical appointment', 'Certification exam preparation', 'Home repair maintenance'
  ];

  const leaveRequests = [];
  // Spread requests across half of the employees
  for (let i = 0; i < createdEmployees.length; i += 2) {
    const emp = createdEmployees[i];
    const month = 4 + (i % 4); // May, June, July, August
    const day = 10 + (i % 15);
    const start = new Date(Date.UTC(2026, month, day));
    const end = new Date(Date.UTC(2026, month, day + 2));

    leaveRequests.push({
      employeeId:    emp.id,
      timeOffTypeId: (i % 3 === 0) ? typeSick.id : typePaid.id,
      startDate:     start,
      endDate:       end,
      durationDays:  2,
      reason:        leaveReasons[i % leaveReasons.length],
      status:        (i % 6 === 0) ? 'PENDING' : (i % 8 === 0) ? 'REJECTED' : 'APPROVED',
    });
  }

  for (let b = 0; b < leaveRequests.length; b += 500) {
    await prisma.timeOffRequest.createMany({ data: leaveRequests.slice(b, b + 500) });
  }

  // Strict invariant reconciliation: B4 / A4
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
      data: {
        takenDays: taken,
        remainingDays: Math.max(0, allocation.allocatedDays - taken),
      },
    });
  }
  console.log(`  ✓ ${allocations.length} Allocations & ${leaveRequests.length} Leave Requests perfectly balanced`);

  // ── 7. Attendance Records (August & September 2026) ────────────────────────
  console.log('▶ Step 7/9  Seeding Attendance Logs...');
  const augustDays = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 31];
  const septemberDays = [1, 2, 3, 4];
  const workDates = [
    ...augustDays.map(d => ({ y: 2026, m: 7, d })),
    ...septemberDays.map(d => ({ y: 2026, m: 8, d })),
  ];

  const attendanceRecords = [];
  for (const emp of createdEmployees) {
    // Generate 9 distinct work days for each employee
    for (let di = 0; di < 9; di++) {
      const dt = workDates[(emp.id + di) % workDates.length];
      const isHalfDay  = (emp.id + di) % 15 === 0;
      const isOvertime = !isHalfDay && (emp.id + di) % 12 === 0;
      const isLate     = !isHalfDay && !isOvertime && (emp.id + di) % 8 === 0;

      let ciH = 8, ciM = 55, coH = 18, coM = 15, bH = 1.0, wH = 8.3, status = 'PRESENT';
      if (isHalfDay)  { ciH = 9; ciM = 0;  coH = 13; coM = 30; bH = 0.0; wH = 4.5;  status = 'HALF_DAY'; }
      else if (isOvertime) { ciH = 8; ciM = 30; coH = 19; coM = 45; bH = 1.0; wH = 10.25; status = 'OVERTIME'; }
      else if (isLate)     { ciH = 9; ciM = 40; coH = 18; coM = 15; bH = 1.0; wH = 7.6;  status = 'LATE'; }

      attendanceRecords.push({
        employeeId:  emp.id,
        date:        new Date(Date.UTC(dt.y, dt.m, dt.d, 0, 0, 0)),
        checkIn:     new Date(Date.UTC(dt.y, dt.m, dt.d, ciH, ciM, 0)),
        checkOut:    new Date(Date.UTC(dt.y, dt.m, dt.d, coH, coM, 0)),
        breakHours:  bH,
        workedHours: wH,
        status,
      });
    }
  }

  for (let b = 0; b < attendanceRecords.length; b += 500) {
    await prisma.attendance.createMany({ data: attendanceRecords.slice(b, b + 500) });
  }
  console.log(`  ✓ ${attendanceRecords.length} Attendance records generated (valid check-ins, zero negative hours)`);

  // ── 8. Payruns, Payslips & Payslip Lines (All 5 Statuses) ───────────────────
  console.log('▶ Step 8/9  Generating Payruns & Itemized Payslips across all 5 statuses...');

  const payrunDefs = [
    {
      name: 'Payrun - September 2026 (General Operations)',
      start: '2026-09-01', end: '2026-09-30', code: '2026-09',
      status: 'COMPUTED', slipStatus: 'COMPUTED', mult: 1.02, wd: 22,
      emp: createdEmployees, // all 400
      paidAt: null,
    },
    {
      name: 'Payrun - September 2026 (Executive & Leadership)',
      start: '2026-09-01', end: '2026-09-30', code: '2026-09-EXEC',
      status: 'DRAFT', slipStatus: null, mult: 1.0, wd: 22,
      emp: [], // 0 slips (Draft batch)
      paidAt: null,
    },
    {
      name: 'Payrun - August 2026 (General Payroll)',
      start: '2026-08-01', end: '2026-08-31', code: '2026-08',
      status: 'PAID', slipStatus: 'PAID', mult: 1.0, wd: 22,
      emp: createdEmployees, // all 400
      paidAt: new Date('2026-08-31T17:00:00.000Z'),
    },
    {
      name: 'Payrun - August 2026 (Quarterly Performance Incentive)',
      start: '2026-08-01', end: '2026-08-31', code: '2026-08-BONUS',
      status: 'VALIDATED', slipStatus: 'VALIDATED', mult: 0.40, wd: 22,
      emp: createdEmployees.slice(0, 60), // 60 employees
      paidAt: null,
    },
    {
      name: 'Payrun - August 2026 (Contractor & External Advisory)',
      start: '2026-08-01', end: '2026-08-31', code: '2026-08-CONT',
      status: 'WARNING', slipStatus: 'COMPUTED', mult: 0.85, wd: 19,
      emp: createdEmployees.slice(60, 90), // 30 employees
      paidAt: null,
      warnings: [
        { type: 'TAX_DECLARATION_PENDING', severity: 'WARNING', message: 'TDS certificate pending verification for 3 consultant accounts.' },
        { type: 'CONTRACT_EXPIRY_WARNING', severity: 'CRITICAL', message: 'Advisory contract agreement expires at end of current period.' },
      ],
    },
    {
      name: 'Payrun - July 2026',
      start: '2026-07-01', end: '2026-07-31', code: '2026-07',
      status: 'PAID', slipStatus: 'PAID', mult: 1.06, wd: 23,
      emp: createdEmployees,
      paidAt: new Date('2026-07-31T17:00:00.000Z'),
    },
    {
      name: 'Payrun - June 2026',
      start: '2026-06-01', end: '2026-06-30', code: '2026-06',
      status: 'PAID', slipStatus: 'PAID', mult: 0.96, wd: 21,
      emp: createdEmployees,
      paidAt: new Date('2026-06-30T17:00:00.000Z'),
    },
    {
      name: 'Payrun - May 2026',
      start: '2026-05-01', end: '2026-05-31', code: '2026-05',
      status: 'PAID', slipStatus: 'PAID', mult: 0.93, wd: 21,
      emp: createdEmployees,
      paidAt: new Date('2026-05-31T17:00:00.000Z'),
    },
    {
      name: 'Payrun - April 2026',
      start: '2026-04-01', end: '2026-04-30', code: '2026-04',
      status: 'PAID', slipStatus: 'PAID', mult: 0.89, wd: 20,
      emp: createdEmployees,
      paidAt: new Date('2026-04-30T17:00:00.000Z'),
    },
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

    if (!def.emp?.length) continue; // DRAFT — 0 slips

    let grossSum = 0, dedSum = 0, netSum = 0;
    const linesData = [];

    for (let idx = 0; idx < def.emp.length; idx++) {
      const emp = def.emp[idx];
      const contract = createdContracts.find(c => c.employeeId === emp.id);
      if (!contract) continue;

      const effectiveWage = Math.round(emp.wage * def.mult);
      const basic         = Math.round(effectiveWage * 0.60);
      const hra           = Math.round(basic * 0.20);
      const allowance     = Math.round(effectiveWage * 0.28);
      const gross         = basic + hra + allowance;
      const pf            = Math.round(basic * 0.12);
      const tax           = 200;
      const deductions    = pf + tax;
      const net           = gross - deductions;

      grossSum += gross;
      dedSum   += deductions;
      netSum   += net;

      const slip = await prisma.payslip.create({
        data: {
          payslipNumber:   `PS-${def.code}-${String(idx + 1).padStart(4, '0')}`,
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
        { payslipId: slip.id, code: 'BASIC',     name: 'Basic Salary',               category: 'BASIC',     sequence: 1, amount: basic     },
        { payslipId: slip.id, code: 'HRA',       name: 'House Rent Allowance',       category: 'ALLOWANCE', sequence: 2, amount: hra       },
        { payslipId: slip.id, code: 'ALLOWANCE', name: 'Standard Special Allowance', category: 'ALLOWANCE', sequence: 3, amount: allowance },
        { payslipId: slip.id, code: 'GROSS',     name: 'Gross Salary',               category: 'GROSS',     sequence: 4, amount: gross     },
        { payslipId: slip.id, code: 'PF',        name: 'Provident Fund (Employee)',  category: 'DEDUCTION', sequence: 5, amount: pf        },
        { payslipId: slip.id, code: 'TAX',       name: 'Professional Tax',           category: 'DEDUCTION', sequence: 6, amount: tax       },
        { payslipId: slip.id, code: 'NET',       name: 'Net Salary',                 category: 'NET',       sequence: 7, amount: net       }
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

  console.log(`  ✓ ${payrunDefs.length} Payruns & ${totalPayslips} Payslips created with 100% itemized line items`);

  // ── 9. Audit Logs ─────────────────────────────────────────────────────────
  console.log('▶ Step 9/9  Seeding Compliance Audit Trail...');
  const adminUser      = createdUsers.find(u => u.email === 'admin@peoplepay360.com');
  const payrollMgrUser = createdUsers.find(u => u.email === 'payrollmgr@peoplepay360.com');
  const hrMgrUser      = createdUsers.find(u => u.email === 'hrmanager@peoplepay360.com');

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'ATTENDANCE_POLICY_UPDATED',
        entityName: 'AttendancePolicy',
        entityId: '1',
        previousValue: JSON.stringify({ fullDayHours: 8.0, halfDayHours: 4.5, gracePeriodMins: 10 }),
        newValue: JSON.stringify({ fullDayHours: 8.0, halfDayHours: 4.5, gracePeriodMins: 15, maxShiftHoursCap: 14.0 }),
        timestamp: new Date('2026-09-01T09:15:00.000Z'),
      },
      {
        userId: payrollMgrUser.id,
        action: 'PAYRUN_COMPUTED',
        entityName: 'Payrun',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'DRAFT', computedCount: 0 }),
        newValue: JSON.stringify({ status: 'COMPUTED', computedCount: 400 }),
        timestamp: new Date('2026-08-30T10:00:00.000Z'),
      },
      {
        userId: payrollMgrUser.id,
        action: 'PAYRUN_VALIDATED',
        entityName: 'Payrun',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'COMPUTED' }),
        newValue: JSON.stringify({ status: 'VALIDATED', approvedBy: 'Neha Patel' }),
        timestamp: new Date('2026-08-31T14:30:00.000Z'),
      },
      {
        userId: adminUser.id,
        action: 'PAYRUN_PAID',
        entityName: 'Payrun',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'VALIDATED' }),
        newValue: JSON.stringify({ status: 'PAID', paymentRef: 'NEFT-BATCH-20260831-01' }),
        timestamp: new Date('2026-08-31T17:00:00.000Z'),
      },
      {
        userId: hrMgrUser.id,
        action: 'TIME_OFF_APPROVED',
        entityName: 'TimeOffRequest',
        entityId: '1',
        previousValue: JSON.stringify({ status: 'PENDING' }),
        newValue: JSON.stringify({ status: 'APPROVED', employee: 'Rahul Sharma', leaveType: 'Sick Leave', durationDays: 2 }),
        timestamp: new Date('2026-08-28T11:20:00.000Z'),
      },
      {
        userId: hrMgrUser.id,
        action: 'TIME_OFF_REJECTED',
        entityName: 'TimeOffRequest',
        entityId: '2',
        previousValue: JSON.stringify({ status: 'PENDING' }),
        newValue: JSON.stringify({ status: 'REJECTED', reason: 'Overlapping department holiday request' }),
        timestamp: new Date('2026-08-27T16:45:00.000Z'),
      },
      {
        userId: adminUser.id,
        action: 'ATTENDANCE_CORRECTED',
        entityName: 'Attendance',
        entityId: '5',
        previousValue: JSON.stringify({ checkIn: '09:45:00', checkOut: null, status: 'INCOMPLETE' }),
        newValue: JSON.stringify({ checkIn: '09:00:00', checkOut: '18:15:00', workedHours: 8.3, status: 'PRESENT', reason: 'Biometric scanner glitch' }),
        timestamp: new Date('2026-08-25T19:10:00.000Z'),
      },
      {
        userId: hrMgrUser.id,
        action: 'EMPLOYEE_CREATED',
        entityName: 'Employee',
        entityId: '1',
        previousValue: null,
        newValue: JSON.stringify({ employeeId: 'EMP001', name: 'Rahul Sharma', position: 'Lead Architect', department: 'Engineering' }),
        timestamp: new Date('2026-01-15T09:00:00.000Z'),
      },
      {
        userId: hrMgrUser.id,
        action: 'CONTRACT_CREATED',
        entityName: 'Contract',
        entityId: '1',
        previousValue: null,
        newValue: JSON.stringify({ employeeId: 'EMP001', wage: 85000, structure: 'Regular Enterprise Structure', status: 'ACTIVE' }),
        timestamp: new Date('2026-01-15T09:30:00.000Z'),
      },
    ],
  });
  console.log('  ✓ 9 Audit log entries created');

  // ── Verification Summary ──────────────────────────────────────────────────
  const rc = (role) => createdUsers.filter(u => u.role === role).length;
  console.log('\n┌' + '═'.repeat(66) + '┐');
  console.log('║  🎉 Enterprise Seeding Complete!                                 ║');
  console.log('├' + '─'.repeat(66) + '┤');
  console.log(`║  Total Users:         ${String(createdUsers.length).padEnd(43)}║`);
  console.log(`║    - ADMIN:            ${String(rc('ADMIN')).padEnd(41)}║`);
  console.log(`║    - HR_MANAGER:       ${String(rc('HR_MANAGER')).padEnd(41)}║`);
  console.log(`║    - HR_PAYROLL_MGR:   ${String(rc('HR_PAYROLL_MANAGER')).padEnd(41)}║`);
  console.log(`║    - HR_PAYROLL_USER:  ${String(rc('HR_PAYROLL_USER')).padEnd(41)}║`);
  console.log(`║    - EMPLOYEE:         ${String(rc('EMPLOYEE')).padEnd(41)}║`);
  console.log(`║  Total Employees:     ${String(createdEmployees.length).padEnd(43)}║`);
  console.log(`║  Active Contracts:    ${String(createdContracts.length).padEnd(43)}║`);
  console.log(`║  Attendance Records:  ${String(attendanceRecords.length).padEnd(43)}║`);
  console.log(`║  Leave Requests:      ${String(leaveRequests.length).padEnd(43)}║`);
  console.log(`║  Payrun Batches:      ${String(payrunDefs.length).padEnd(43)}║`);
  console.log(`║  Generated Payslips:  ${String(totalPayslips).padEnd(43)}║`);
  console.log('├' + '─'.repeat(66) + '┤');
  console.log('║  LOGIN CREDENTIALS (All verified & functional):                  ║');
  console.log('║  Admin (ONLY ONE):    admin@peoplepay360.com      Admin@123      ║');
  console.log('║  HR Manager:          hrmanager@peoplepay360.com  HR@123         ║');
  console.log('║  Payroll Manager:     payrollmgr@peoplepay360.com PayrollMgr@123 ║');
  console.log('║  Payroll User:        payrolluser@peoplepay360.com Payroll@123  ║');
  console.log('║  Employee (Rahul):    rahul@peoplepay360.com      Rahul@123      ║');
  console.log('└' + '═'.repeat(66) + '┘\n');
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('\n❌ Seed failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main };

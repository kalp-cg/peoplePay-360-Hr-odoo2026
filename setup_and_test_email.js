const path = require('path');
require(path.join(__dirname, 'backend/node_modules/dotenv')).config({ path: path.join(__dirname, 'backend/.env') });

const bcrypt = require(path.join(__dirname, 'backend/node_modules/bcryptjs'));
const prisma = require('./backend/src/config/database');
const mailer = require('./backend/src/utils/mailer');
const payslipRepository = require('./backend/src/features/payslips/payslip.repository');
const payrollService = require('./backend/src/features/payroll/payroll.service');

async function main() {
  console.log('================================================================');
  console.log('  Setting Up User & Testing Direct Payslip Email to Kalp Patel  ');
  console.log('  Target Email: kalppatel1209@gmail.com                        ');
  console.log('================================================================\n');

  // 1. Get Reference Metadata
  const department = await prisma.department.findFirst({ where: { code: 'ENG' } }) || await prisma.department.findFirst();
  const jobPosition = await prisma.jobPosition.findFirst({ where: { departmentId: department?.id } }) || await prisma.jobPosition.findFirst();
  const schedule = await prisma.workingSchedule.findFirst() || { id: null };
  const structure = await prisma.salaryStructure.findFirst({
    where: { active: true },
    include: { salaryRules: { orderBy: { sequence: 'asc' } } }
  });

  if (!structure) {
    throw new Error('No active Salary Structure found!');
  }
  console.log(`Using Salary Structure: "${structure.name}" (ID: ${structure.id}) with ${structure.salaryRules.length} rules.`);

  // 2. Ensure Employee Record for Kalp Patel
  let emp = await prisma.employee.findUnique({
    where: { email: 'kalppatel1209@gmail.com' }
  });

  if (!emp) {
    emp = await prisma.employee.create({
      data: {
        employeeId: 'EMP1209',
        name: 'Kalp Patel',
        email: 'kalppatel1209@gmail.com',
        phone: '+91 9876543210',
        departmentId: department?.id,
        jobPositionId: jobPosition?.id,
        employeeType: 'FULL_TIME',
        status: 'ACTIVE',
        joiningDate: new Date('2024-01-01'),
        workingScheduleId: schedule?.id,
        bankAccountNumber: '50100998877665',
        bankName: 'HDFC Bank Ltd',
        bankIfscCode: 'HDFC0004321',
        panNumber: 'ABCDE1209K',
      }
    });
    console.log(`✓ Created new Employee record for Kalp Patel (ID: ${emp.id}, Code: ${emp.employeeId})`);
  } else {
    console.log(`✓ Found existing Employee record for Kalp Patel (ID: ${emp.id}, Code: ${emp.employeeId})`);
  }

  // 3. Ensure User Login for Kalp Patel
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Kalp@123', salt);

  let user = await prisma.user.findUnique({
    where: { email: 'kalppatel1209@gmail.com' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Kalp Patel',
        email: 'kalppatel1209@gmail.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        employeeId: emp.id,
      }
    });
    console.log(`✓ Created User account for Kalp Patel (User ID: ${user.id})`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { employeeId: emp.id }
    });
    console.log(`✓ Linked User account for Kalp Patel (User ID: ${user.id})`);
  }

  // 4. Ensure Active Employment Contract for September 2026
  let contract = await prisma.contract.findFirst({
    where: {
      employeeId: emp.id,
      status: 'ACTIVE',
      salaryStructureId: structure.id,
    }
  });

  if (!contract) {
    contract = await prisma.contract.create({
      data: {
        employeeId: emp.id,
        wage: 75000.00,
        salaryStructureId: structure.id,
        startDate: new Date('2026-01-01'),
        endDate: null,
        status: 'ACTIVE',
        notes: 'Lead Full Stack Engineer Standard Employment Contract',
      }
    });
    console.log(`✓ Created Active Contract (ID: ${contract.id}) for ₹75,000/month`);
  } else {
    console.log(`✓ Found Active Contract (ID: ${contract.id}) for ₹${contract.wage}/month`);
  }

  // 5. Ensure Leave Allocations for Kalp Patel
  const paidLeaveType = await prisma.timeOffType.findFirst({ where: { isPaid: true } });
  if (paidLeaveType) {
    const existingAlloc = await prisma.timeOffAllocation.findFirst({
      where: { employeeId: emp.id, timeOffTypeId: paidLeaveType.id }
    });
    if (!existingAlloc) {
      await prisma.timeOffAllocation.create({
        data: {
          employeeId: emp.id,
          timeOffTypeId: paidLeaveType.id,
          allocatedDays: 24,
          takenDays: 1,
          remainingDays: 23,
          year: 2026,
        }
      });
      console.log(`✓ Initialized 24 days leave allocation for 2026.`);
    }
  }

  // 6. Create or Find Payrun for September 2026
  const periodStart = new Date('2026-09-01T00:00:00.000Z');
  const periodEnd = new Date('2026-09-30T23:59:59.999Z');

  let payrun = await prisma.payrun.findFirst({
    where: {
      periodStart: { gte: new Date('2026-09-01T00:00:00.000Z'), lte: new Date('2026-09-02T00:00:00.000Z') },
      name: { contains: 'September' }
    },
    include: { payslips: true }
  });

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || { id: 1 };

  if (!payrun) {
    payrun = await prisma.payrun.create({
      data: {
        name: 'Payrun - September 2026',
        periodStart,
        periodEnd,
        salaryStructureId: structure.id,
        status: 'DRAFT',
        processedById: adminUser.id,
        payslips: {
          create: [{
            employeeId: emp.id,
            payslipNumber: 'PS-2026-09-1209',
            contractId: contract.id,
            workingDays: 22,
            presentDays: 22,
            leaveDays: 0,
            absentDays: 0,
            status: 'DRAFT',
          }]
        }
      },
      include: { payslips: true }
    });
    console.log(`✓ Created Payrun: "${payrun.name}" (ID: ${payrun.id}) with Kalp Patel`);
  } else {
    // Ensure Kalp Patel is in payslips
    const hasKalp = payrun.payslips.some(p => p.employeeId === emp.id);
    if (!hasKalp) {
      await prisma.payslip.create({
        data: {
          payrunId: payrun.id,
          employeeId: emp.id,
          payslipNumber: `PS-2026-09-1209`,
          contractId: contract.id,
          workingDays: 22,
          presentDays: 22,
          leaveDays: 0,
          absentDays: 0,
          status: 'DRAFT',
        }
      });
      console.log(`✓ Added Kalp Patel to existing September Payrun (ID: ${payrun.id})`);
    }
  }

  // 7. Compute the Payrun
  console.log(`\nComputing Payrun ID: ${payrun.id} using the Salary Rules Engine...`);
  const computedPayrun = await payrollService.computePayrun(payrun.id, adminUser);
  console.log(`✓ Payrun Computed! Status: ${computedPayrun.status}`);
  console.log(`  Total Gross: ₹${computedPayrun.totalGross.toLocaleString('en-IN')}`);
  console.log(`  Total Net:   ₹${computedPayrun.totalNet.toLocaleString('en-IN')}`);

  // 8. Retrieve Kalp Patel's specific computed payslip
  const kalpSlip = await prisma.payslip.findFirst({
    where: { payrunId: payrun.id, employeeId: emp.id }
  });

  if (!kalpSlip) {
    throw new Error('Could not find computed payslip for Kalp Patel!');
  }

  const fullPayslip = await payslipRepository.findById(kalpSlip.id);
  console.log('\n--- COMPUTED SALARY SLIP DETAILS FOR KALP PATEL ---');
  console.log(`Payslip Number:   ${fullPayslip.payslipNumber}`);
  console.log(`Gross Salary:     ₹${Number(fullPayslip.grossSalary).toLocaleString('en-IN')}`);
  console.log(`Total Deductions: ₹${Number(fullPayslip.totalDeductions).toLocaleString('en-IN')}`);
  console.log(`Net Salary:       ₹${Number(fullPayslip.netSalary).toLocaleString('en-IN')}`);
  console.log('Payslip Lines:');
  fullPayslip.payslipLines.forEach(l => {
    console.log(`  - [${l.category}] ${l.name} (${l.code}): ₹${Number(l.amount).toLocaleString('en-IN')}`);
  });

  // 9. Dispatch the Real Email with PDF to kalppatel1209@gmail.com
  console.log(`\n>>> Dispatching Live Email with Signed PDF Payslip Attachment to ${emp.email}...`);
  const emailInfo = await mailer.sendPayslipEmail(fullPayslip);

  console.log('\n================================================================');
  console.log('  EMAIL SUCCESSFULLY SENT VIA GMAIL SMTP!                      ');
  console.log('================================================================');
  console.log(`Recipient:       ${emp.email}`);
  console.log(`Subject:         Your Salary Slip for Sep 2026 [${fullPayslip.payslipNumber}]`);
  console.log(`Message ID:      ${emailInfo.messageId}`);
  console.log(`Server Response: ${emailInfo.response}`);
  console.log(`PDF Attachment:  Payslip_${fullPayslip.payslipNumber}.pdf`);
  console.log('================================================================\n');

  // Update sentAt in DB
  await payslipRepository.updateSentStatus(kalpSlip.id);

  console.log('All steps completed successfully with verified delivery!');
}

main()
  .catch((err) => {
    console.error('Execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

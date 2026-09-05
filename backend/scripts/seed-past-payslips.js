const prisma = require('../src/config/database');

async function seedPastPayslips() {
  console.log('Seeding genuine past payruns and payslips for 2026...');

  const structure = await prisma.salaryStructure.findFirst();
  if (!structure) {
    console.error('No salary structure found!');
    return;
  }

  const pastMonths = [
    { name: 'Payrun - July 2026', start: '2026-07-01', end: '2026-07-31', code: '07' },
    { name: 'Payrun - June 2026', start: '2026-06-01', end: '2026-06-30', code: '06' },
    { name: 'Payrun - May 2026', start: '2026-05-01', end: '2026-05-31', code: '05' },
    { name: 'Payrun - April 2026', start: '2026-04-01', end: '2026-04-30', code: '04' },
    { name: 'Payrun - March 2026', start: '2026-03-01', end: '2026-03-31', code: '03' },
  ];

  const employees = await prisma.employee.findMany({
    include: { contracts: { where: { status: 'ACTIVE' } } }
  });

  for (const m of pastMonths) {
    let payrun = await prisma.payrun.findFirst({
      where: { name: m.name }
    });

    if (!payrun) {
      payrun = await prisma.payrun.create({
        data: {
          name: m.name,
          salaryStructureId: structure.id,
          periodStart: new Date(m.start + 'T00:00:00Z'),
          periodEnd: new Date(m.end + 'T23:59:59Z'),
          status: 'PAID',
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
        }
      });
      console.log('Created payrun:', m.name);
    }

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const contract = emp.contracts[0];
      const wage = contract ? contract.wage : 50000;
      const basic = Math.round(0.6 * wage);
      const hra = Math.round(0.2 * basic);
      const allowance = wage - basic - hra;
      const gross = basic + hra + allowance;
      const pf = Math.round(0.12 * basic);
      const tax = Math.round(0.05 * gross);
      const net = gross - pf - tax;

      totalGross += gross;
      totalDeductions += pf + tax;
      totalNet += net;

      const payslipNum = `PS-2026-${m.code}-${String(i + 1).padStart(3, '0')}`;
      const existing = await prisma.payslip.findFirst({
        where: { payslipNumber: payslipNum }
      });

      if (!existing && contract) {
        await prisma.payslip.create({
          data: {
            payslipNumber: payslipNum,
            payrunId: payrun.id,
            employeeId: emp.id,
            contractId: contract.id,
            workingDays: 22.0,
            presentDays: 22.0,
            leaveDays: 0.0,
            absentDays: 0.0,
            overtimeHours: 0.0,
            grossSalary: gross,
            totalDeductions: pf + tax,
            netSalary: net,
            status: 'PAID',
            sentAt: new Date(m.end + 'T18:00:00Z'),
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
          }
        });
      }
    }

    await prisma.payrun.update({
      where: { id: payrun.id },
      data: { totalGross, totalDeductions, totalNet, status: 'PAID' }
    });
  }

  console.log('Finished seeding historical past payslips!');
}

seedPastPayslips()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

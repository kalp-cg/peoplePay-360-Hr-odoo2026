const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // 1. Check open attendance for Rahul Sharma (id: 1074)
  const openRahulAtt = await prisma.attendance.findFirst({
    where: { employeeId: 1074, checkOut: null },
  });
  console.log('Open Rahul Att to clean up:', openRahulAtt);
  if (openRahulAtt) {
    await prisma.attendance.delete({ where: { id: openRahulAtt.id } });
    console.log('Deleted open test attendance for Rahul Sharma.');
  }

  // 2. Check if EMP000 already exists
  let adminEmp = await prisma.employee.findUnique({
    where: { employeeId: 'EMP000' }
  });

  if (!adminEmp) {
    const defaultDept = await prisma.department.findFirst({ where: { code: 'OPS' } }) ||
                        await prisma.department.findFirst();
    const defaultJob = await prisma.jobPosition.findFirst({ where: { departmentId: defaultDept.id } }) ||
                       await prisma.jobPosition.findFirst();
    const defaultSched = await prisma.workingSchedule.findFirst();

    adminEmp = await prisma.employee.create({
      data: {
        employeeId: 'EMP000',
        name: 'System Administrator',
        email: 'admin@peoplepay360.com',
        phone: '+91 9800000000',
        departmentId: defaultDept.id,
        jobPositionId: defaultJob.id,
        employeeType: 'FULL_TIME',
        joiningDate: new Date('2024-01-01'),
        status: 'ACTIVE',
        workingScheduleId: defaultSched ? defaultSched.id : null,
        bankAccountNumber: '999900001111',
        bankName: 'HDFC Bank',
        bankIfscCode: 'HDFC0000123',
        panNumber: 'ADMPA0000Z',
      }
    });
    console.log('Created EMP000 employee profile:', adminEmp.id);
  } else {
    console.log('EMP000 already exists:', adminEmp.id);
  }

  // 3. Link admin user to adminEmp
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@peoplepay360.com' }
  });
  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { employeeId: adminEmp.id }
    });
    console.log(`Linked admin user (id: ${adminUser.id}) to employeeId ${adminEmp.id}`);
  }

  // 4. Create time off allocations for EMP000 if not existing
  const timeOffTypes = await prisma.timeOffType.findMany();
  for (const tot of timeOffTypes) {
    const existingAlloc = await prisma.timeOffAllocation.findFirst({
      where: { employeeId: adminEmp.id, timeOffTypeId: tot.id }
    });
    if (!existingAlloc) {
      await prisma.timeOffAllocation.create({
        data: {
          employeeId: adminEmp.id,
          timeOffTypeId: tot.id,
          allocatedDays: tot.name.toLowerCase().includes('sick') ? 12 : 24,
          takenDays: 0,
          remainingDays: tot.name.toLowerCase().includes('sick') ? 12 : 24,
          year: 2026,
        }
      });
    }
  }
  console.log('Allocations ensured for EMP000.');
}

fix()
  .then(() => console.log('Successfully completed.'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());

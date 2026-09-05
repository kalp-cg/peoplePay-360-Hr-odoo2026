const prisma = require('../src/config/database');

async function seedHierarchy() {
  console.log('Seeding organizational hierarchy & reporting managers...');

  // 1. Find Priya Desai (EMP002, primary HR Manager)
  const priya = await prisma.employee.findFirst({
    where: {
      OR: [
        { employeeId: 'EMP002' },
        { email: 'priya.desai@peoplepay360.com' },
        { email: 'hrmanager@peoplepay360.com' },
      ],
    },
  });

  if (!priya) {
    console.error('Priya Desai (EMP002) not found!');
    process.exit(1);
  }
  console.log(`Primary HR Manager: Priya Desai (ID: ${priya.id}, ${priya.employeeId})`);

  // 2. Assign Rahul Sharma (EMP001) to report directly to Priya Desai
  const rahul = await prisma.employee.findFirst({
    where: {
      OR: [
        { employeeId: 'EMP001' },
        { email: 'rahul@peoplepay360.com' },
      ],
    },
  });

  if (rahul) {
    await prisma.employee.update({
      where: { id: rahul.id },
      data: { managerId: priya.id },
    });
    console.log(`✓ Rahul Sharma (${rahul.employeeId}) now reports to Priya Desai (${priya.employeeId})`);
  }

  // 3. Assign Engineering and Operations employees (EMP003 - EMP015) to report to Priya Desai
  const engineeringStaff = await prisma.employee.findMany({
    where: {
      id: { not: priya.id },
      employeeId: { in: ['EMP003', 'EMP004', 'EMP005', 'EMP006', 'EMP007', 'EMP008', 'EMP009', 'EMP010', 'EMP011', 'EMP012', 'EMP013', 'EMP014', 'EMP015'] },
    },
  });

  for (const emp of engineeringStaff) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { managerId: priya.id },
    });
  }
  console.log(`✓ Assigned ${engineeringStaff.length} employees directly under Priya Desai`);

  // 4. Distribute other employees under departmental HR Managers
  const otherHRManagers = await prisma.employee.findMany({
    where: {
      id: { notIn: [priya.id, rahul?.id].filter(Boolean) },
      user: {
        role: 'HR_MANAGER',
      },
    },
    take: 5,
  });

  if (otherHRManagers.length > 0) {
    const unassigned = await prisma.employee.findMany({
      where: {
        managerId: null,
        id: { notIn: [priya.id, ...otherHRManagers.map(m => m.id)] },
      },
    });

    for (let i = 0; i < unassigned.length; i++) {
      const assignedManager = otherHRManagers[i % otherHRManagers.length];
      await prisma.employee.update({
        where: { id: unassigned[i].id },
        data: { managerId: assignedManager.id },
      });
    }
    console.log(`✓ Distributed ${unassigned.length} employees across other regional HR Managers`);
  }

  // 5. Create a clean PENDING leave request for Rahul Sharma so Priya Desai sees it in her queue!
  const paidType = await prisma.timeOffType.findFirst({
    where: { name: 'Paid Time Off' },
  });

  if (rahul && paidType) {
    // Check if Rahul already has a pending leave request
    const existingPending = await prisma.timeOffRequest.findFirst({
      where: {
        employeeId: rahul.id,
        status: 'PENDING',
      },
    });

    if (!existingPending) {
      await prisma.timeOffRequest.create({
        data: {
          employeeId: rahul.id,
          timeOffTypeId: paidType.id,
          startDate: new Date('2026-09-14T00:00:00.000Z'),
          endDate: new Date('2026-09-16T00:00:00.000Z'),
          durationDays: 3,
          reason: 'Technical conference and family visit to Pune',
          status: 'PENDING',
        },
      });
      console.log('✓ Created fresh PENDING leave request for Rahul Sharma for Priya Desai to review');
    }
  }

  // 6. Summary check of Priya's subordinates
  const priyaSubordinates = await prisma.employee.findMany({
    where: { managerId: priya.id },
    select: { id: true, employeeId: true, name: true, department: { select: { name: true } } },
  });

  console.log(`Priya Desai now has ${priyaSubordinates.length} direct subordinates:`, priyaSubordinates.map(s => `${s.name} (${s.employeeId})`));
  process.exit(0);
}

seedHierarchy().catch(err => {
  console.error('Error seeding hierarchy:', err);
  process.exit(1);
});

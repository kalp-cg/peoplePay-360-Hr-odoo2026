const prisma = require('../src/config/database');

async function seedRahulAttendance() {
  console.log('Seeding rich historical attendance records for Rahul Sharma (EMP001)...');

  const rahul = await prisma.employee.findFirst({
    where: {
      OR: [
        { employeeId: 'EMP001' },
        { email: 'rahul@peoplepay360.com' },
      ],
    },
  });

  if (!rahul) {
    console.error('Rahul Sharma not found in database!');
    process.exit(1);
  }

  console.log(`Found Rahul Sharma: ID ${rahul.id} (${rahul.employeeId})`);

  // Target historical dates (August & early September 2026)
  const historicalPunches = [
    // August 2026
    { y: 2026, m: 7, d: 10, inH: 8, inM: 55, outH: 18, outM: 15, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 11, inH: 8, inM: 50, outH: 18, outM: 10, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 12, inH: 9, inM: 42, outH: 18, outM: 20, breakH: 1.0, workedH: 7.6, status: 'LATE' },
    { y: 2026, m: 7, d: 13, inH: 8, inM: 52, outH: 18, outM: 15, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 14, inH: 8, inM: 30, outH: 19, outM: 45, breakH: 1.0, workedH: 10.25, status: 'OVERTIME' },
    { y: 2026, m: 7, d: 17, inH: 8, inM: 58, outH: 18, outM: 12, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 18, inH: 9, inM: 0, outH: 13, outM: 30, breakH: 0.0, workedH: 4.5, status: 'HALF_DAY' },
    { y: 2026, m: 7, d: 19, inH: 8, inM: 55, outH: 18, outM: 18, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 20, inH: 9, inM: 38, outH: 18, outM: 15, breakH: 1.0, workedH: 7.6, status: 'LATE' },
    { y: 2026, m: 7, d: 21, inH: 8, inM: 45, outH: 18, outM: 15, breakH: 1.0, workedH: 8.5, status: 'PRESENT' },
    { y: 2026, m: 7, d: 24, inH: 8, inM: 55, outH: 18, outM: 15, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 25, inH: 8, inM: 30, outH: 19, outM: 45, breakH: 1.0, workedH: 10.25, status: 'OVERTIME' },
    { y: 2026, m: 7, d: 26, inH: 8, inM: 50, outH: 18, outM: 15, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 27, inH: 8, inM: 55, outH: 18, outM: 10, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 7, d: 28, inH: 8, inM: 52, outH: 18, outM: 20, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    // September 2026
    { y: 2026, m: 8, d: 1, inH: 8, inM: 55, outH: 18, outM: 15, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
    { y: 2026, m: 8, d: 2, inH: 9, inM: 40, outH: 18, outM: 15, breakH: 1.0, workedH: 7.6, status: 'LATE' },
    { y: 2026, m: 8, d: 3, inH: 8, inM: 30, outH: 19, outM: 50, breakH: 1.0, workedH: 10.3, status: 'OVERTIME' },
    { y: 2026, m: 8, d: 4, inH: 8, inM: 50, outH: 18, outM: 15, breakH: 1.0, workedH: 8.3, status: 'PRESENT' },
  ];

  let insertedCount = 0;
  for (const p of historicalPunches) {
    const attDate = new Date(Date.UTC(p.y, p.m, p.d, 0, 0, 0));
    
    // Check if record already exists for this date
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: rahul.id,
        date: attDate,
      },
    });

    if (!existing) {
      await prisma.attendance.create({
        data: {
          employeeId: rahul.id,
          date: attDate,
          checkIn: new Date(Date.UTC(p.y, p.m, p.d, p.inH, p.inM, 0)),
          checkOut: new Date(Date.UTC(p.y, p.m, p.d, p.outH, p.outM, 0)),
          breakHours: p.breakH,
          workedHours: p.workedH,
          status: p.status,
        },
      });
      insertedCount++;
    }
  }

  const totalNow = await prisma.attendance.count({
    where: { employeeId: rahul.id },
  });

  console.log(`Successfully seeded ${insertedCount} historical records. Total attendance logs for Rahul Sharma now: ${totalNow}`);
  process.exit(0);
}

seedRahulAttendance().catch((err) => {
  console.error('Error seeding Rahul attendance:', err);
  process.exit(1);
});

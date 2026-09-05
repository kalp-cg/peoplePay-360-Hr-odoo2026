const prisma = require('../../config/database');

class DashboardService {
  /**
   * Get Live Aggregations from PostgreSQL database
   */
  async getDashboardData({ departmentId, employeeType, startDate, endDate }) {
    // 1. Build employee filter
    const empWhere = {};
    if (departmentId) empWhere.departmentId = parseInt(departmentId, 10);
    if (employeeType) empWhere.employeeType = employeeType;

    const filteredEmployees = await prisma.employee.findMany({
      where: empWhere,
      select: { id: true, departmentId: true },
    });
    const employeeIds = filteredEmployees.map((e) => e.id);

    // 2. Payslip & Payrun Aggregations
    const payslipWhere = {
      status: 'PAID',
    };
    if (employeeIds.length > 0) {
      payslipWhere.employeeId = { in: employeeIds };
    }
    if (startDate || endDate) {
      payslipWhere.payrun = {
        periodStart: {},
      };
      if (startDate) payslipWhere.payrun.periodStart.gte = new Date(startDate);
      if (endDate) payslipWhere.payrun.periodStart.lte = new Date(endDate);
    }

    const paidPayslips = await prisma.payslip.findMany({
      where: payslipWhere,
      include: {
        employee: { select: { departmentId: true, name: true } },
        payrun: { select: { periodStart: true, name: true } },
      },
    });

    const totalNetSalaryPaid = paidPayslips.reduce((sum, p) => sum + p.netSalary, 0);
    const totalGrossSalaryPaid = paidPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
    const payslipsCount = paidPayslips.length;
    const averageSalary = payslipsCount > 0 ? Math.round(totalNetSalaryPaid / payslipsCount) : 0;

    // 3. Time Off Summary
    const timeOffWhere = {};
    if (employeeIds.length > 0) timeOffWhere.employeeId = { in: employeeIds };

    const approvedLeaves = await prisma.timeOffRequest.findMany({
      where: { ...timeOffWhere, status: 'APPROVED' },
    });
    const totalApprovedLeaveDays = approvedLeaves.reduce((sum, r) => sum + r.durationDays, 0);

    const pendingLeaves = await prisma.timeOffRequest.findMany({
      where: { ...timeOffWhere, status: 'PENDING' },
    });

    const allocations = await prisma.timeOffAllocation.aggregate({
      where: employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {},
      _sum: { allocatedDays: true, takenDays: true, remainingDays: true },
    });

    // 4. Attendance Summary
    const attWhere = {};
    if (employeeIds.length > 0) attWhere.employeeId = { in: employeeIds };
    if (startDate || endDate) {
      attWhere.date = {};
      if (startDate) attWhere.date.gte = new Date(startDate);
      if (endDate) attWhere.date.lte = new Date(endDate);
    }

    const attendances = await prisma.attendance.findMany({
      where: attWhere,
    });

    const attCounts = {
      present: attendances.filter((a) => a.status === 'PRESENT').length,
      late: attendances.filter((a) => a.status === 'LATE').length,
      absent: attendances.filter((a) => a.status === 'ABSENT').length,
      overtime: attendances.filter((a) => a.status === 'OVERTIME').length,
      corrected: attendances.filter((a) => a.status === 'CORRECTED').length,
      incomplete: attendances.filter((a) => a.status === 'INCOMPLETE').length,
    };

    const totalAtt = attendances.length;
    const positiveAtt = attCounts.present + attCounts.overtime;
    const attendanceHealthPercent = totalAtt > 0 ? Math.round((positiveAtt / totalAtt) * 100) : 100;

    // 5. Chart 1: Salary Cost by Department
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          include: {
            payslips: {
              where: { status: 'PAID' },
            },
          },
        },
      },
    });

    const departmentSalaryCost = departments.map((dept) => {
      const deptPayslips = dept.employees.flatMap((e) => e.payslips);
      const grossCost = deptPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
      const netCost = deptPayslips.reduce((sum, p) => sum + p.netSalary, 0);

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        code: dept.code,
        employeeCount: dept.employees.length,
        grossCost: Math.round(grossCost),
        netCost: Math.round(netCost),
      };
    });

    // 6. Chart 2: Monthly Net Salary Trends
    const payruns = await prisma.payrun.findMany({
      where: { status: 'PAID' },
      orderBy: { periodStart: 'asc' },
      take: 6,
    });

    const monthlySalaryTrends = payruns.map((pr) => {
      const date = new Date(pr.periodStart);
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      return {
        period: monthName,
        netPayout: pr.totalNet,
        grossPayout: pr.totalGross,
      };
    });

    return {
      kpis: {
        totalNetSalaryPaid: Math.round(totalNetSalaryPaid),
        totalGrossSalaryPaid: Math.round(totalGrossSalaryPaid),
        payslipsGenerated: payslipsCount,
        averageSalary,
        approvedTimeOffDays: totalApprovedLeaveDays,
        pendingTimeOffRequests: pendingLeaves.length,
        attendanceHealthPercent,
      },
      charts: {
        departmentSalaryCost,
        monthlySalaryTrends,
        attendanceDistribution: [
          { name: 'Present', count: attCounts.present, fill: '#00A09D' },
          { name: 'Late', count: attCounts.late, fill: '#714B67' },
          { name: 'Overtime', count: attCounts.overtime, fill: '#2C3E50' },
          { name: 'Absent', count: attCounts.absent, fill: '#64748B' },
          { name: 'Corrected', count: attCounts.corrected, fill: '#8A637F' },
        ],
        leaveOverview: {
          allocated: allocations._sum.allocatedDays || 0,
          taken: allocations._sum.takenDays || 0,
          remaining: allocations._sum.remainingDays || 0,
          approvedRequests: approvedLeaves.length,
          pendingRequests: pendingLeaves.length,
        },
      },
    };
  }
}

module.exports = new DashboardService();

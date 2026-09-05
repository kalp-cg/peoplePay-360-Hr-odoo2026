const prisma = require('../../config/database');
const attendanceService = require('../attendance/attendance.service');
const profileRequestService = require('../employees/profile-request.service');

const cache = new Map();
const CACHE_TTL_MS = 8000; // 8 seconds cache for Neon PostgreSQL latency optimization

class DashboardService {
  /**
   * Get Live Aggregations from PostgreSQL database
   */
  async getDashboardData({ departmentId, employeeType, startDate, endDate, period }) {
    const cacheKey = `dash_${departmentId || ''}_${employeeType || ''}_${startDate || ''}_${endDate || ''}_${period || ''}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // 1. Resolve period into effective dates if period is provided
    let effStartDate = startDate ? new Date(startDate) : null;
    let effEndDate = endDate ? new Date(endDate) : null;
    if (period && !startDate && !endDate) {
      const [yearStr, monthStr] = period.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      if (!isNaN(y) && !isNaN(m)) {
        effStartDate = new Date(Date.UTC(y, m - 1, 1));
        effEndDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      }
    }

    // 2. Build employee filter
    const empWhere = {};
    if (departmentId) empWhere.departmentId = parseInt(departmentId, 10);
    if (employeeType && employeeType !== 'ALL') empWhere.employeeType = employeeType;

    const hasEmpFilter = Boolean(departmentId || (employeeType && employeeType !== 'ALL'));
    let employeeIds = [];
    if (hasEmpFilter) {
      const filteredEmployees = await prisma.employee.findMany({
        where: empWhere,
        select: { id: true, departmentId: true },
      });
      employeeIds = filteredEmployees.map((e) => e.id);
    }

    // 3. Build Query Where clauses
    const payslipWhere = { status: 'PAID' };
    if (hasEmpFilter) {
      payslipWhere.employeeId = { in: employeeIds.length > 0 ? employeeIds : [-1] };
    }
    if (effStartDate || effEndDate) {
      payslipWhere.payrun = { periodStart: {} };
      if (effStartDate) payslipWhere.payrun.periodStart.gte = effStartDate;
      if (effEndDate) payslipWhere.payrun.periodStart.lte = effEndDate;
    }

    const timeOffWhere = {};
    if (hasEmpFilter) {
      timeOffWhere.employeeId = { in: employeeIds.length > 0 ? employeeIds : [-1] };
    }

    const attWhere = {};
    if (hasEmpFilter) {
      attWhere.employeeId = { in: employeeIds.length > 0 ? employeeIds : [-1] };
    }
    if (effStartDate || effEndDate) {
      attWhere.date = {};
      if (effStartDate) attWhere.date.gte = effStartDate;
      if (effEndDate) attWhere.date.lte = effEndDate;
    }

    const allocWhere = {};
    if (hasEmpFilter) {
      allocWhere.employeeId = { in: employeeIds.length > 0 ? employeeIds : [-1] };
    }

    // 4. Parallel DB roundtrip execution via Promise.all
    const [
      paidPayslips,
      approvedLeaves,
      pendingLeaves,
      allocations,
      attendances,
      departments,
      payruns,
      payrollWarnings,
      missingBankEmps,
      expiringContractsList
    ] = await Promise.all([
      prisma.payslip.findMany({
        where: payslipWhere,
        include: {
          employee: { select: { departmentId: true, name: true } },
          payrun: { select: { periodStart: true, name: true } },
        },
      }),
      prisma.timeOffRequest.findMany({
        where: { ...timeOffWhere, status: 'APPROVED' },
      }),
      prisma.timeOffRequest.findMany({
        where: { ...timeOffWhere, status: 'PENDING' },
      }),
      prisma.timeOffAllocation.aggregate({
        where: allocWhere,
        _sum: { allocatedDays: true, takenDays: true, remainingDays: true },
      }),
      prisma.attendance.findMany({
        where: attWhere,
      }),
      prisma.department.findMany({
        include: {
          employees: {
            include: {
              payslips: {
                where: { status: 'PAID' },
              },
            },
          },
        },
      }),
      prisma.payrun.findMany({
        where: { status: 'PAID' },
        orderBy: { periodStart: 'asc' },
        take: 12,
      }),
      prisma.payrollWarning.findMany({
        where: { isResolved: false },
        include: { employee: true, payrun: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { bankAccountNumber: null },
            { bankAccountNumber: '' },
            { bankIfscCode: null },
            { bankIfscCode: '' },
          ],
        },
        select: { id: true, employeeId: true, name: true, department: { select: { name: true } } },
        take: 6,
      }),
      prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            not: null,
            lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Next 60 days
          },
        },
        include: { employee: { select: { id: true, employeeId: true, name: true, department: { select: { name: true } } } } },
        take: 6,
      }),
    ]);

    const totalNetSalaryPaid = paidPayslips.reduce((sum, p) => sum + p.netSalary, 0);
    const totalGrossSalaryPaid = paidPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
    const payslipsCount = paidPayslips.length;
    const averageSalary = payslipsCount > 0 ? Math.round(totalNetSalaryPaid / payslipsCount) : 0;

    const totalApprovedLeaveDays = approvedLeaves.reduce((sum, r) => sum + r.durationDays, 0);

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

    const departmentSalaryCost = departments.map((dept) => {
      const deptPayslips = dept.employees.flatMap((e) => e.payslips);
      const grossCost = deptPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
      const netCost = deptPayslips.reduce((sum, p) => sum + p.netSalary, 0);

      return {
        departmentId: dept.id,
        department: dept.name,
        departmentName: dept.name,
        code: dept.code,
        employeeCount: dept.employees.length,
        totalCost: Math.round(grossCost || netCost),
        grossCost: Math.round(grossCost),
        netCost: Math.round(netCost),
      };
    });

    const monthlySalaryTrends = payruns.map((pr) => {
      const date = new Date(pr.periodStart);
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      return {
        month: monthName,
        period: monthName,
        netPaid: Math.round(pr.totalNet),
        netPayout: Math.round(pr.totalNet),
        grossPayout: Math.round(pr.totalGross),
      };
    });

    const result = {
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
      attendanceOverview: {
        present: attCounts.present,
        late: attCounts.late,
        absent: attCounts.absent,
        overtime: attCounts.overtime,
        missingCheckOuts: attCounts.incomplete,
        manualEdits: attCounts.corrected,
        totalRecords: totalAtt,
        attendanceCoveragePercent: attendanceHealthPercent,
      },
      alerts: {
        activePayrollWarnings: payrollWarnings.map((w) => ({
          id: w.id,
          type: w.type,
          severity: w.severity,
          message: w.message,
          employeeName: w.employee?.name || null,
          payrunName: w.payrun?.name || null,
        })),
        missingBankDetails: missingBankEmps.map((e) => ({
          id: e.id,
          employeeId: e.employeeId,
          name: e.name,
          department: e.department?.name || 'General',
        })),
        expiringContracts: expiringContractsList.map((c) => ({
          id: c.id,
          employeeName: c.employee?.name,
          employeeId: c.employee?.employeeId,
          endDate: c.endDate,
        })),
      },
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  }

  /**
   * Fast aggregated endpoint for Employee Portal
   * Resolves employee record, attendance, allocations, and genuine past payslips in 1 round-trip
   */
  async getEmployeePortalData(user) {
    const empId = user.employeeId;
    if (!empId) {
      throw { statusCode: 400, message: 'User has no associated employee profile.', code: 'NO_EMPLOYEE_PROFILE' };
    }

    const now = new Date();
    // Strictly filter out current and future periods: only past completed months where periodEnd < current month start
    const todayCutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [employee, attendanceLogs, attStatus, allocations, leaveTypes, pastPayslips] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: empId },
        include: {
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
          manager: { select: { id: true, name: true } },
          contracts: {
            where: { status: 'ACTIVE' },
            include: { salaryStructure: true },
            take: 1,
          },
        },
      }),
      prisma.attendance.findMany({
        where: { employeeId: empId },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      attendanceService.getCurrentStatus(user),
      prisma.timeOffAllocation.findMany({
        where: { employeeId: empId },
        include: { timeOffType: true },
      }),
      prisma.timeOffType.findMany({
        orderBy: { id: 'asc' },
      }),
      prisma.payslip.findMany({
        where: {
          employeeId: empId,
          payrun: {
            periodEnd: { lt: todayCutoff },
          },
          status: 'PAID',
        },
        include: {
          payrun: true,
        },
        orderBy: {
          payrun: {
            periodStart: 'desc',
          },
        },
      }),
    ]);

    let pendingRequests = [];
    try {
      const allReqs = await profileRequestService.getAllRequests({ status: 'PENDING' }, user);
      pendingRequests = (allReqs || []).filter((r) => r.status === 'PENDING');
    } catch (err) {
      pendingRequests = [];
    }

    return {
      employee,
      attendanceLogs,
      attStatus,
      allocations,
      leaveTypes,
      pastPayslips,
      pendingRequests,
    };
  }
}

module.exports = new DashboardService();
